"""Reads tabular files (``.xlsx`` and ``.csv``) and describes them for the UI.

Everything in this module is deliberately JSON-safe: pandas happily produces
``NaN``/``NaT``/``numpy`` scalars, and a single one of those leaking into a
response body produces a payload that ``JSON.parse`` refuses. Every value that
leaves this module has been normalised.
"""

from __future__ import annotations

import math
import re
from datetime import date, datetime
from pathlib import Path
from typing import Any, Optional

import numpy as np
import pandas as pd
from pandas.api.types import (
    is_bool_dtype,
    is_datetime64_any_dtype,
    is_numeric_dtype,
)

from app.config import MAX_PREVIEW_ROWS, MISSING_LABEL
from app.errors import (
    DatasetNotFoundError,
    ParseError,
    UnsupportedFileError,
)

NUMERIC = "numeric"
TEXT = "text"
DATE = "date"
BOOLEAN = "boolean"

_DATE_COLUMN_HINT = re.compile(r"(date|day|month|year|time|period|quarter)", re.IGNORECASE)


def to_json_value(value: Any) -> Any:
    """Convert a pandas/numpy scalar into something ``json.dumps`` accepts."""
    if value is None or value is pd.NaT:
        return None

    if isinstance(value, bool | np.bool_):
        return bool(value)

    if isinstance(value, (int, np.integer)):
        return int(value)

    if isinstance(value, (float, np.floating)):
        number = float(value)
        return None if not math.isfinite(number) else number

    if isinstance(value, pd.Timestamp):
        if pd.isna(value):
            return None
        return value.strftime("%Y-%m-%d %H:%M:%S")

    if isinstance(value, (datetime, date)):
        return value.isoformat()

    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")

    if isinstance(value, str | np.str_):
        return str(value)

    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass

    return str(value)


def to_json_number(value: Any) -> Optional[float]:
    """Return a finite float, or ``None`` when the value is not usable."""
    number = to_json_value(value)
    if isinstance(number, bool) or not isinstance(number, (int, float)):
        return None
    return float(number)


def normalise_keys(series: pd.Series) -> pd.Series:
    """Category keys as clean strings, with blanks folded into ``Missing``."""
    keys = series.where(series.notna(), MISSING_LABEL).astype(str).str.strip()
    return keys.replace("", MISSING_LABEL)


class DatasetService:
    """Turns a spreadsheet on disk into metadata the frontend can render."""

    @staticmethod
    def is_supported(file_path: Path) -> bool:
        from app.config import SUPPORTED_EXTENSIONS

        return file_path.suffix.lower() in SUPPORTED_EXTENSIONS

    @staticmethod
    def ensure_supported(file_path: Path) -> None:
        if not DatasetService.is_supported(file_path):
            from app.config import SUPPORTED_EXTENSIONS

            raise UnsupportedFileError(
                f"'{file_path.suffix or 'unknown'}' files are not supported. "
                f"Upload one of: {', '.join(SUPPORTED_EXTENSIONS)}."
            )

    @staticmethod
    def require_exists(file_path: Path) -> Path:
        resolved = file_path.expanduser()
        if not resolved.is_file():
            raise DatasetNotFoundError(f"No uploaded file found at '{file_path}'.")
        return resolved

    @staticmethod
    def is_csv(file_path: Path) -> bool:
        return file_path.suffix.lower() == ".csv"

    @staticmethod
    def sheet_names(file_path: Path) -> list[str]:
        """Worksheet names, or an empty list for single-table files such as CSV."""
        path = DatasetService.require_exists(file_path)
        DatasetService.ensure_supported(path)

        if DatasetService.is_csv(path):
            return []

        try:
            return list(pd.ExcelFile(path).sheet_names)
        except Exception as exc:  # pragma: no cover - depends on corrupt files
            raise ParseError(f"Could not open the workbook '{path.name}': {exc}") from exc

    @staticmethod
    def load_frame(file_path: Path, sheet_name: Optional[str] = None) -> pd.DataFrame:
        """Load one worksheet (or the CSV table) as a dataframe."""
        path = DatasetService.require_exists(file_path)
        DatasetService.ensure_supported(path)

        if DatasetService.is_csv(path):
            frame = DatasetService._read_csv(path)
        else:
            available = DatasetService.sheet_names(path)
            if sheet_name is None:
                sheet_name = available[0] if available else None
            elif sheet_name not in available:
                raise DatasetNotFoundError(
                    f"Worksheet '{sheet_name}' was not found. Available worksheets: "
                    f"{', '.join(available) or 'none'}."
                )
            try:
                frame = pd.read_excel(path, sheet_name=sheet_name)
            except Exception as exc:
                raise ParseError(f"Could not read worksheet '{sheet_name}': {exc}") from exc

        # Spreadsheets frequently store dates as text; promote them so the chart
        # engine can recognise trends instead of treating them as categories.
        frame = DatasetService._infer_dates(frame)

        if frame.empty and len(frame.columns) == 0:
            raise ParseError("The selected worksheet has no header row to read.")

        return frame

    @staticmethod
    def _read_csv(path: Path) -> pd.DataFrame:
        decode_error: Optional[Exception] = None
        for encoding in ("utf-8-sig", "utf-8", "latin-1"):
            try:
                return DatasetService._infer_dates(pd.read_csv(path, encoding=encoding))
            except UnicodeDecodeError as exc:
                decode_error = exc
            except ValueError as exc:  # EmptyDataError, ParserError, bad dtype inference
                raise ParseError(f"Could not read '{path.name}' as a CSV table: {exc}") from exc
        raise ParseError(f"Could not decode '{path.name}' as text: {decode_error}")

    @staticmethod
    def _infer_dates(frame: pd.DataFrame) -> pd.DataFrame:
        """CSV has no type information, so promote obvious date columns to datetimes."""
        for column in frame.columns:
            series = frame[column]
            if not pd.api.types.is_object_dtype(series):
                continue

            non_null = series.dropna()
            if non_null.empty or not non_null.map(lambda value: isinstance(value, str)).all():
                continue

            hinted = _DATE_COLUMN_HINT.search(str(column)) is not None
            looks_numeric = non_null.head(50).str.match(r"^\s*\d{4}[-/]\d{1,2}([-/]\d{1,2})?").all()
            if not hinted and not looks_numeric:
                continue

            try:
                frame[column] = pd.to_datetime(series, errors="raise", format="mixed")
            except (ValueError, TypeError, OverflowError):
                continue

        return frame

    @staticmethod
    def detect_column_type(series: pd.Series) -> str:
        if is_bool_dtype(series):
            return BOOLEAN
        if is_datetime64_any_dtype(series):
            return DATE
        if is_numeric_dtype(series):
            return NUMERIC
        return TEXT

    @staticmethod
    def _column_stats(series: pd.Series, detected_type: str, total_rows: int) -> dict:
        missing = int(series.isna().sum())
        stats: dict[str, Any] = {
            "unique": int(series.nunique(dropna=True)),
            "missing": missing,
            "missing_pct": round(missing / total_rows * 100, 2) if total_rows else 0.0,
        }

        if detected_type == NUMERIC:
            values = pd.to_numeric(series, errors="coerce").dropna()
            stats.update({
                "min": to_json_number(values.min()) if not values.empty else None,
                "max": to_json_number(values.max()) if not values.empty else None,
                "mean": to_json_number(values.mean()) if not values.empty else None,
                "median": to_json_number(values.median()) if not values.empty else None,
                "std": to_json_number(values.std()) if len(values) > 1 else None,
                "q1": to_json_number(values.quantile(0.25)) if not values.empty else None,
                "q3": to_json_number(values.quantile(0.75)) if not values.empty else None,
                "sum": to_json_number(values.sum()) if not values.empty else None,
                "top_values": None,
                "counts": None,
            })
        elif detected_type == DATE:
            dates = pd.to_datetime(series, errors="coerce").dropna()
            stats.update({
                "min": None if dates.empty else str(dates.min()),
                "max": None if dates.empty else str(dates.max()),
                "mean": None,
                "median": None,
                "std": None,
                "q1": None,
                "q3": None,
                "sum": None,
                "top_values": None,
                "counts": None,
            })
        elif detected_type == BOOLEAN:
            counts = series.value_counts(dropna=False).dropna()
            stats.update({
                "counts": {str(key): int(value) for key, value in counts.items()},
                "top_values": None,
                "min": None,
                "max": None,
                "mean": None,
                "median": None,
                "std": None,
                "q1": None,
                "q3": None,
                "sum": None,
            })
        else:
            text = normalise_keys(series)
            stats.update({
                "top_values": {
                    str(key): int(value)
                    for key, value in text.value_counts().head(5).items()
                },
                "sample_values": [str(value) for value in text[text != MISSING_LABEL].unique()[:5]],
                "counts": None,
                "min": None,
                "max": None,
                "mean": None,
                "median": None,
                "std": None,
                "q1": None,
                "q3": None,
                "sum": None,
            })

        return stats

    @staticmethod
    def _data_quality(frame: pd.DataFrame) -> dict:
        total_cells = int(frame.shape[0] * frame.shape[1])
        missing_cells = int(frame.isna().sum().sum())
        empty_columns = [
            str(column)
            for column in frame.columns
            if frame[column].isna().all()
        ]
        return {
            "total_cells": total_cells,
            "missing_cells": missing_cells,
            "missing_pct": round(missing_cells / total_cells * 100, 2) if total_cells else 0.0,
            "duplicate_rows": int(frame.duplicated().sum()),
            "empty_columns": empty_columns,
        }

    @staticmethod
    def _preview(frame: pd.DataFrame, offset: int, limit: int) -> list[dict[str, Any]]:
        window = frame.iloc[offset : offset + limit]
        records: list[dict[str, Any]] = []
        for row in window.to_dict(orient="records"):
            records.append({str(key): to_json_value(value) for key, value in row.items()})
        return records

    @staticmethod
    def describe(
        file_path: Path,
        sheet_name: Optional[str] = None,
        offset: int = 0,
        limit: int = 25,
    ) -> dict:
        """Full metadata payload for one worksheet."""
        path = DatasetService.require_exists(file_path)
        DatasetService.ensure_supported(path)
        frame = DatasetService.load_frame(path, sheet_name=sheet_name)
        active_sheet = None if DatasetService.is_csv(path) else (sheet_name or DatasetService.sheet_names(path)[0])

        offset = max(offset, 0)
        limit = min(max(limit, 1), MAX_PREVIEW_ROWS)
        total_rows = int(len(frame))

        column_stats = [
            {
                "column": str(column),
                "type": DatasetService.detect_column_type(frame[column]),
                **DatasetService._column_stats(frame[column], DatasetService.detect_column_type(frame[column]), total_rows),
            }
            for column in frame.columns
        ]

        return {
            "sheet_names": DatasetService.sheet_names(path),
            "active_sheet": active_sheet,
            "columns": [str(column) for column in frame.columns],
            "dtypes": {str(column): str(frame[column].dtype) for column in frame.columns},
            "rows": total_rows,
            "column_stats": column_stats,
            "quality": DatasetService._data_quality(frame),
            "preview_offset": offset,
            "preview_limit": limit,
            "preview_total": total_rows,
            "has_more_rows": offset + limit < total_rows,
            "preview": DatasetService._preview(frame, offset, limit),
        }

    @staticmethod
    def read_frame_payload(file_path: Path, sheet_name: Optional[str] = None) -> dict:
        """Backwards-compatible helper used by the upload/preview endpoints."""
        return DatasetService.describe(file_path, sheet_name=sheet_name, limit=MAX_PREVIEW_ROWS)
