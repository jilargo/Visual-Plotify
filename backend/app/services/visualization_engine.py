from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, List

import pandas as pd
import numpy as np

from app.models.visualization import ChartSeries, ChartSpec


class VisualizationStrategy(ABC):
    @abstractmethod
    def can_handle(self, df: pd.DataFrame, selected_columns: list[str]) -> bool:
        raise NotImplementedError

    @abstractmethod
    def build(self, df: pd.DataFrame, selected_columns: list[str]) -> ChartSpec:
        raise NotImplementedError


class SingleCategoryStrategy(VisualizationStrategy):
    def can_handle(self, df: pd.DataFrame, selected_columns: list[str]) -> bool:
        return len(selected_columns) == 1 and df[selected_columns[0]].dtype == object

    def build(self, df: pd.DataFrame, selected_columns: list[str]) -> ChartSpec:
        column = selected_columns[0]
        counts = df[column].fillna("Missing").value_counts().sort_index()
        return ChartSpec(
            chart_type="pie",
            title=f"{column} distribution",
            xAxis=counts.index.astype(str).tolist(),
            series=[ChartSeries(name="Count", data=counts.values.tolist())],
        )


class TextNumericStrategy(VisualizationStrategy):
    def can_handle(self, df: pd.DataFrame, selected_columns: list[str]) -> bool:
        if len(selected_columns) != 2:
            return False
        return any(self._is_text_like(df[col]) for col in selected_columns) and any(pd.api.types.is_numeric_dtype(df[col]) for col in selected_columns)

    def _is_text_like(self, series: pd.Series) -> bool:
        return pd.api.types.is_object_dtype(series) or pd.api.types.is_string_dtype(series) or pd.api.types.is_categorical_dtype(series)

    def build(self, df: pd.DataFrame, selected_columns: list[str]) -> ChartSpec:
        text_col = next(col for col in selected_columns if self._is_text_like(df[col]))
        numeric_col = next(col for col in selected_columns if pd.api.types.is_numeric_dtype(df[col]))

        grouped = df.groupby(text_col, dropna=False)[numeric_col].sum()
        grouped = grouped.sort_values(ascending=False)
        return ChartSpec(
            chart_type="bar",
            title=f"{numeric_col} by {text_col}",
            xAxis=grouped.index.astype(str).tolist(),
            series=[ChartSeries(name=numeric_col, data=grouped.values.tolist())],
        )


class DateNumericStrategy(VisualizationStrategy):
    def can_handle(self, df: pd.DataFrame, selected_columns: list[str]) -> bool:
        if len(selected_columns) != 2:
            return False
        return any(pd.api.types.is_datetime64_any_dtype(df[col]) for col in selected_columns) and any(pd.api.types.is_numeric_dtype(df[col]) for col in selected_columns)

    def build(self, df: pd.DataFrame, selected_columns: list[str]) -> ChartSpec:
        date_col = next(col for col in selected_columns if pd.api.types.is_datetime64_any_dtype(df[col]))
        numeric_col = next(col for col in selected_columns if pd.api.types.is_numeric_dtype(df[col]))

        series = df.copy()
        series[date_col] = pd.to_datetime(series[date_col])
        series["period"] = series[date_col].dt.to_period("Y")
        grouped = series.groupby("period", dropna=False)[numeric_col].sum().sort_index()
        return ChartSpec(
            chart_type="line",
            title=f"{numeric_col} by {date_col}",
            xAxis=[str(value) for value in grouped.index.tolist()],
            series=[ChartSeries(name=numeric_col, data=grouped.values.tolist())],
        )


class DateOnlyStrategy(VisualizationStrategy):
    def can_handle(self, df: pd.DataFrame, selected_columns: list[str]) -> bool:
        return len(selected_columns) == 1 and pd.api.types.is_datetime64_any_dtype(df[selected_columns[0]])

    def build(self, df: pd.DataFrame, selected_columns: list[str]) -> ChartSpec:
        column = selected_columns[0]
        series = df.copy()
        series[column] = pd.to_datetime(series[column])
        series["period"] = series[column].dt.to_period("Y")
        counts = series.groupby("period", dropna=False).size().sort_index()
        return ChartSpec(
            chart_type="line",
            title=f"Records by {column}",
            xAxis=[str(value) for value in counts.index.tolist()],
            series=[ChartSeries(name="Count", data=counts.values.tolist())],
        )


class NumericOnlyStrategy(VisualizationStrategy):
    def can_handle(self, df: pd.DataFrame, selected_columns: list[str]) -> bool:
        return len(selected_columns) == 1 and pd.api.types.is_numeric_dtype(df[selected_columns[0]])

    def build(self, df: pd.DataFrame, selected_columns: list[str]) -> ChartSpec:
        column = selected_columns[0]
        values = pd.to_numeric(df[column], errors="coerce").dropna()
        if values.empty:
            return ChartSpec(
                chart_type="bar",
                title=f"Distribution of {column}",
                xAxis=[],
                series=[ChartSeries(name=column, data=[])],
            )

        # Create histogram with 10 bins
        counts, bin_edges = np.histogram(values, bins=10)
        # Build readable bin labels
        labels = []
        for i in range(len(bin_edges) - 1):
            left = float(bin_edges[i])
            right = float(bin_edges[i + 1])
            labels.append(f"{left:.2f} - {right:.2f}")

        return ChartSpec(
            chart_type="bar",
            title=f"Distribution of {column}",
            xAxis=labels,
            series=[ChartSeries(name=column, data=counts.tolist())],
        )


class VisualizationEngine:
    def __init__(self) -> None:
        self.strategies: List[VisualizationStrategy] = [
            SingleCategoryStrategy(),
            TextNumericStrategy(),
            DateNumericStrategy(),
            DateOnlyStrategy(),
            NumericOnlyStrategy(),
        ]

    def build_chart(self, df: pd.DataFrame, selected_columns: list[str]) -> ChartSpec:
        for strategy in self.strategies:
            if strategy.can_handle(df, selected_columns):
                return strategy.build(df, selected_columns)

        return ChartSpec(
            chart_type="bar",
            title="Visualization",
            xAxis=[],
            series=[ChartSeries(name="Value", data=[])],
        )
