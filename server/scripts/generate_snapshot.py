"""Optional: write a static JSON snapshot of the AI agent inventory.

Only needed for fully static hosting that can't reach the live API. Writes the
same shape the `/api/agents` endpoint returns.

    cd server
    python scripts/generate_snapshot.py [output_path]

Default output: ../public/snow-ai-agent-inventory.json
"""

import asyncio
import json
import sys
from pathlib import Path

# Allow running as a plain script (`python scripts/generate_snapshot.py`).
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import get_settings  # noqa: E402
from app.servicenow import fetch_agents  # noqa: E402

DEFAULT_OUTPUT = Path(__file__).resolve().parents[2] / "public" / "snow-ai-agent-inventory.json"


async def main() -> None:
    output_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_OUTPUT

    settings = get_settings()
    agents = await fetch_agents(settings)
    payload = [agent.model_dump() for agent in agents]

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    print(f"Wrote {len(payload)} agents to {output_path}")


if __name__ == "__main__":
    asyncio.run(main())
