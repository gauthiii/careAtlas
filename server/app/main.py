"""FastAPI entrypoint for the CareAtlas backend.

All ServiceNow communication lives behind this service; the frontend only ever
calls `/api/*` here. Run locally with:

    uvicorn app.main:app --reload --port 8000
"""

import logging
from typing import Any
from secrets import compare_digest

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request
from fastapi.exception_handlers import http_exception_handler
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from .config import Settings, get_settings
from .a2a_callbacks import (
    AgentExecutionRecord,
    create_pending_execution,
    get_execution,
    store_callback,
)
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
        output = await execute_agent(
            settings,
            body.agent_sys_id,
            body.user_input,
            context_id=body.context_id,
            task_id=body.task_id,
        )
    except ServiceNowError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    create_pending_execution(
        request_id=output.request_id,
        agent_sys_id=body.agent_sys_id,
        output=output.output,
        context_id=output.context_id,
        task_id=output.task_id,
        state=output.state,
        status=output.status,
    )
    return ExecuteAgentResponse(
        request_id=output.request_id,
        output=output.output,
        context_id=output.context_id,
        task_id=output.task_id,
        state=output.state,
        status=output.status,
    )


@api.get("/agents/execute/{request_id}", response_model=ExecuteAgentResponse)
async def get_agent_execution(request_id: str) -> ExecuteAgentResponse:
    record = get_execution(request_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Agent execution request not found")
    return _record_response(record)


@api.post("/a2a/callback/{agent_sys_id}")
async def post_a2a_callback(
    agent_sys_id: str,
    request: Request,
    settings: Settings = Depends(get_settings),
) -> dict[str, str]:
    body = await _read_json_body(request)
    if not _valid_callback_auth(request, body, settings):
        raise HTTPException(status_code=401, detail="Invalid A2A callback token")

    record = store_callback(agent_sys_id, body)
    logger.info(
        "Stored ServiceNow A2A callback for agent %s request %s status %s",
        agent_sys_id,
        record.request_id,
        record.status,
    )
    return {"status": "accepted", "request_id": record.request_id}


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


async def _read_json_body(request: Request) -> Any:
    try:
        return await request.json()
    except Exception:  # noqa: BLE001 - callback verification probes may send no body
        return {}


def _record_response(record: AgentExecutionRecord) -> ExecuteAgentResponse:
    return ExecuteAgentResponse(
        request_id=record.request_id,
        output=record.output,
        context_id=record.context_id,
        task_id=record.task_id,
        state=record.state,
        status=record.status,
        error=record.error,
    )


def _valid_callback_auth(request: Request, body: Any, settings: Settings) -> bool:
    expected = settings.a2a_callback_token
    if not expected:
        return False

    for token in _callback_token_candidates(request, body):
        if compare_digest(token, expected):
            return True
    return False


def _callback_token_candidates(request: Request, body: Any) -> list[str]:
    candidates: list[str] = []
    authorization = request.headers.get("authorization")
    if authorization:
        scheme, _, value = authorization.partition(" ")
        if scheme.lower() == "bearer" and value:
            candidates.append(value.strip())
        candidates.append(authorization.strip())

    for header in ("x-a2a-callback-token", "x-servicenow-callback-token", "x-callback-token"):
        value = request.headers.get(header)
        if value:
            candidates.append(value.strip())

    for key in ("token", "callback_token", "callbackToken"):
        value = request.query_params.get(key)
        if value:
            candidates.append(value.strip())

    if isinstance(body, dict):
        for key in ("token", "callback_token", "callbackToken"):
            value = body.get(key)
            if value:
                candidates.append(str(value).strip())
        params = body.get("params")
        configuration = params.get("configuration") if isinstance(params, dict) else None
        config = (
            configuration.get("pushNotificationConfig")
            if isinstance(configuration, dict)
            else None
        )
        if isinstance(config, dict) and config.get("token"):
            candidates.append(str(config["token"]).strip())

    return [token for token in candidates if token]


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
