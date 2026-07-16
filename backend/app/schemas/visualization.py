from typing import List, Optional
from pydantic import BaseModel, Field


class VisualizationRequest(BaseModel):
    file_path: str = Field(..., description="Absolute path to the uploaded Excel file")
    selected_columns: List[str] = Field(default_factory=list, description="Columns chosen by the user")
    group_by: Optional[str] = Field(default=None, description="Optional grouping column")
    aggregation: Optional[str] = Field(default=None, description="Optional aggregation override")


class VisualizationResponse(BaseModel):
    chart_type: str
    title: str
    xAxis: List[str]
    series: List[dict]
