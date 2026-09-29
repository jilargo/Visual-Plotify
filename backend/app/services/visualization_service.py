"""Chart construction on top of a loaded dataframe."""

from __future__ import annotations

from typing import Optional, Sequence

import pandas as pd

from app.models.visualization import ChartSpec
from app.services.visualization_engine import ChartOptions, VisualizationEngine


class VisualizationService:
    _engine = VisualizationEngine()

    @classmethod
    def build_chart(
        cls,
        frame: pd.DataFrame,
        selected_columns: list[str],
        options: Optional[ChartOptions] = None,
        filters: Sequence[object] = (),
    ) -> ChartSpec:
        return cls._engine.build_chart(frame, selected_columns, options, filters)
