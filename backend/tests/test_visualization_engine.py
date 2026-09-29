"""Unit tests for chart-selection rules and their expected chart contracts."""

from __future__ import annotations

import pandas as pd
import pytest

from app.errors import ChartRequestError
from app.services.visualization_engine import ChartOptions, VisualizationEngine


@pytest.fixture
def engine() -> VisualizationEngine:
    return VisualizationEngine()


@pytest.mark.parametrize(
    ("frame", "columns", "expected_type", "expected_axis", "expected_values"),
    [
        (pd.DataFrame({"Category": ["B", "A", "A", None]}), ["Category"], "pie", ["A", "B", "Missing"], [2, 1, 1]),
        (pd.DataFrame({"Category": ["A", "B", "A"], "Amount": [2, 5, 3]}), ["Category", "Amount"], "bar", ["A", "B"], [5, 5]),
        (pd.DataFrame({"When": pd.to_datetime(["2024-01-01", "2025-01-01"]), "Amount": [2, 5]}), ["When", "Amount"], "line", ["2024", "2025"], [2, 5]),
        (pd.DataFrame({"When": pd.to_datetime(["2024-01-01", "2024-04-01", "2025-01-01"])}), ["When"], "line", ["2024", "2025"], [2, 1]),
        (pd.DataFrame({"First": [1, 2], "Second": [3, 4]}), ["First", "Second"], "line", ["1", "2"], [1, 2]),
    ],
)
def test_engine_selects_the_expected_strategy(
    engine: VisualizationEngine,
    frame: pd.DataFrame,
    columns: list[str],
    expected_type: str,
    expected_axis: list[str],
    expected_values: list[int],
) -> None:
    chart = engine.build_chart(frame, columns)

    assert chart.chart_type == expected_type
    assert chart.xAxis == expected_axis
    assert chart.series[0].data == expected_values


def test_engine_labels_missing_categories_instead_of_emitting_nan(
    engine: VisualizationEngine,
) -> None:
    chart = engine.build_chart(pd.DataFrame({"Region": ["North", None], "Sales": [10, 20]}), ["Region", "Sales"])

    assert chart.xAxis == ["Missing", "North"]
    assert "nan" not in chart.xAxis


def test_numeric_column_produces_histogram_with_all_records_accounted_for(engine: VisualizationEngine) -> None:
    chart = engine.build_chart(pd.DataFrame({"Score": [1, 2, 3, 4]}), ["Score"])

    assert chart.chart_type == "bar"
    assert chart.title == "Distribution of Score"
    assert len(chart.xAxis) == 10
    assert sum(chart.series[0].data) == 4


def test_constant_numeric_column_still_produces_a_single_bar(engine: VisualizationEngine) -> None:
    chart = engine.build_chart(pd.DataFrame({"Score": [7, 7, 7]}), ["Score"])

    assert chart.xAxis == ["7 – 7"]
    assert chart.series[0].data == [3]


def test_two_text_columns_produce_a_stacked_breakdown(engine: VisualizationEngine) -> None:
    frame = pd.DataFrame(
        {
            "Region": ["North", "North", "South", "South", "East"],
            "Product": ["Alpha", "Beta", "Alpha", "Alpha", "Beta"],
        }
    )

    chart = engine.build_chart(frame, ["Region", "Product"])

    assert chart.meta.strategy == "category-cross-tab"
    assert chart.title == "Records by Region and Product"
    assert chart.xAxis == ["East", "North", "South"]
    assert {series.name: series.data for series in chart.series} == {
        "Alpha": [0, 1, 2],
        "Beta": [1, 1, 0],
    }


def test_top_n_folds_the_long_tail_into_other(engine: VisualizationEngine) -> None:
    frame = pd.DataFrame({"Letter": list("ABCDE"), "Value": [50, 40, 30, 20, 10]})

    chart = engine.build_chart(frame, ["Letter", "Value"], ChartOptions(top_n=3))

    assert chart.xAxis == ["A", "B", "C", "Other"]
    assert chart.series[0].data == [50, 40, 30, 30]
    assert any("Other" in note for note in chart.meta.notes)


def test_sort_label_orders_categories_alphabetically(engine: VisualizationEngine) -> None:
    frame = pd.DataFrame({"Letter": ["C", "A", "B"], "Value": [1, 2, 3]})

    chart = engine.build_chart(frame, ["Letter", "Value"], ChartOptions(sort="label"))

    assert chart.xAxis == ["A", "B", "C"]


def test_aggregation_override_changes_the_title_and_maths(engine: VisualizationEngine) -> None:
    frame = pd.DataFrame({"Letter": ["A", "A", "B"], "Value": [1, 3, 10]})

    chart = engine.build_chart(frame, ["Letter", "Value"], ChartOptions(aggregation="mean"))

    assert chart.title == "Average Value by Letter"
    assert chart.series[0].data == [10.0, 2.0]


def test_time_granularity_can_be_forced(engine: VisualizationEngine) -> None:
    frame = pd.DataFrame(
        {
            "When": pd.to_datetime(["2024-01-05", "2024-01-20", "2024-02-02"]),
            "Amount": [1, 2, 3],
        }
    )

    chart = engine.build_chart(frame, ["When", "Amount"], ChartOptions(time_granularity="month"))

    assert chart.xAxis == ["2024-01", "2024-02"]
    assert chart.series[0].data == [3, 3]


def test_quarterly_granularity_uses_readable_labels(engine: VisualizationEngine) -> None:
    frame = pd.DataFrame(
        {"When": pd.to_datetime(["2024-01-05", "2024-05-20"]), "Amount": [1, 3]}
    )

    chart = engine.build_chart(frame, ["When", "Amount"], ChartOptions(time_granularity="quarter"))

    assert chart.xAxis == ["2024 Q1", "2024 Q2"]


def test_filters_narrow_the_rows_that_are_plotted(engine: VisualizationEngine) -> None:
    frame = pd.DataFrame({"Letter": ["A", "A", "B"], "Value": [1, 3, 10]})

    chart = engine.build_chart(
        frame,
        ["Letter", "Value"],
        filters=[{"column": "Value", "operator": "gt", "value": 2}],
    )

    assert chart.series[0].data == [10, 3]
    assert chart.meta.filtered_out_rows == 1


def test_between_filter_uses_both_bounds(engine: VisualizationEngine) -> None:
    frame = pd.DataFrame({"Letter": list("ABCDE"), "Value": [1, 5, 9, 13, 17]})

    chart = engine.build_chart(
        frame,
        ["Letter", "Value"],
        filters=[{"column": "Value", "operator": "between", "value": 5, "value_to": 12}],
    )

    assert chart.xAxis == ["C", "B"]


def test_chart_type_override_is_honoured_for_single_series(engine: VisualizationEngine) -> None:
    frame = pd.DataFrame({"Letter": ["A", "B"], "Value": [1, 2]})

    chart = engine.build_chart(frame, ["Letter", "Value"], ChartOptions(chart_type="hbar"))

    assert chart.chart_type == "hbar"


def test_pie_override_is_refused_for_multi_series_charts(engine: VisualizationEngine) -> None:
    frame = pd.DataFrame({"First": [1, 2], "Second": [3, 4]})

    chart = engine.build_chart(frame, ["First", "Second"], ChartOptions(chart_type="pie"))

    assert chart.chart_type == "line"
    assert any("pie chart needs a single series" in note for note in chart.meta.notes)


def test_numeric_comparison_caps_the_number_of_series(engine: VisualizationEngine) -> None:
    frame = pd.DataFrame({f"Column {index}": [index, index + 1] for index in range(9)})
    columns = [f"Column {index}" for index in range(9)]

    chart = engine.build_chart(frame, columns)

    assert len(chart.series) == 6
    assert any("first 6" in note for note in chart.meta.notes)


def test_unsupported_selection_returns_empty_chart_contract(engine: VisualizationEngine) -> None:
    frame = pd.DataFrame({"A": ["x", "y"], "B": ["p", "q"], "C": [1, 2]})

    chart = engine.build_chart(frame, ["A", "B", "C"])

    assert chart.chart_type == "bar"
    assert chart.xAxis == []
    assert chart.series[0].data == []
    assert chart.meta.notes


def test_unknown_columns_raise_an_actionable_error(engine: VisualizationEngine) -> None:
    with pytest.raises(ChartRequestError, match="Ghost"):
        engine.build_chart(pd.DataFrame({"A": [1]}), ["Ghost"])


def test_empty_column_selection_raises(engine: VisualizationEngine) -> None:
    with pytest.raises(ChartRequestError, match="at least one column"):
        engine.build_chart(pd.DataFrame({"A": [1]}), [])
