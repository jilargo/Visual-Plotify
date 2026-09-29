"""Visual Plotify API.

The app is designed to run entirely offline, so the API also serves the built
frontend when it is available (``npm run build``), which makes a single port
enough to use the tool.
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from app.api.chart import router as chart_router
from app.api.upload import router as upload_router
from app.config import (
    APP_DESCRIPTION,
    APP_NAME,
    APP_VERSION,
    DEV_ORIGINS,
    FRONTEND_DIST,
)
from app.errors import VisualPlotifyError

logger = logging.getLogger("visual_plotify")

app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description=APP_DESCRIPTION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(DEV_ORIGINS),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(VisualPlotifyError)
async def handle_visual_plotify_error(_: Request, exc: VisualPlotifyError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


@app.exception_handler(ValueError)
async def handle_value_error(_: Request, exc: ValueError) -> JSONResponse:
    """Surface pandas/pydantic value problems as actionable 400s, not 500s."""
    return JSONResponse(status_code=400, content={"detail": str(exc) or "Invalid request."})


@app.get("/health")
def health() -> dict:
    return {
        "status": "OK",
        "version": APP_VERSION,
        "app": APP_NAME,
    }


@app.get("/api/info")
def api_info() -> dict:
    return {
        "app": APP_NAME,
        "version": APP_VERSION,
        "description": APP_DESCRIPTION,
        "offline": True,
        "frontend_built": (FRONTEND_DIST / "index.html").is_file(),
    }


app.include_router(upload_router)
app.include_router(chart_router)


if (FRONTEND_DIST / "index.html").is_file():

    @app.get("/{spa_path:path}", include_in_schema=False)
    def serve_frontend(spa_path: str) -> FileResponse:
        """Serve the built single-page app, falling back to its entry document."""
        root = FRONTEND_DIST.resolve()
        candidate = (root / spa_path).resolve()
        if spa_path and candidate.is_relative_to(root) and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(root / "index.html")

    logger.info("Serving the built frontend from %s", FRONTEND_DIST)
