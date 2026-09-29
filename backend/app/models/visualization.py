"""Chart data contract shared between the API layer and the frontend."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class ChartSeries:
    name: str
    data: list[Any] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "data": self.data,
        }


@dataclass
class ChartMeta:
    """How the chart was produced, so the UI can explain itself."""

    strategy: str = "auto"
    source_rows: int = 0
    plotted_rows: int = 0
    filtered_out_rows: int = 0
    categories: int = 0
    aggregation: str = "auto"
    columns: list[str] = field(default_factory=list)
    time_granularity: str = "auto"
    top_n: Optional[int] = None
    truncated: bool = False
    notes: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "strategy": self.strategy,
            "source_rows": self.source_rows,
            "plotted_rows": self.plotted_rows,
            "filtered_out_rows": self.filtered_out_rows,
            "categories": self.categories,
            "aggregation": self.aggregation,
            "columns": list(self.columns),
            "time_granularity": self.time_granularity,
            "top_n": self.top_n,
            "truncated": self.truncated,
            "notes": list(self.notes),
        }


@dataclass
class ChartSpec:
    chart_type: str
    title: str
    xAxis: list[str] = field(default_factory=list)
    series: list[ChartSeries] = field(default_factory=list)
    xAxisLabel: str = ""
    yAxisLabel: str = ""
    meta: Optional[ChartMeta] = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "chart_type": self.chart_type,
            "title": self.title,
            "xAxis": self.xAxis,
            "series": [item.to_dict() for item in self.series],
            "xAxisLabel": self.xAxisLabel,
            "yAxisLabel": self.yAxisLabel,
            "meta": self.meta.to_dict() if self.meta else ChartMeta().to_dict(),
        }
