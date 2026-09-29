"""API-level regression tests for the workbook-to-chart user workflow."""

from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient


def test_health_reports_service_availability(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "OK"
    assert payload["app"] == "Visual Plotify"
    assert payload["version"]


def test_api_info_describes_the_offline_app(client: TestClient) -> None:
    payload = client.get("/api/info").json()

    assert payload["offline"] is True
    assert payload["app"] == "Visual Plotify"


def test_upload_returns_preview_metadata_and_column_statistics(uploaded_workbook: dict) -> None:
    assert uploaded_workbook["filename"] == "sales-workbook.xlsx"
    assert uploaded_workbook["sheet_names"] == ["Sales", "Workforce"]
    assert uploaded_workbook["active_sheet"] == "Sales"
    assert uploaded_workbook["columns"] == ["Region", "Sales", "Units", "Order Date", "Active"]
    assert uploaded_workbook["rows"] == 4
    assert len(uploaded_workbook["preview"]) == 4
    assert uploaded_workbook["has_more_rows"] is False

    stats = {item["column"]: item for item in uploaded_workbook["column_stats"]}
    sales = stats["Sales"]
    assert sales["type"] == "numeric"
    assert (sales["unique"], sales["missing"], sales["missing_pct"]) == (4, 0, 0.0)
    assert (sales["min"], sales["max"], sales["mean"], sales["median"]) == (50.0, 200.0, 125.0, 125.0)
    assert sales["q1"] is not None and sales["q3"] is not None
    assert sales["sum"] == 500.0
    assert stats["Region"]["type"] == "text"
    assert stats["Region"]["missing"] == 1
    assert stats["Region"]["top_values"] == {"North": 2, "South": 1, "Missing": 1}
    assert stats["Order Date"]["type"] == "date"
    assert stats["Order Date"]["min"] == "2024-01-15 00:00:00"
    assert stats["Order Date"]["max"] == "2025-03-01 00:00:00"
    assert stats["Active"]["type"] == "boolean"
    assert stats["Active"]["counts"] == {"True": 2, "False": 2}

    assert uploaded_workbook["quality"]["missing_cells"] == 1
    assert uploaded_workbook["quality"]["missing_pct"] > 0


def test_preview_can_switch_to_another_worksheet(client: TestClient, uploaded_workbook: dict) -> None:
    response = client.get(
        "/upload/preview",
        params={"file_path": uploaded_workbook["file_path"], "sheet_name": "Workforce"},
    )

    assert response.status_code == 200
    preview = response.json()
    assert preview["active_sheet"] == "Workforce"
    assert preview["columns"] == ["Department", "Headcount"]
    assert preview["rows"] == 2
    assert preview["preview"] == [
        {"Department": "Engineering", "Headcount": 12},
        {"Department": "Support", "Headcount": 8},
    ]


def test_preview_pages_through_rows(client: TestClient, uploaded_workbook: dict) -> None:
    response = client.get(
        "/upload/preview",
        params={"file_path": uploaded_workbook["file_path"], "offset": 2, "limit": 1},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["preview_offset"] == 2
    assert payload["preview_limit"] == 1
    assert payload["preview_total"] == 4
    assert payload["has_more_rows"] is True
    assert payload["preview"] == [{"Region": "North", "Sales": 150, "Units": 15, "Order Date": "2025-01-10 00:00:00", "Active": True}]


def test_preview_rejects_a_path_outside_the_uploads_folder(client: TestClient) -> None:
    response = client.get(
        "/upload/preview",
        params={"file_path": "C:/Windows/win.ini", "sheet_name": "Sales"},
    )

    assert response.status_code == 400
    assert "uploads folder" in response.json()["detail"]


def test_preview_reports_an_unknown_worksheet(client: TestClient, uploaded_workbook: dict) -> None:
    response = client.get(
        "/upload/preview",
        params={"file_path": uploaded_workbook["file_path"], "sheet_name": "Ghost"},
    )

    assert response.status_code == 404
    assert "Ghost" in response.json()["detail"]


def test_csv_uploads_are_supported_and_dates_are_inferred(uploaded_csv: dict) -> None:
    assert uploaded_csv["filename"] == "traffic.csv"
    assert uploaded_csv["sheet_names"] == []
    assert uploaded_csv["active_sheet"] is None
    assert uploaded_csv["columns"] == ["Channel", "Date", "Sessions", "Revenue"]
    assert uploaded_csv["rows"] == 4

    stats = {item["column"]: item for item in uploaded_csv["column_stats"]}
    assert stats["Date"]["type"] == "date"
    assert stats["Sessions"]["type"] == "numeric"
    assert stats["Channel"]["type"] == "text"


def test_unsupported_uploads_are_rejected(client: TestClient) -> None:
    response = client.post("/upload/", files={"file": ("notes.txt", b"hello", "text/plain")})

    assert response.status_code == 415
    assert ".xlsx" in response.json()["detail"]


def test_empty_uploads_are_rejected(client: TestClient) -> None:
    response = client.post("/upload/", files={"file": ("empty.csv", b"", "text/csv")})

    assert response.status_code == 400
    assert "empty" in response.json()["detail"]


def test_samples_are_listed_and_can_be_loaded(client: TestClient) -> None:
    catalog = client.get("/upload/samples").json()["samples"]

    assert [item["id"] for item in catalog] == ["quarterly-sales", "employee-roster", "web-traffic"]
    assert all(item["label"] and item["description"] for item in catalog)

    loaded = client.post("/upload/samples/quarterly-sales")
    assert loaded.status_code == 200
    payload = loaded.json()
    assert payload["filename"] == "Sample — Quarterly sales.csv"
    assert payload["rows"] == 96
    assert {"Region", "Product", "Quarter", "Units", "Revenue"} <= set(payload["columns"])


def test_a_loaded_sample_can_be_charted(client: TestClient) -> None:
    loaded = client.post("/upload/samples/employee-roster").json()

    response = client.post(
        "/chart/",
        json={
            "file_path": loaded["file_path"],
            "selected_columns": ["Department", "Salary"],
            "aggregation": "mean",
            "sort": "desc",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["title"] == "Average Salary by Department"
    assert payload["xAxis"][0] == "Engineering"
    assert payload["meta"]["plotted_rows"] == 40


def test_unknown_sample_returns_not_found(client: TestClient) -> None:
    assert client.post("/upload/samples/nope").status_code == 404


def test_chart_endpoint_generates_category_numeric_chart(client: TestClient, uploaded_workbook: dict) -> None:
    response = client.post(
        "/chart/",
        json={"file_path": uploaded_workbook["file_path"], "selected_columns": ["Region", "Sales"]},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["chart_type"] == "bar"
    assert payload["title"] == "Sales by Region"
    assert payload["xAxis"] == ["North", "South", "Missing"]
    assert payload["series"] == [{"name": "Sales", "data": [250, 200, 50]}]
    assert payload["xAxisLabel"] == "Region"
    assert payload["yAxisLabel"] == "Sales"
    assert payload["meta"]["strategy"] == "category-measure"
    assert payload["meta"]["plotted_rows"] == 4


def test_chart_endpoint_honours_aggregation_sort_and_top_n(client: TestClient, uploaded_workbook: dict) -> None:
    response = client.post(
        "/chart/",
        json={
            "file_path": uploaded_workbook["file_path"],
            "selected_columns": ["Region", "Sales"],
            "aggregation": "mean",
            "sort": "asc",
            "top_n": 2,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["title"] == "Average Sales by Region"
    # Truncated by magnitude, then displayed in the requested ascending order.
    assert payload["xAxis"] == ["Other", "North", "South"]
    assert payload["series"][0]["data"] == [50.0, 125.0, 200.0]
    assert payload["meta"]["aggregation"] == "mean"
    assert payload["meta"]["truncated"] is True


def test_chart_endpoint_applies_filters_before_grouping(client: TestClient, uploaded_workbook: dict) -> None:
    response = client.post(
        "/chart/",
        json={
            "file_path": uploaded_workbook["file_path"],
            "selected_columns": ["Region", "Sales"],
            "filters": [{"column": "Sales", "operator": "gte", "value": 100}],
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["series"][0]["data"] == [250, 200]
    assert payload["meta"]["filtered_out_rows"] == 1
    assert payload["meta"]["plotted_rows"] == 3


def test_chart_endpoint_reports_when_filters_remove_every_row(client: TestClient, uploaded_workbook: dict) -> None:
    response = client.post(
        "/chart/",
        json={
            "file_path": uploaded_workbook["file_path"],
            "selected_columns": ["Region"],
            "filters": [{"column": "Region", "operator": "eq", "value": "Nowhere"}],
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["xAxis"] == []
    assert any("filters" in note for note in payload["meta"]["notes"])


def test_chart_endpoint_applies_text_filters_before_grouping(client: TestClient, uploaded_workbook: dict) -> None:
    response = client.post(
        "/chart/",
        json={
            "file_path": uploaded_workbook["file_path"],
            "selected_columns": ["Region"],
            "filters": [{"column": "Region", "operator": "contains", "value": "nor"}],
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["xAxis"] == ["North"]
    assert payload["series"][0]["data"] == [2]
    assert payload["meta"]["filtered_out_rows"] == 2


def test_chart_endpoint_reads_the_requested_worksheet(client: TestClient, uploaded_workbook: dict) -> None:
    response = client.post(
        "/chart/",
        json={
            "file_path": uploaded_workbook["file_path"],
            "sheet_name": "Workforce",
            "selected_columns": ["Department", "Headcount"],
        },
    )

    assert response.status_code == 200
    assert response.json()["xAxis"] == ["Engineering", "Support"]


def test_chart_endpoint_rejects_missing_required_request_fields(client: TestClient) -> None:
    response = client.post("/chart/", json={"selected_columns": ["Sales"]})

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body", "file_path"]


def test_chart_endpoint_rejects_an_empty_column_selection(client: TestClient, uploaded_workbook: dict) -> None:
    response = client.post("/chart/", json={"file_path": uploaded_workbook["file_path"], "selected_columns": []})

    assert response.status_code == 422


def test_chart_endpoint_rejects_repeated_columns(client: TestClient, uploaded_workbook: dict) -> None:
    response = client.post(
        "/chart/",
        json={"file_path": uploaded_workbook["file_path"], "selected_columns": ["Sales", "Sales"]},
    )

    assert response.status_code == 422


def test_chart_endpoint_reports_unknown_columns(client: TestClient, uploaded_workbook: dict) -> None:
    response = client.post(
        "/chart/",
        json={"file_path": uploaded_workbook["file_path"], "selected_columns": ["Ghost"]},
    )

    assert response.status_code == 400
    detail = response.json()["detail"]
    assert "Ghost" in detail and "Region" in detail


def test_chart_endpoint_rejects_an_unknown_chart_type(client: TestClient, uploaded_workbook: dict) -> None:
    response = client.post(
        "/chart/",
        json={
            "file_path": uploaded_workbook["file_path"],
            "selected_columns": ["Region"],
            "chart_type": "sunburst",
        },
    )

    assert response.status_code == 422


def test_chart_endpoint_accepts_the_upload_folder_relative_path(
    client: TestClient, uploaded_workbook: dict
) -> None:
    # The browser echoes back exactly what the upload endpoint returned, which in a
    # normal launch is the relative "uploads/<stored name>" form.
    stored = Path(uploaded_workbook["file_path"])
    relative = f"{stored.parent.name}/{stored.name}"

    response = client.post("/chart/", json={"file_path": relative, "selected_columns": ["Region", "Sales"]})

    assert response.status_code == 200, response.text
    assert response.json()["title"] == "Sales by Region"


def test_chart_endpoint_rejects_paths_outside_the_upload_folder(
    client: TestClient, uploaded_workbook: dict
) -> None:
    stored = Path(uploaded_workbook["file_path"])
    escape = f"{stored.parent.name}/../conftest.py"

    response = client.post("/chart/", json={"file_path": escape, "selected_columns": ["Region"]})

    assert response.status_code == 400
    assert "outside" in response.json()["detail"]
