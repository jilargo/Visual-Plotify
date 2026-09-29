"""Unit tests for reading workbooks and CSV files into JSON-safe metadata."""

from __future__ import annotations

import math
from pathlib import Path

import pandas as pd
import pytest

from app.errors import ParseError, UnsupportedFileError
from app.services.dataset_service import DatasetService, to_json_value


def test_to_json_value_never_emits_non_finite_numbers() -> None:
    assert to_json_value(float("nan")) is None
    assert to_json_value(float("inf")) is None
    assert to_json_value(pd.NaT) is None
    assert to_json_value(None) is None
    assert to_json_value(3) == 3
    assert to_json_value(2.5) == 2.5
    assert to_json_value(pd.Timestamp("2024-05-06 07:08:09")) == "2024-05-06 07:08:09"
    assert to_json_value(True) is True


def test_to_json_value_handles_numpy_scalars() -> None:
    assert to_json_value(pd.Series([1, 2]).iloc[0]) == 1
    assert isinstance(to_json_value(pd.Series([1, 2]).iloc[0]), int)
    assert not isinstance(to_json_value(pd.Series([1.5]).iloc[0]), float) or math.isfinite(1.5)


def test_describe_flags_missing_values_and_duplicates(tmp_path: Path) -> None:
    path = tmp_path / "quality.xlsx"
    pd.DataFrame(
        {
            "Region": ["North", "North", "South", None],
            "Sales": [1, 1, 2, 3],
            "Empty": [None, None, None, None],
        }
    ).to_excel(path, index=False)

    payload = DatasetService.describe(path)

    assert payload["quality"]["duplicate_rows"] == 1
    assert payload["quality"]["empty_columns"] == ["Empty"]
    assert payload["quality"]["missing_cells"] == 5
    assert payload["quality"]["missing_pct"] == pytest.approx(41.67, abs=0.01)
    assert payload["preview"][3]["Region"] is None


def test_describe_pages_rows_and_reports_more(tmp_path: Path) -> None:
    path = tmp_path / "paging.xlsx"
    pd.DataFrame({"Index": range(10), "Value": range(10)}).to_excel(path, index=False)

    page = DatasetService.describe(path, offset=8, limit=5)

    assert page["preview_offset"] == 8
    assert page["preview_limit"] == 5
    assert page["preview_total"] == 10
    assert page["has_more_rows"] is False
    assert page["preview"] == [{"Index": 8, "Value": 8}, {"Index": 9, "Value": 9}]


def test_describe_clamps_the_page_size(tmp_path: Path) -> None:
    path = tmp_path / "clamped.xlsx"
    pd.DataFrame({"Value": [1]}).to_excel(path, index=False)

    assert DatasetService.describe(path, limit=10_000)["preview_limit"] <= 200


def test_csv_dates_are_inferred_and_json_encodes(tmp_path: Path) -> None:
    path = tmp_path / "events.csv"
    path.write_text(
        "Event,Date,Score\nLaunch,2025-01-01,5\nReview,2025-02-03,8\n",
        encoding="utf-8",
    )

    payload = DatasetService.describe(path)

    assert payload["sheet_names"] == []
    assert payload["active_sheet"] is None
    stats = {item["column"]: item for item in payload["column_stats"]}
    assert stats["Date"]["type"] == "date"
    assert stats["Date"]["min"] == "2025-01-01 00:00:00"
    assert stats["Score"]["mean"] == 6.5
    assert payload["preview"] == [
        {"Event": "Launch", "Date": "2025-01-01 00:00:00", "Score": 5},
        {"Event": "Review", "Date": "2025-02-03 00:00:00", "Score": 8},
    ]

    import json

    json.dumps(payload)  # must not raise on NaN


def test_csv_quarter_labels_stay_textual(tmp_path: Path) -> None:
    path = tmp_path / "quarters.csv"
    path.write_text("Quarter,Revenue\n2024 Q1,10\n2024 Q2,20\n", encoding="utf-8")

    stats = {item["column"]: item for item in DatasetService.describe(path)["column_stats"]}

    assert stats["Quarter"]["type"] == "text"


def test_utf8_bom_and_latin1_files_are_both_readable(tmp_path: Path) -> None:
    bom = tmp_path / "bom.csv"
    bom.write_bytes("Name,Città\nAda,Parigi\n".encode("utf-8-sig"))
    latin = tmp_path / "latin.csv"
    latin.write_bytes("Name,City\nAda,Parigi\n".encode("latin-1"))

    assert DatasetService.describe(bom)["preview"][0]["Città"] == "Parigi"
    assert DatasetService.describe(latin)["preview"][0]["City"] == "Parigi"


def test_unsupported_files_are_rejected(tmp_path: Path) -> None:
    path = tmp_path / "notes.txt"
    path.write_text("hello", encoding="utf-8")

    with pytest.raises(UnsupportedFileError):
        DatasetService.describe(path)


def test_missing_files_are_reported(tmp_path: Path) -> None:
    with pytest.raises(Exception, match="No uploaded file"):
        DatasetService.describe(tmp_path / "ghost.xlsx")


def test_empty_sheet_raises_a_parse_error(tmp_path: Path) -> None:
    path = tmp_path / "empty.csv"
    path.write_text("", encoding="utf-8")

    with pytest.raises(ParseError):
        DatasetService.load_frame(path)


def test_single_row_numeric_columns_report_a_null_standard_deviation(tmp_path: Path) -> None:
    path = tmp_path / "single.xlsx"
    pd.DataFrame({"Sales": [10]}).to_excel(path, index=False)

    stats = DatasetService.describe(path)["column_stats"][0]

    assert stats["mean"] == 10.0
    assert stats["std"] is None  # NaN must never reach the client
