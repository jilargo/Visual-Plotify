from fastapi import APIRouter, UploadFile, File
from pathlib import Path
import shutil

from app.services.excel_service import ExcelService
from app.schemas.excel import ExcelMetadataResponse

router = APIRouter(prefix="/upload", tags=["Upload"])

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


@router.post("/", response_model=ExcelMetadataResponse)
async def upload_excel(file: UploadFile = File(...)):
    file_path = UPLOAD_DIR / file.filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    excel_data = ExcelService.read_excel(file_path)

    return {
        "filename": file.filename,
        "file_path": str(file_path),
        **excel_data
    }
