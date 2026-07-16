from dataclasses import dataclass, field
from typing import Any, List


@dataclass
class ChartSeries:
    name: str
    data: List[Any] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "data": self.data,
        }


@dataclass
class ChartSpec:
    chart_type: str
    title: str
    xAxis: List[str] = field(default_factory=list)
    series: List[ChartSeries] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "chart_type": self.chart_type,
            "title": self.title,
            "xAxis": self.xAxis,
            "series": [item.to_dict() for item in self.series],
        }
