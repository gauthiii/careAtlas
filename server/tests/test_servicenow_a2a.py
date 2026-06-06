import json
import sys
import unittest
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import parse_qs

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.servicenow import (
    ServiceNowError,
    _A2A_TOKEN_CACHE,
    _extract_a2a_context_id,
    _extract_a2a_state,
    _extract_a2a_task_id,
    _extract_a2a_text,
    execute_agent,
)


@dataclass
class FakeSettings:
    snow_instance: str = "ven04690.service-now.com"
    snow_a2a_client_id: str = "client-id"
    snow_a2a_client_secret: str = "client-secret"
    snow_a2a_token_skew_seconds: int = 60
    request_timeout: float = 5.0

    @property
    def snow_base_url(self) -> str:
        return f"https://{self.snow_instance}"


def form_body(request: httpx.Request) -> dict[str, str]:
    parsed = parse_qs(request.content.decode())
    return {key: values[-1] for key, values in parsed.items()}


class ServiceNowA2ATest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        _A2A_TOKEN_CACHE.clear()

    async def call_execute(self, responses):
        requests = []

        def handler(request: httpx.Request) -> httpx.Response:
            requests.append(request)
            status_code, body = responses[len(requests) - 1]
            return httpx.Response(status_code, json=body)

        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as http_client:
            result = await execute_agent(
                FakeSettings(),
                "0123456789abcdef0123456789abcdef",
                "Summarize record RITM001",
                http_client=http_client,
            )

        return result, requests

    async def test_execute_fetches_oauth_token_and_posts_zurich_a2a_payload(self):
        result, requests = await self.call_execute(
            [
                (200, {"access_token": "token-1", "expires_in": 1800}),
                (
                    200,
                    {
                        "jsonrpc": "2.0",
                        "id": "request-id",
                        "result": {
                            "status": {
                                "state": "completed",
                                "message": {
                                    "kind": "message",
                                    "parts": [{"kind": "text", "text": "Done"}],
                                },
                            }
                        },
                    },
                ),
            ]
        )

        token_request = requests[0]
        execute_request = requests[1]
        token_body = form_body(token_request)
        execute_body = json.loads(execute_request.content.decode())

        self.assertEqual(result.output, "Done")
        self.assertEqual(token_request.url.path, "/oauth_token.do")
        self.assertEqual(token_body["grant_type"], "client_credentials")
        self.assertEqual(token_body["client_id"], "client-id")
        self.assertEqual(token_body["client_secret"], "client-secret")
        self.assertEqual(
            execute_request.url.path,
            "/api/sn_aia/a2a/v2/agent/id/0123456789abcdef0123456789abcdef",
        )
        self.assertEqual(execute_request.headers["authorization"], "Bearer token-1")
        self.assertEqual(execute_body["jsonrpc"], "2.0")
        self.assertEqual(execute_body["method"], "message/send")
        self.assertEqual(execute_body["params"]["configuration"]["acceptedOutputModes"], ["application/json"])
        self.assertIs(execute_body["params"]["configuration"]["blocking"], True)
        self.assertEqual(execute_body["params"]["configuration"]["historyLength"], 0)
        self.assertEqual(execute_body["params"]["message"]["kind"], "message")
        self.assertEqual(execute_body["params"]["message"]["role"], "user")
        self.assertTrue(execute_body["params"]["message"]["messageId"])
        self.assertEqual(
            execute_body["params"]["message"]["parts"],
            [{"kind": "text", "text": "Summarize record RITM001"}],
        )

    async def test_execute_reuses_cached_token(self):
        requests = []

        def handler(request: httpx.Request) -> httpx.Response:
            requests.append(request)
            if request.url.path == "/oauth_token.do":
                return httpx.Response(200, json={"access_token": "token-1", "expires_in": 1800})
            return httpx.Response(
                200,
                json={
                    "jsonrpc": "2.0",
                    "result": {
                        "status": {
                            "message": {
                                "parts": [{"kind": "text", "text": "ok"}],
                            }
                        }
                    },
                },
            )

        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as http_client:
            await execute_agent(
                FakeSettings(),
                "0123456789abcdef0123456789abcdef",
                "first",
                http_client=http_client,
            )
            await execute_agent(
                FakeSettings(),
                "0123456789abcdef0123456789abcdef",
                "second",
                http_client=http_client,
            )

        self.assertEqual([request.url.path for request in requests].count("/oauth_token.do"), 1)

    async def test_execute_sends_follow_up_context_and_task_ids(self):
        requests = []

        def handler(request: httpx.Request) -> httpx.Response:
            requests.append(request)
            if request.url.path == "/oauth_token.do":
                return httpx.Response(200, json={"access_token": "token-1", "expires_in": 1800})
            return httpx.Response(
                200,
                json={
                    "jsonrpc": "2.0",
                    "result": {
                        "id": "task-2",
                        "contextId": "context-2",
                        "status": {"state": "completed", "message": {"parts": [{"kind": "text", "text": "ok"}]}},
                    },
                },
            )

        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as http_client:
            result = await execute_agent(
                FakeSettings(),
                "0123456789abcdef0123456789abcdef",
                "proceed",
                context_id="context-1",
                task_id="task-1",
                http_client=http_client,
            )

        execute_body = json.loads(requests[1].content.decode())
        self.assertEqual(execute_body["params"]["message"]["contextId"], "context-1")
        self.assertEqual(execute_body["params"]["message"]["taskId"], "task-1")
        self.assertEqual(result.output, "ok")
        self.assertEqual(result.context_id, "context-2")
        self.assertEqual(result.task_id, "task-2")
        self.assertEqual(result.state, "completed")

    async def test_execute_surfaces_json_rpc_errors(self):
        with self.assertRaisesRegex(ServiceNowError, "JSON-RPC error -32602: Invalid method parameters"):
            await self.call_execute(
                [
                    (200, {"access_token": "token-1", "expires_in": 1800}),
                    (200, {"jsonrpc": "2.0", "error": {"code": -32602, "message": "Invalid method parameters"}}),
                ]
            )

    async def test_execute_adds_401_403_guidance(self):
        with self.assertRaisesRegex(ServiceNowError, "third-party access/discoverability"):
            await self.call_execute(
                [
                    (200, {"access_token": "token-1", "expires_in": 1800}),
                    (403, {"error": {"message": "Forbidden"}}),
                ]
            )

    def test_extract_a2a_text_reads_status_message_parts(self):
        body = {
            "content": {
                "result": {
                    "status": {
                        "message": {
                            "parts": [
                                {"kind": "text", "text": "Line one"},
                                {"kind": "text", "text": "Line two"},
                                {"kind": "text", "text": ""},
                            ]
                        }
                    }
                }
            }
        }

        self.assertEqual(_extract_a2a_text(body), "Line one\n\nLine two")

    def test_extract_a2a_metadata_reads_context_task_and_state(self):
        body = {
            "result": {
                "id": "task-id",
                "contextId": "context-id",
                "status": {"state": "input-required"},
            }
        }

        self.assertEqual(_extract_a2a_context_id(body), "context-id")
        self.assertEqual(_extract_a2a_task_id(body), "task-id")
        self.assertEqual(_extract_a2a_state(body), "input-required")


if __name__ == "__main__":
    unittest.main()
