"""Have I Been Pwned Pwned Passwords client."""

import hashlib
import logging
from typing import NoReturn

import httpx

from .config import Settings
from .models import PasswordPwnedCheckResponse

logger = logging.getLogger("careatlas.pwned_passwords")

PWNED_PASSWORDS_RANGE_URL = "https://api.pwnedpasswords.com/range/{prefix}"


class PwnedPasswordsError(RuntimeError):
    """Raised when the Pwned Passwords API cannot be checked."""


async def check_pwned_password(
    settings: Settings,
    password: str,
    http_client: httpx.AsyncClient | None = None,
) -> PasswordPwnedCheckResponse:
    digest = hashlib.sha1(password.encode("utf-8")).hexdigest().upper()
    prefix = digest[:5]
    suffix = digest[5:]

    async def run(client: httpx.AsyncClient) -> httpx.Response:
        return await client.get(
            PWNED_PASSWORDS_RANGE_URL.format(prefix=prefix),
            headers={
                "Accept": "text/plain",
                "Add-Padding": "true",
                "User-Agent": "CareAtlas-PwnedPasswordCheck",
            },
        )

    if http_client is not None:
        response = await run(http_client)
    else:
        async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
            response = await run(client)

    if not response.is_success:
        _raise_pwned_passwords_error(response)

    count = _match_suffix_count(response.text, suffix)
    return PasswordPwnedCheckResponse(pwned=count > 0, count=count)


def _match_suffix_count(range_body: str, suffix: str) -> int:
    for line in range_body.splitlines():
        candidate_suffix, _, count_text = line.partition(":")
        if candidate_suffix.upper() != suffix:
            continue
        try:
            return int(count_text)
        except ValueError:
            return 0
    return 0


def _raise_pwned_passwords_error(response: httpx.Response) -> NoReturn:
    detail = response.reason_phrase
    if response.text.strip():
        detail = response.text.strip()
    logger.error(
        "Pwned Passwords request failed: %s %s -> %s %s",
        response.request.method,
        response.request.url,
        response.status_code,
        detail,
    )
    raise PwnedPasswordsError(f"Pwned Passwords {response.status_code}: {detail}")
