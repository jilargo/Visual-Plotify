from __future__ import annotations

import sys
from io import BytesIO
from pathlib import Path

import pandas as pd
import pytest
from fastapi.testclient import TestClient


# Allow the tests to be run from either the repository root or backend/.
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


@pytest.fixture
def workbook_bytes() -> bytes:
    """A deterministic workbook representing the supported user data types."""
    buffer = BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        pd.DataFrame(
            {
                "Region": ["North", "South", "North", None],
                "Sales": [100, 200, 150, 50],
                "Units": [10, 20, 15, 5],
                "Order Date": pd.to_datetime(["2024-01-15", "2024-02-20", "2025-01-10", "2025-03-01"]),
                "Active": [True, False, True, False],
            }
        ).to_excel(writer, sheet_name="Sales", index=False)
        pd.DataFrame({"Department": ["Engineering", "Support"], "Headcount": [12, 8]}).to_excel(
            writer, sheet_name="Workforce", index=False
        )
    return buffer.getvalue()


@pytest.fixture
def csv_bytes() -> bytes:
    return (
        b"Channel,Date,Sessions,Revenue\r\n"
        b"Organic,2025-01-01,120,700.5\r\n"
        b"Paid,2025-01-01,80,410.25\r\n"
        b"Organic,2025-01-02,150,860\r\n"
        b"Paid,2025-01-02,95,505\r\n"
    )


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    # Keep test uploads out of the application uploads directory.
    from app.api import upload
    from app.main import app

    monkeypatch.setattr(upload, "UPLOAD_DIR", tmp_path)
    return TestClient(app)


@pytest.fixture
def uploaded_workbook(client: TestClient, workbook_bytes: bytes) -> dict:
    response = client.post(
        "/upload/",
        files={"file": ("sales-workbook.xlsx", workbook_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert response.status_code == 200, response.text
    return response.json()


@pytest.fixture
def uploaded_csv(client: TestClient, csv_bytes: bytes) -> dict:
    response = client.post("/upload/", files={"file": ("traffic.csv", csv_bytes, "text/csv")})
    assert response.status_code == 200, response.text
    return response.json()
