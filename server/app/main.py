"""FastAPI entrypoint for the CareAtlas backend.

All ServiceNow communication lives behind this service; the frontend only ever
calls `/api/*` here. Run locally with:

    uvicorn app.main:app --reload --port 8000
"""

from fastapi import APIRouter, Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import Settings, get_settings
from .entra_native_auth import router as entra_auth_router
from .models import AISystem, ValidateRequest, ValidateResponse
from .servicenow import ServiceNowError, fetch_agents, validate_user

api = APIRouter(prefix="/api")
api.include_router(entra_auth_router)


@api.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@api.get("/agents", response_model=list[AISystem])
async def get_agents(settings: Settings = Depends(get_settings)) -> list[AISystem]:
    try:
        return await fetch_agents(settings)
    except ServiceNowError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@api.post("/auth/validate", response_model=ValidateResponse)
async def post_validate(
    body: ValidateRequest,
    settings: Settings = Depends(get_settings),
) -> ValidateResponse:
    try:
        valid = await validate_user(settings, body.username, body.password)
    except ServiceNowError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return ValidateResponse(valid=valid)


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="CareAtlas API", version="1.0.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )

    app.include_router(api)
    return app


app = create_app()
