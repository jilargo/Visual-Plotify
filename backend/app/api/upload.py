"""Upload, preview and sample-data endpoints."""

from __future__ import annotations

import re
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, Query, UploadFile
from fastapi import HTTPException

from app.config import (
    DEFAULT_PREVIEW_ROWS,
    MAX_PREVIEW_ROWS,
    MAX_UPLOAD_BYTES,
    SUPPORTED_EXTENSIONS,
    UPLOAD_CHUNK_BYTES,
)
from app.errors import FileTooLargeError, UnsupportedFileError
from app.schemas.excel import ExcelMetadataResponse, SampleCatalog, SampleInfo
from app.services import sample_service
from app.services.dataset_service import DatasetService

router = APIRouter(prefix="/upload", tags=["Upload"])

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

_UNSAFE_CHARACTERS = re.compile(r"[^A-Za-z0-9._-]+")


def _safe_filename(original_name: str) -> str:
    """Strip directories and unsafe characters, keeping a readable stem."""
    name = Path(original_name or "").name
    stem = _UNSAFE_CHARACTERS.sub("_", Path(name).stem).strip("._-") or "workbook"
    suffix = Path(name).suffix.lower()
    if suffix not in SUPPORTED_EXTENSIONS:
        raise UnsupportedFileError(
            f"'{suffix or 'unknown'}' files are not supported. "
            f"Upload one of: {', '.join(SUPPORTED_EXTENSIONS)}."
        )
    return f"{stem[:60]}_{uuid.uuid4().hex[:8]}{suffix}"


def resolve_stored_path(file_path: str) -> Path:
    """Resolve a client-supplied path and refuse anything outside the upload folder."""
    root = UPLOAD_DIR.resolve()
    candidate = Path(file_path).expanduser()

    if candidate.is_absolute():
        resolved = candidate.resolve()
    else:
        resolved = (root / candidate).resolve()
        # The upload response hands back "uploads/<file>"; accept that round trip too.
        if not resolved.is_file() and candidate.parts and candidate.parts[0].lower() == root.name.lower():
            resolved = (root / Path(*candidate.parts[1:])).resolve()

    try:
        resolved.relative_to(root)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="That file is outside the Visual Plotify uploads folder.",
        ) from None

    if not resolved.is_file():
        raise HTTPException(status_code=404, detail=f"Uploaded file not found: {resolved.name}")
    return resolved


def _metadata(
    original_name: str,
    stored_path: Path,
    sheet_name: Optional[str] = None,
    offset: int = 0,
    limit: int = DEFAULT_PREVIEW_ROWS,
) -> dict:
    return {
        "filename": original_name,
        "file_path": str(stored_path),
        **DatasetService.describe(stored_path, sheet_name=sheet_name, offset=offset, limit=limit),
    }


@router.post("/", response_model=ExcelMetadataResponse)
async def upload_excel(file: UploadFile = File(...)):
    original_name = file.filename or "workbook.xlsx"
    target = UPLOAD_DIR / _safe_filename(original_name)
    total = 0

    try:
        with open(target, "wb") as buffer:
            while chunk := await file.read(UPLOAD_CHUNK_BYTES):
                total += len(chunk)
                if total > MAX_UPLOAD_BYTES:
                    raise FileTooLargeError(
                        "That file is larger than the "
                        f"{MAX_UPLOAD_BYTES // (1024 * 1024)} MB upload limit."
                    )
                buffer.write(chunk)
    except Exception:
        target.unlink(missing_ok=True)
        raise
    finally:
        await file.close()

    if total == 0:
        target.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="The uploaded file was empty.")

    return _metadata(original_name, target)


@router.get("/preview", response_model=ExcelMetadataResponse)
def preview_excel(
    file_path: str = Query(..., description="Path returned by the upload endpoint"),
    sheet_name: Optional[str] = Query(None, description="Worksheet to inspect"),
    offset: int = Query(0, ge=0, description="Row to start the preview at"),
    limit: int = Query(DEFAULT_PREVIEW_ROWS, ge=1, le=MAX_PREVIEW_ROWS, description="Preview page size"),
):
    stored_path = resolve_stored_path(file_path)
    return _metadata(stored_path.name, stored_path, sheet_name=sheet_name, offset=offset, limit=limit)


@router.get("/samples", response_model=SampleCatalog)
def list_samples():
    return {"samples": [SampleInfo(**sample) for sample in sample_service.catalog()]}


@router.post("/samples/{sample_id}", response_model=ExcelMetadataResponse)
def load_sample(sample_id: str):
    try:
        stored_path = sample_service.build(sample_id, UPLOAD_DIR)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc.args[0])) from exc

    label = dict((item["id"], item["label"]) for item in sample_service.catalog()).get(
        sample_id, sample_id
    )
    return _metadata(f"Sample — {label}.csv", stored_path)
