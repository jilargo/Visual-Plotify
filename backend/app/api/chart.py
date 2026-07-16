from fastapi import APIRouter

from app.schemas.visualization import VisualizationRequest, VisualizationResponse
from app.services.visualization_service import VisualizationService

router = APIRouter(prefix="/chart", tags=["Chart"])


@router.post("/", response_model=VisualizationResponse)
def create_chart(request: VisualizationRequest) -> dict:
    chart = VisualizationService.build_chart(
        file_path=request.file_path,
        selected_columns=request.selected_columns,
    )
    return chart.to_dict()