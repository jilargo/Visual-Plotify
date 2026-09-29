from __future__ import annotations

from typing import Any, Literal, Optional, Union

from pydantic import BaseModel, Field, field_validator

ChartType = Literal["auto", "bar", "hbar", "line", "area", "scatter", "pie", "donut"]
Aggregation = Literal["auto", "sum", "mean", "median", "min", "max", "count"]
SortOrder = Literal["none", "asc", "desc", "label"]
Granularity = Literal["auto", "year", "quarter", "month", "week", "day"]
FilterOperator = Literal[
    "eq",
    "neq",
    "contains",
    "not_contains",
    "gt",
    "gte",
    "lt",
    "lte",
    "between",
    "in",
    "is_null",
    "not_null",
]

MAX_FILTER_RULES = 20


class FilterRule(BaseModel):
    column: str = Field(..., min_length=1, description="Column the rule applies to")
    operator: FilterOperator = "contains"
    value: Optional[Union[str, float, int, bool, list[str]]] = None
    value_to: Optional[Union[str, float, int, bool]] = Field(
        None, description="Upper bound used by the 'between' operator"
    )


class VisualizationRequest(BaseModel):
    file_path: str = Field(..., min_length=1, description="Path returned by the upload endpoint")
    selected_columns: list[str] = Field(default_factory=list, description="Columns chosen by the user")
    sheet_name: Optional[str] = Field(default=None, description="Worksheet to read, defaults to the first")
    chart_type: ChartType = "auto"
    aggregation: Aggregation = "auto"
    sort: SortOrder = "none"
    top_n: Optional[int] = Field(default=None, ge=1, le=200, description="Limit the number of categories")
    time_granularity: Granularity = "auto"
    filters: list[FilterRule] = Field(default_factory=list, max_length=MAX_FILTER_RULES)

    @field_validator("selected_columns")
    @classmethod
    def _require_columns(cls, value: list[str]) -> list[str]:
        if not value:
            raise ValueError("Select at least one column to visualize.")
        if len(set(value)) != len(value):
            raise ValueError("The same column was selected more than once.")
        return value


class ChartSeriesOut(BaseModel):
    name: str
    data: list[Any]


class ChartMetaOut(BaseModel):
    strategy: str = "auto"
    source_rows: int = 0
    plotted_rows: int = 0
    filtered_out_rows: int = 0
    categories: int = 0
    aggregation: str = "auto"
    columns: list[str] = Field(default_factory=list)
    time_granularity: str = "auto"
    top_n: Optional[int] = None
    truncated: bool = False
    notes: list[str] = Field(default_factory=list)


class VisualizationResponse(BaseModel):
    chart_type: str
    title: str
    xAxis: list[str]
    series: list[ChartSeriesOut]
    xAxisLabel: str = ""
    yAxisLabel: str = ""
    meta: ChartMetaOut = Field(default_factory=ChartMetaOut)


class HealthResponse(BaseModel):
    status: str
    version: str
    app: str
