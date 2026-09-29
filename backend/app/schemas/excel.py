from __future__ import annotations

from typing import Any, Literal, Optional, Union

from pydantic import BaseModel, Field


class ColumnStat(BaseModel):
    column: str
    type: Literal["numeric", "text", "date", "boolean"]
    unique: int
    missing: int
    missing_pct: float = 0.0
    # Numeric columns return numbers; date columns return ISO-like date strings.
    min: Optional[Union[float, str]] = None
    max: Optional[Union[float, str]] = None
    mean: Optional[float] = None
    median: Optional[float] = None
    std: Optional[float] = None
    q1: Optional[float] = None
    q3: Optional[float] = None
    sum: Optional[float] = None
    top_values: Optional[dict[str, int]] = None
    sample_values: Optional[list[str]] = None
    counts: Optional[dict[str, int]] = None


class DataQuality(BaseModel):
    total_cells: int = 0
    missing_cells: int = 0
    missing_pct: float = 0.0
    duplicate_rows: int = 0
    empty_columns: list[str] = Field(default_factory=list)


class ExcelMetadataResponse(BaseModel):
    filename: Optional[str] = Field(None, description="Original filename of the upload")
    file_path: Optional[str] = Field(None, description="Path the file was stored at")
    sheet_names: list[str] = Field(default_factory=list)
    active_sheet: Optional[str] = Field(None, description="Worksheet these results describe")
    columns: list[str]
    dtypes: dict[str, str]
    rows: int
    column_stats: list[ColumnStat]
    quality: DataQuality = Field(default_factory=DataQuality)
    preview: list[dict[str, Any]]
    preview_offset: int = 0
    preview_limit: int = 25
    preview_total: int = 0
    has_more_rows: bool = False


class SampleInfo(BaseModel):
    id: str
    label: str
    description: str


class SampleCatalog(BaseModel):
    samples: list[SampleInfo]
