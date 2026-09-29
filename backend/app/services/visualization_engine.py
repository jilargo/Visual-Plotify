"""Chart construction strategies.

The engine is intentionally boring: pick columns, group them, and describe the
result. All presentation decisions (colours, tooltips, animation) belong to the
frontend, and all presentation preferences (chart type, aggregation, sort order)
arrive through :class:`ChartOptions`.
"""

from __future__ import annotations

import math
import re
from abc import ABC, abstractmethod
from collections.abc import Mapping
from dataclasses import dataclass, field
from typing import Any, Iterable, Optional, Sequence

import numpy as np
import pandas as pd

from app.config import (
    DEFAULT_BINS,
    DEFAULT_MAX_CATEGORIES,
    MISSING_LABEL,
    OTHER_LABEL,
)
from app.errors import ChartRequestError
from app.models.visualization import ChartMeta, ChartSeries, ChartSpec

CHART_TYPES = ("auto", "bar", "hbar", "line", "area", "scatter", "pie", "donut")
PIE_CHART_TYPES = ("pie", "donut")
AGGREGATIONS = ("auto", "sum", "mean", "median", "min", "max", "count")
SORT_ORDERS = ("none", "asc", "desc", "label")
TIME_GRANULARITIES = ("auto", "year", "quarter", "month", "week", "day")

AGGREGATION_LABELS = {
    "sum": "",
    "mean": "Average ",
    "median": "Median ",
    "min": "Minimum ",
    "max": "Maximum ",
    "count": "Count of ",
}

GRANULARITY_PERIODS = {
    "year": "Y",
    "quarter": "Q",
    "month": "M",
    "week": "W",
    "day": "D",
}

# Series beyond this count turn a line chart into spaghetti.
MAX_SERIES = 6
# Categories beyond this count are folded into a single "Other" bar.
MAX_CROSS_TAB_SERIES = 8


def is_numeric(series: pd.Series) -> bool:
    return pd.api.types.is_numeric_dtype(series) and not pd.api.types.is_bool_dtype(series)


def is_text_like(series: pd.Series) -> bool:
    return not is_numeric(series) and not pd.api.types.is_datetime64_any_dtype(series)


def series_values(series: pd.Series) -> list[Any]:
    """JSON-safe python values for a numeric series."""
    values: list[Any] = []
    for value in series.tolist():
        if value is None:
            values.append(None)
        elif isinstance(value, bool | np.bool_):
            values.append(bool(value))
        elif isinstance(value, (int, np.integer)):
            values.append(int(value))
        elif isinstance(value, (float, np.floating)):
            number = float(value)
            values.append(None if not math.isfinite(number) else number)
        else:
            values.append(value)
    return values


def normalise_keys(series: pd.Series) -> pd.Series:
    """Category keys as clean strings, with blanks folded into ``Missing``."""
    keys = series.where(series.notna(), MISSING_LABEL).astype(str).str.strip()
    return keys.replace("", MISSING_LABEL)


def aggregate_by(
    keys: pd.Series,
    values: pd.Series,
    aggregation: str,
) -> pd.Series:
    work = pd.DataFrame({"key": keys, "value": values})
    if aggregation == "count":
        return work.groupby("key", sort=True).size()
    work["value"] = pd.to_numeric(work["value"], errors="coerce")
    return work.groupby("key", sort=True)["value"].agg(aggregation)


def apply_sort(series: pd.Series, sort_order: str) -> pd.Series:
    if sort_order == "label":
        return series.sort_index(kind="stable")
    if sort_order == "asc":
        return series.sort_values(ascending=True, kind="stable")
    # "none" keeps the friendlier default: biggest value first.
    return series.sort_values(ascending=False, kind="stable")


def limit_categories(series: pd.Series, options: "ChartOptions") -> tuple[pd.Series, int]:
    """Keep the chart readable by folding long tails into a single ``Other`` bar.

    Truncation always happens on magnitude; the requested display order is applied
    afterwards by :func:`apply_sort`.
    """
    limit = max(int(options.top_n or options.max_categories), 1)
    if len(series) <= limit:
        return series, 0

    ordered = series.sort_values(ascending=False, kind="stable")
    kept = ordered.iloc[:limit]
    remainder = ordered.iloc[limit:]
    folded = pd.concat([kept, pd.Series({OTHER_LABEL: remainder.sum()})])
    return folded, int(len(remainder))


def choose_granularity(values: pd.Series) -> str:
    """Pick a time bucket that keeps the number of points readable."""
    distinct = int(pd.Series(values).nunique())
    if distinct <= 1:
        return "day"

    if distinct <= 12:
        return "year"
    if distinct <= 60:
        return "month"
    if distinct <= 200:
        return "week"

    span_days = (values.max() - values.min()).days
    return "week" if span_days <= 1200 else "month"


def period_labels(values: pd.Series, granularity: str) -> pd.Series:
    period = values.dt.to_period(GRANULARITY_PERIODS[granularity])
    if granularity == "year":
        return period.astype(str)
    if granularity == "quarter":
        return period.astype(str).str.replace("Q", " Q", regex=False)
    if granularity == "week":
        return period.dt.start_time.dt.strftime("%Y-%m-%d")
    if granularity == "month":
        return period.astype(str)
    return period.dt.start_time.dt.strftime("%Y-%m-%d")


@dataclass
class ChartOptions:
    """Presentation preferences that do not change which rows are plotted."""

    chart_type: str = "auto"
    aggregation: str = "auto"
    sort: str = "none"
    top_n: Optional[int] = None
    max_categories: int = DEFAULT_MAX_CATEGORIES
    time_granularity: str = "auto"
    bins: int = DEFAULT_BINS
    notes: list[str] = field(default_factory=list)

    def note(self, message: str) -> None:
        if message not in self.notes:
            self.notes.append(message)


def apply_filters(frame: pd.DataFrame, rules: Sequence[Any]) -> tuple[pd.DataFrame, int]:
    """Apply declarative filter rules, ignoring columns that are not present."""
    if not rules:
        return frame, 0

    mask = pd.Series(True, index=frame.index)
    for rule in rules:
        column = _rule_field(rule, "column")
        if not column or column not in frame.columns:
            continue
        mask &= _rule_mask(
            frame[column],
            _rule_field(rule, "operator", "contains") or "contains",
            _rule_field(rule, "value"),
            _rule_field(rule, "value_to"),
        )

    filtered = frame[mask]
    return filtered, int(len(frame) - len(filtered))


def _rule_field(rule: Any, name: str, default: Any = None) -> Any:
    """Read a field from either a pydantic model or a plain mapping."""
    if isinstance(rule, Mapping):
        return rule.get(name, default)
    return getattr(rule, name, default)


def _rule_mask(series: pd.Series, operator: str, value: Any, value_to: Any) -> pd.Series:
    if operator == "is_null":
        return series.isna()
    if operator == "not_null":
        return series.notna()

    if operator == "between":
        numeric = pd.to_numeric(series, errors="coerce")
        return numeric.between(_as_number(value), _as_number(value_to))

    if operator in ("gt", "gte", "lt", "lte"):
        if pd.api.types.is_datetime64_any_dtype(series):
            comparable = pd.to_datetime(series, errors="coerce")
            bound = pd.to_datetime(value, errors="coerce")
        else:
            comparable = pd.to_numeric(series, errors="coerce")
            bound = _as_number(value)
        if bound is None or (isinstance(bound, float) and math.isnan(bound)):
            return pd.Series(False, index=series.index)

        if operator == "gt":
            return comparable > bound
        if operator == "gte":
            return comparable >= bound
        if operator == "lt":
            return comparable < bound
        return comparable <= bound

    text = series.astype(str).str.strip().str.lower()
    needle = "" if value is None else str(value).strip().lower()

    if operator == "eq":
        return text == needle
    if operator == "neq":
        return text != needle
    if operator == "not_contains":
        return ~text.str.contains(re.escape(needle), regex=True, na=False)
    if operator == "in":
        wanted = value if isinstance(value, list) else [part for part in str(value or "").split(",")]
        return text.isin([str(item).strip().lower() for item in wanted if str(item).strip()])
    # Default: substring match.
    return text.str.contains(re.escape(needle), regex=True, na=False) if needle else pd.Series(True, index=series.index)


def _as_number(value: Any) -> Optional[float]:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


class VisualizationStrategy(ABC):
    name = "strategy"
    natural_chart_type = "bar"

    @abstractmethod
    def can_handle(self, frame: pd.DataFrame, columns: list[str]) -> bool:
        raise NotImplementedError

    @abstractmethod
    def build(self, frame: pd.DataFrame, columns: list[str], options: ChartOptions) -> ChartSpec:
        raise NotImplementedError

    # -- shared helpers -------------------------------------------------

    def _spec(
        self,
        options: ChartOptions,
        title: str,
        labels: Iterable[Any],
        series: list[ChartSeries],
        x_label: str,
        y_label: str,
    ) -> ChartSpec:
        axis = [str(label) for label in labels]
        return ChartSpec(
            chart_type=self.natural_chart_type,
            title=title,
            xAxis=axis,
            series=series,
            xAxisLabel=x_label,
            yAxisLabel=y_label,
        )


class SingleCategoryStrategy(VisualizationStrategy):
    """One text or boolean column: show how the rows are distributed."""

    name = "single-category"
    natural_chart_type = "pie"

    def can_handle(self, frame: pd.DataFrame, columns: list[str]) -> bool:
        return len(columns) == 1 and is_text_like(frame[columns[0]])

    def build(self, frame: pd.DataFrame, columns: list[str], options: ChartOptions) -> ChartSpec:
        column = columns[0]
        counts = normalise_keys(frame[column]).value_counts()
        counts, folded = limit_categories(counts, options)
        counts = apply_sort(counts, options.sort)
        if folded:
            options.note(
                f"{folded} smaller categories were grouped into '{OTHER_LABEL}'."
            )

        return self._spec(
            options,
            title=f"{column} distribution",
            labels=counts.index,
            series=[ChartSeries(name="Records", data=series_values(counts))],
            x_label=column,
            y_label="Records",
        )


class TextNumericStrategy(VisualizationStrategy):
    """A category column plus a measure column: the workhorse bar chart."""

    name = "category-measure"
    natural_chart_type = "bar"

    def can_handle(self, frame: pd.DataFrame, columns: list[str]) -> bool:
        if len(columns) != 2:
            return False
        return any(is_text_like(frame[column]) for column in columns) and any(
            is_numeric(frame[column]) for column in columns
        )

    def _roles(self, frame: pd.DataFrame, columns: list[str]) -> tuple[str, str]:
        category = next(column for column in columns if is_text_like(frame[column]))
        measure = next(column for column in columns if is_numeric(frame[column]))
        return category, measure

    def build(self, frame: pd.DataFrame, columns: list[str], options: ChartOptions) -> ChartSpec:
        category, measure = self._roles(frame, columns)
        aggregation = self._aggregation(options)

        grouped = aggregate_by(normalise_keys(frame[category]), frame[measure], aggregation)
        grouped, folded = limit_categories(grouped, options)
        grouped = apply_sort(grouped, options.sort)
        if folded:
            options.note(
                f"Only the top {min(len(grouped) - 1, int(options.top_n or options.max_categories))} "
                f"{category} values are shown; the remaining {folded} were grouped into '{OTHER_LABEL}'."
            )

        label = AGGREGATION_LABELS.get(aggregation, "")
        return self._spec(
            options,
            title=f"{label}{measure} by {category}",
            labels=grouped.index,
            series=[ChartSeries(name=measure, data=series_values(grouped))],
            x_label=category,
            y_label=f"{label}{measure}".strip() or measure,
        )

    @staticmethod
    def _aggregation(options: ChartOptions) -> str:
        return "sum" if options.aggregation == "auto" else options.aggregation


class CrossTabStrategy(VisualizationStrategy):
    """Two category columns: count how the rows line up."""

    name = "category-cross-tab"
    natural_chart_type = "bar"

    def can_handle(self, frame: pd.DataFrame, columns: list[str]) -> bool:
        return len(columns) == 2 and all(is_text_like(frame[column]) for column in columns)

    def build(self, frame: pd.DataFrame, columns: list[str], options: ChartOptions) -> ChartSpec:
        row_key, column_key = columns
        keys = normalise_keys(frame[row_key])
        buckets = normalise_keys(frame[column_key])

        row_totals = keys.value_counts()
        row_counts, folded_rows = limit_categories(row_totals, options)
        row_counts = apply_sort(row_counts, "label" if options.sort == "none" else options.sort)
        if folded_rows:
            options.note(
                f"Only the top {len(row_counts)} {row_key} values are shown; "
                f"{folded_rows} smaller values are hidden."
            )

        visible_rows = [key for key in row_counts.index if key != OTHER_LABEL]
        table = pd.crosstab(keys, buckets).reindex(index=visible_rows, fill_value=0)

        bucket_totals = buckets.value_counts().sort_values(ascending=False)
        keep = [bucket for bucket in bucket_totals.index if bucket in set(table.columns)]
        keep, dropped = keep[:MAX_CROSS_TAB_SERIES], keep[MAX_CROSS_TAB_SERIES:]

        other = table[dropped].sum(axis=1) if dropped else None
        table = table[keep]
        if dropped:
            table[OTHER_LABEL] = other
            options.note(
                f"Only the {len(keep)} most common {column_key} values are shown; "
                f"{len(dropped)} were grouped into '{OTHER_LABEL}'."
            )

        return self._spec(
            options,
            title=f"Records by {row_key} and {column_key}",
            labels=table.index,
            series=[
                ChartSeries(name=str(name), data=series_values(table[name]))
                for name in table.columns
            ],
            x_label=row_key,
            y_label="Records",
        )


class DateNumericStrategy(VisualizationStrategy):
    """A date column plus a measure column: a trend line."""

    name = "date-trend"
    natural_chart_type = "line"

    def can_handle(self, frame: pd.DataFrame, columns: list[str]) -> bool:
        if len(columns) != 2:
            return False
        has_date = any(pd.api.types.is_datetime64_any_dtype(frame[column]) for column in columns)
        return has_date and any(is_numeric(frame[column]) for column in columns)

    def build(self, frame: pd.DataFrame, columns: list[str], options: ChartOptions) -> ChartSpec:
        date_column = next(
            column for column in columns if pd.api.types.is_datetime64_any_dtype(frame[column])
        )
        measure = next(column for column in columns if is_numeric(frame[column]))
        aggregation = "sum" if options.aggregation == "auto" else options.aggregation

        dates = pd.to_datetime(frame[date_column], errors="coerce")
        valid = dates.notna()
        dates, values = dates[valid], frame.loc[valid, measure]

        granularity = options.time_granularity
        if granularity == "auto":
            granularity = choose_granularity(dates)
        options.note(f"Grouped by {granularity}.")

        labels = period_labels(dates, granularity)
        grouped = aggregate_by(labels, values, aggregation).sort_index(kind="stable")

        label = AGGREGATION_LABELS.get(aggregation, "")
        return self._spec(
            options,
            title=f"{label}{measure} by {date_column}",
            labels=grouped.index,
            series=[ChartSeries(name=measure, data=series_values(grouped))],
            x_label=date_column,
            y_label=f"{label}{measure}".strip() or measure,
        )


class DateOnlyStrategy(VisualizationStrategy):
    """A single date column: how many records land in each period."""

    name = "date-volume"
    natural_chart_type = "line"

    def can_handle(self, frame: pd.DataFrame, columns: list[str]) -> bool:
        return len(columns) == 1 and pd.api.types.is_datetime64_any_dtype(frame[columns[0]])

    def build(self, frame: pd.DataFrame, columns: list[str], options: ChartOptions) -> ChartSpec:
        column = columns[0]
        dates = pd.to_datetime(frame[column], errors="coerce").dropna()

        granularity = options.time_granularity
        if granularity == "auto":
            granularity = choose_granularity(dates)
        options.note(f"Grouped by {granularity}.")

        labels = period_labels(dates, granularity)
        counts = labels.value_counts().sort_index(kind="stable")

        return self._spec(
            options,
            title=f"Records by {column}",
            labels=counts.index,
            series=[ChartSeries(name="Records", data=series_values(counts))],
            x_label=column,
            y_label="Records",
        )


class MultiNumericStrategy(VisualizationStrategy):
    """Several numeric columns: compare them row by row."""

    name = "numeric-comparison"
    natural_chart_type = "line"

    def can_handle(self, frame: pd.DataFrame, columns: list[str]) -> bool:
        return len(columns) > 1 and all(is_numeric(frame[column]) for column in columns)

    def build(self, frame: pd.DataFrame, columns: list[str], options: ChartOptions) -> ChartSpec:
        if len(columns) > MAX_SERIES:
            options.note(
                f"Only the first {MAX_SERIES} of {len(columns)} columns are plotted."
            )
        plotted = columns[:MAX_SERIES]

        cleaned = frame[plotted].apply(pd.to_numeric, errors="coerce")
        labels = [
            MISSING_LABEL if pd.isna(value) else str(value)
            for value in frame[plotted[0]].tolist()
        ]
        series = [
            ChartSeries(name=column, data=series_values(cleaned[column])) for column in plotted
        ]

        return self._spec(
            options,
            title="Numeric series comparison",
            labels=labels,
            series=series,
            x_label=plotted[0],
            y_label="Value",
        )


class NumericOnlyStrategy(VisualizationStrategy):
    """A single numeric column: a histogram of its distribution."""

    name = "numeric-distribution"
    natural_chart_type = "bar"

    def can_handle(self, frame: pd.DataFrame, columns: list[str]) -> bool:
        return len(columns) == 1 and is_numeric(frame[columns[0]])

    def build(self, frame: pd.DataFrame, columns: list[str], options: ChartOptions) -> ChartSpec:
        column = columns[0]
        values = pd.to_numeric(frame[column], errors="coerce").dropna()

        if values.empty:
            return self._spec(
                options,
                title=f"Distribution of {column}",
                labels=[],
                series=[ChartSeries(name=column, data=[])],
                x_label=column,
                y_label="Records",
            )

        if values.nunique() == 1:
            only = float(values.iloc[0])
            label = f"{only:,.2f}".rstrip("0").rstrip(".")
            return self._spec(
                options,
                title=f"Distribution of {column}",
                labels=[f"{label} – {label}"],
                series=[ChartSeries(name=column, data=[int(len(values))])],
                x_label=column,
                y_label="Records",
            )

        bins = max(1, int(options.bins))
        counts, edges = np.histogram(values, bins=bins)
        labels = [f"{edges[index]:,.2f} – {edges[index + 1]:,.2f}" for index in range(len(edges) - 1)]

        return self._spec(
            options,
            title=f"Distribution of {column}",
            labels=labels,
            series=[ChartSeries(name=column, data=series_values(pd.Series(counts)))],
            x_label=column,
            y_label="Records",
        )


class VisualizationEngine:
    """Chooses and runs the first strategy that fits the selected columns."""

    def __init__(self) -> None:
        self.strategies: list[VisualizationStrategy] = [
            SingleCategoryStrategy(),
            TextNumericStrategy(),
            CrossTabStrategy(),
            DateNumericStrategy(),
            DateOnlyStrategy(),
            MultiNumericStrategy(),
            NumericOnlyStrategy(),
        ]

    def build_chart(
        self,
        frame: pd.DataFrame,
        selected_columns: list[str],
        options: Optional[ChartOptions] = None,
        filters: Sequence[Any] = (),
    ) -> ChartSpec:
        options = options or ChartOptions()
        columns = self._validate(frame, selected_columns)

        filtered, removed = apply_filters(frame, filters)
        if filtered.empty:
            return self._empty(
                options,
                "No rows match the current filters. Loosen the filter rules to see data.",
            )

        strategy = next((item for item in self.strategies if item.can_handle(filtered, columns)), None)
        if strategy is None:
            return self._empty(
                options,
                "These columns cannot be plotted together. Try one text column or one numeric column.",
            )

        spec = strategy.build(filtered, columns, options)
        self._apply_chart_type(spec, options)

        categories = len(spec.xAxis)
        spec.meta = ChartMeta(
            strategy=strategy.name,
            source_rows=int(len(frame)),
            plotted_rows=int(len(filtered)),
            filtered_out_rows=removed,
            categories=categories,
            aggregation=options.aggregation,
            columns=columns,
            time_granularity=options.time_granularity,
            top_n=options.top_n,
            truncated=categories >= max(int(options.top_n or options.max_categories), 1),
            notes=list(options.notes),
        )
        return spec

    # -- internals ------------------------------------------------------

    @staticmethod
    def _validate(frame: pd.DataFrame, selected_columns: list[str]) -> list[str]:
        if not selected_columns:
            raise ChartRequestError("Select at least one column to visualize.")

        if len(set(selected_columns)) != len(selected_columns):
            raise ChartRequestError("The same column was selected more than once.")

        missing = [column for column in selected_columns if column not in frame.columns]
        if missing:
            available = ", ".join(str(column) for column in frame.columns)
            raise ChartRequestError(
                f"Column(s) not found in the worksheet: {', '.join(missing)}. Available columns: {available}."
            )

        return list(selected_columns)

    @staticmethod
    def _empty(options: ChartOptions, reason: str) -> ChartSpec:
        options.note(reason)
        return ChartSpec(
            chart_type="bar",
            title="Visualization",
            xAxis=[],
            series=[ChartSeries(name="Value", data=[])],
            xAxisLabel="",
            yAxisLabel="",
            meta=ChartMeta(notes=list(options.notes), source_rows=0, plotted_rows=0),
        )

    @staticmethod
    def _apply_chart_type(spec: ChartSpec, options: ChartOptions) -> None:
        requested = options.chart_type
        if requested in ("", "auto") or requested == spec.chart_type:
            return

        if requested in PIE_CHART_TYPES and len(spec.series) != 1:
            options.note(
                "A pie chart needs a single series, so the automatic chart type was kept."
            )
            return

        spec.chart_type = requested
