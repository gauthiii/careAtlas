"""FastAPI entrypoint for the CareAtlas backend.

All ServiceNow communication lives behind this service; the frontend only ever
calls `/api/*` here. Run locally with:

    uvicorn app.main:app --reload --port 8000
"""

import logging

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request
from fastapi.exception_handlers import http_exception_handler
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from .config import Settings, get_settings
from .entra_native_auth import router as entra_auth_router
from .models import (
    AISystem,
    ExecuteAgentRequest,
    ExecuteAgentResponse,
    ValidateRequest,
    ValidateResponse,
)
from .servicenow import ServiceNowError, execute_agent, fetch_agents, validate_user

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
)
logger = logging.getLogger("careatlas")

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


@api.post("/agents/execute", response_model=ExecuteAgentResponse)
async def post_execute_agent(
    body: ExecuteAgentRequest,
    settings: Settings = Depends(get_settings),
) -> ExecuteAgentResponse:
    try:
        output = await execute_agent(settings, body.agent_sys_id, body.user_input)
    except ServiceNowError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return ExecuteAgentResponse(output=output)


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

    @app.exception_handler(StarletteHTTPException)
    async def on_http_exception(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        # Log every HTTP error response so failures on any endpoint are tracked.
        # 5xx (e.g. upstream 502s) as errors, 4xx as warnings.
        log = logger.error if exc.status_code >= 500 else logger.warning
        log("%s %s -> %s: %s", request.method, request.url.path, exc.status_code, exc.detail)
        return await http_exception_handler(request, exc)

    @app.exception_handler(Exception)
    async def on_unhandled_exception(request: Request, exc: Exception) -> JSONResponse:
        # Catch-all for anything an endpoint didn't handle; log with traceback.
        logger.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})

    app.include_router(api)
    return app


app = create_app()
