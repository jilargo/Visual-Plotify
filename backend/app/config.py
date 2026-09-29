"""Application-wide settings for the Visual Plotify backend."""

from __future__ import annotations

from pathlib import Path

APP_NAME = "Visual Plotify"
APP_VERSION = "1.1.0"
APP_DESCRIPTION = (
    "Turn spreadsheets into publication-ready charts entirely on the local machine."
)

BACKEND_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_ROOT.parent
FRONTEND_DIST = PROJECT_ROOT / "frontend" / "dist"

# Tabular formats the app can read. Legacy ``.xls`` is handled by pandas when the
# engine's ``xlrd`` dependency happens to be available, but it is not advertised.
SUPPORTED_EXTENSIONS = (".xlsx", ".xlsm", ".csv")

# Uploads are buffered in memory by Starlette before they reach the handler, so the
# ceiling stays modest: this is a desktop tool, not a data warehouse.
MAX_UPLOAD_BYTES = 25 * 1024 * 1024
UPLOAD_CHUNK_BYTES = 1024 * 1024

# Preview paging.
MAX_PREVIEW_ROWS = 200
DEFAULT_PREVIEW_ROWS = 25

# Guard rails so a high-cardinality column cannot produce an unreadable chart.
DEFAULT_MAX_CATEGORIES = 30
MAX_CATEGORIES = 200

# Default histogram resolution for a single numeric column.
DEFAULT_BINS = 10

# Placeholder labels used whenever a row has no value for a grouped column.
MISSING_LABEL = "Missing"
OTHER_LABEL = "Other"

DEV_ORIGINS = (
    "http://localhost:5173",
    "http://127.0.0.1:5173",
)
