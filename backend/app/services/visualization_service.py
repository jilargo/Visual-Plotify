from __future__ import annotations

import pandas as pd

from app.models.visualization import ChartSpec
from app.services.visualization_engine import VisualizationEngine


class VisualizationService:
    _engine = VisualizationEngine()

    @classmethod
    def build_chart(cls, file_path: str, selected_columns: list[str]) -> ChartSpec:
        df = pd.read_excel(file_path)
        return cls._engine.build_chart(df, selected_columns)
