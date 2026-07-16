from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class ColumnStat(BaseModel):
    column: str
    type: str
    unique: int
    missing: int
    min: Optional[float] = None
    max: Optional[float] = None
    mean: Optional[float] = None
    median: Optional[float] = None
    std: Optional[float] = None
    top_values: Optional[Dict[str, int]] = None
    counts: Optional[Dict[str, int]] = None


class ExcelMetadataResponse(BaseModel):
    filename: Optional[str] = Field(None, description="Uploaded filename")
    file_path: Optional[str] = Field(None, description="Path to saved upload")
    sheet_names: List[str]
    columns: List[str]
    dtypes: Dict[str, str]
    rows: int
    column_stats: List[ColumnStat]
    preview: List[Dict[str, Any]]
