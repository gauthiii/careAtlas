import os
import sys
import unittest
from dataclasses import dataclass
from pathlib import Path
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

os.environ.setdefault("SNOW_INSTANCE", "ven04690.service-now.com")
os.environ.setdefault("SNOW_USERNAME", "snow-user")
os.environ.setdefault("SNOW_PASSWORD", "snow-password")
os.environ.setdefault("A2A_CALLBACK_BASE_URL", "https://careatlas.onrender.com")
os.environ.setdefault("A2A_CALLBACK_TOKEN", "callback-secret")

from app.a2a_callbacks import create_pending_execution, reset_callback_store
from app.config import get_settings
from app.main import create_app
from app.servicenow import AgentExecutionResult


@dataclass
class CallbackSettings:
    a2a_callback_token: str = "callback-secret"


class A2ACallbackEndpointTest(unittest.TestCase):
    def setUp(self):
        reset_callback_store()
        get_settings.cache_clear()
        self.app = create_app()
        self.app.dependency_overrides[get_settings] = lambda: CallbackSettings()
        self.client = TestClient(self.app)

    def tearDown(self):
        self.app.dependency_overrides.clear()
        reset_callback_store()

    def test_callback_rejects_bad_or_missing_token(self):
        response = self.client.post(
            "/api/a2a/callback/0123456789abcdef0123456789abcdef",
            json={"id": "request-1"},
        )

        self.assertEqual(response.status_code, 401)

        response = self.client.post(
            "/api/a2a/callback/0123456789abcdef0123456789abcdef",
            headers={"Authorization": "Bearer wrong-token"},
            json={"id": "request-1"},
        )

        self.assertEqual(response.status_code, 401)

    def test_poll_returns_pending_before_callback_and_completed_after_callback(self):
        create_pending_execution(
            request_id="request-1",
            agent_sys_id="0123456789abcdef0123456789abcdef",
            state="submitted",
        )

        pending = self.client.get("/api/agents/execute/request-1")
        self.assertEqual(pending.status_code, 200)
        self.assertEqual(pending.json()["status"], "pending")

        callback = self.client.post(
            "/api/a2a/callback/0123456789abcdef0123456789abcdef",
            headers={"Authorization": "Bearer callback-secret"},
            json={
                "id": "request-1",
                "result": {
                    "id": "task-1",
                    "contextId": "context-1",
                    "status": {
                        "state": "completed",
                        "message": {
                            "kind": "message",
                            "parts": [{"kind": "text", "text": "Callback complete"}],
                        },
                    },
                },
            },
        )
        self.assertEqual(callback.status_code, 200)

        completed = self.client.get("/api/agents/execute/request-1")
        body = completed.json()
        self.assertEqual(completed.status_code, 200)
        self.assertEqual(body["status"], "completed")
        self.assertEqual(body["output"], "Callback complete")
        self.assertEqual(body["context_id"], "context-1")
        self.assertEqual(body["task_id"], "task-1")
        self.assertEqual(body["state"], "completed")

    def test_execute_endpoint_accepts_system_context(self):
        expected = AgentExecutionResult(
            request_id="request-2",
            output="Accepted",
            context_id="context-2",
            task_id="task-2",
            state="completed",
            status="completed",
        )

        with patch("app.main.execute_agent", new=AsyncMock(return_value=expected)) as mock_execute:
            response = self.client.post(
                "/api/agents/execute",
                json={
                    "agent_sys_id": "0123456789abcdef0123456789abcdef",
                    "user_input": "Book an appointment",
                    "system_context": "System context: Patient is Maya Patel. Email: maya@example.com.",
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["output"], "Accepted")
        self.assertEqual(mock_execute.await_args.kwargs["system_context"], "System context: Patient is Maya Patel. Email: maya@example.com.")


if __name__ == "__main__":
    unittest.main()
