"""Chart generation endpoint."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.api.upload import resolve_stored_path
from app.config import DEFAULT_MAX_CATEGORIES
from app.schemas.visualization import (
    VisualizationRequest,
    VisualizationResponse,
)
from app.services.dataset_service import DatasetService
from app.services.visualization_engine import ChartOptions
from app.services.visualization_service import VisualizationService

router = APIRouter(prefix="/chart", tags=["Chart"])


@router.post("/", response_model=VisualizationResponse)
def create_chart(request: VisualizationRequest) -> dict:
    stored_path = resolve_stored_path(request.file_path)
    frame = DatasetService.load_frame(stored_path, sheet_name=request.sheet_name)

    options = ChartOptions(
        chart_type=request.chart_type,
        aggregation=request.aggregation,
        sort=request.sort,
        top_n=request.top_n,
        max_categories=DEFAULT_MAX_CATEGORIES,
        time_granularity=request.time_granularity,
    )

    try:
        chart = VisualizationService.build_chart(
            frame=frame,
            selected_columns=request.selected_columns,
            options=options,
            filters=request.filters,
        )
    except ValueError as exc:
        # Column level problems are the user's to fix, not a server fault.
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return chart.to_dict()
