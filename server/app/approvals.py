"""In-memory human-approval gate for high-impact AI agent intents (UC2 — Risk).

Excessive agency (OWASP LLM06) is bounded not only by ACLs but by a human-in-the-loop
gate: when an agent is asked to do something high-impact (approve a registration, write
a clinical note, delete/override/escalate), the request stops at ``pending_approval``
and cannot proceed until a governance officer approves it. The decision — including the
approver's identity — is recorded.

The store is process-local (the demo runs a single backend); it is intentionally simple.
"""

from dataclasses import dataclass
from uuid import uuid4

# (substring, human-readable reason). Matched case-insensitively against the intent.
# Rules are ACTION-oriented so read-only questions (e.g. "what is my registration status")
# do NOT trip the gate — only verbs that mutate/approve do.
HIGH_IMPACT_RULES: tuple[tuple[str, str], ...] = (
    ("approve registration", "Self-approving a patient registration"),
    ("approve the registration", "Self-approving a patient registration"),
    ("approve a registration", "Self-approving a patient registration"),
    ("approve my registration", "Self-approving a patient registration"),
    ("write a clinical note", "Writing a clinical note"),
    ("write a note", "Writing a clinical note"),
    ("add a clinical note", "Writing a clinical note"),
    ("add a note", "Writing a clinical note"),
    ("update the note", "Editing a clinical note"),
    ("delete", "Deleting a record"),
    ("override", "Overriding a control"),
    ("escalate", "Escalating priority"),
    ("mark urgent", "Forcing an urgent flag"),
    ("flag urgent", "Forcing an urgent flag"),
    ("cancel the appointment", "Cancelling an appointment"),
    ("cancel appointment", "Cancelling an appointment"),
    ("refund", "Issuing a refund"),
)


@dataclass
class ApprovalRecord:
    request_id: str
    intent: str
    high_impact: bool
    reason: str
    status: str  # pending_approval | auto_completed | approved | denied
    approver: str = ""


_STORE: dict[str, ApprovalRecord] = {}


def classify_intent(text: str) -> tuple[bool, str]:
    """Return (is_high_impact, reason). First matching rule wins."""
    lowered = (text or "").lower()
    for needle, reason in HIGH_IMPACT_RULES:
        if needle in lowered:
            return True, reason
    return False, "Low-impact intent within the agent's scope"


def create_request(intent: str) -> ApprovalRecord:
    high_impact, reason = classify_intent(intent)
    record = ApprovalRecord(
        request_id=f"appr-{uuid4().hex[:12]}",
        intent=intent.strip(),
        high_impact=high_impact,
        reason=reason,
        status="pending_approval" if high_impact else "auto_completed",
    )
    _STORE[record.request_id] = record
    return record


def get_request(request_id: str) -> ApprovalRecord | None:
    return _STORE.get(request_id)


def decide(request_id: str, decision: str, approver: str) -> ApprovalRecord | None:
    record = _STORE.get(request_id)
    if record is None:
        return None
    record.status = "approved" if decision == "approve" else "denied"
    record.approver = approver.strip() or "governance officer"
    return record
