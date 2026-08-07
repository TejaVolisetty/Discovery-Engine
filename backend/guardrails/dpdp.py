import os
import sys
import hashlib
import json
import csv
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional

GUARDRAILS_DIR = Path(__file__).parent.resolve()
BACKEND_DIR = GUARDRAILS_DIR.parent
LOGS_DIR = BACKEND_DIR / "logs"
LOGS_DIR.mkdir(parents=True, exist_ok=True)
AUDIT_LOG_PATH = LOGS_DIR / "audit_log.csv"

# Global DPDP compliance flags
CONSENT_REQUIRED = os.getenv("CONSENT_REQUIRED", "true").lower() in ("true", "1", "t")
HASH_SALT = os.getenv("DPDP_SALT", "antigravity_dpdp_salt_2026")

# Fields considered PII that must never be written to audit logs
PII_FIELDS = {"customer_id", "email", "name", "phone", "address", "postal_code", "ip_address", "age"}


def anonymize_session(customer_id: str) -> str:
    """
    Computes a deterministic cryptographic SHA-256 pseudo-ID for a customer_id.
    Ensures raw customer_id is never stored or logged downstream.
    """
    if not customer_id:
        return "pseudo_anonymous"

    raw_str = f"{HASH_SALT}:{customer_id}".encode("utf-8")
    sha_hash = hashlib.sha256(raw_str).hexdigest()
    return f"pseudo_{sha_hash[:16]}"


def check_consent(session: Dict[str, Any]) -> bool:
    """
    Checks if consent is granted in the session.
    If CONSENT_REQUIRED is True and consent is False/missing, returns False
    to block personalization and trigger popularity fallback.
    """
    if not CONSENT_REQUIRED:
        return True

    if not isinstance(session, dict):
        return False

    # Check explicit consent keys
    consent = session.get("consent", session.get("user_consent", session.get("has_consent", False)))
    return bool(consent)


def sanitize_event_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Strips any PII fields from event dictionaries before logging."""
    if not isinstance(data, dict):
        return {}

    sanitized = {}
    for k, v in data.items():
        k_lower = str(k).lower()
        if k_lower in PII_FIELDS:
            # Hash customer_id if present, otherwise strip
            if k_lower == "customer_id" and v:
                sanitized["pseudo_id"] = anonymize_session(str(v))
            continue
        sanitized[k] = v
    return sanitized


def audit_log(event: Dict[str, Any]):
    """
    Appends an audit log entry to /backend/logs/audit_log.csv with:
    timestamp, pseudo_id, action, and details (with all PII fields stripped).
    """
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    file_exists = AUDIT_LOG_PATH.exists()

    timestamp = datetime.now(timezone.utc).isoformat()
    
    # Extract customer_id or pseudo_id
    raw_cust_id = event.get("customer_id")
    pseudo_id = event.get("pseudo_id")

    if not pseudo_id and raw_cust_id:
        pseudo_id = anonymize_session(str(raw_cust_id))
    elif not pseudo_id:
        pseudo_id = "pseudo_anonymous"

    action = str(event.get("action", "unknown_event"))
    
    # Sanitize metadata details
    metadata = {k: v for k, v in event.items() if k not in ("action", "customer_id", "pseudo_id")}
    sanitized_details = sanitize_event_data(metadata)
    details_str = json.dumps(sanitized_details)

    row = [timestamp, pseudo_id, action, details_str]

    with open(AUDIT_LOG_PATH, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(["timestamp", "pseudo_id", "action", "details"])
        writer.writerow(row)


def test_dpdp_guardrails():
    """Unit test verifying anonymization, consent enforcement, and audit logging."""
    print("[TEST] Running DPDP Compliance Guardrails Test...")

    # 1. Test Anonymization
    cust_id = "cust_000042"
    pseudo_id_1 = anonymize_session(cust_id)
    pseudo_id_2 = anonymize_session(cust_id)
    
    print(f"  Raw Customer ID : {cust_id}")
    print(f"  Hashed Pseudo ID: {pseudo_id_1}")

    assert pseudo_id_1 == pseudo_id_2, "Anonymization must be deterministic!"
    assert cust_id not in pseudo_id_1, "Raw customer_id must not leak into pseudo_id!"
    assert pseudo_id_1.startswith("pseudo_"), "Pseudo-ID should start with 'pseudo_'"

    # 2. Test Consent Enforcement
    session_with_consent = {"customer_id": cust_id, "consent": True}
    session_no_consent = {"customer_id": cust_id, "consent": False}

    assert check_consent(session_with_consent) is True, "Consent True should allow personalization"
    assert check_consent(session_no_consent) is False, "Consent False must block personalization"
    print("  Consent Enforcement: PASSED (Consent=False successfully blocks personalization)")

    # 3. Test Audit Logging
    test_event = {
        "customer_id": cust_id,
        "action": "recommendation_request",
        "email": "user@example.com",  # PII to be stripped
        "recommendation_count": 10,
        "consent": True
    }
    audit_log(test_event)

    assert AUDIT_LOG_PATH.exists(), "Audit log file must be created"
    with open(AUDIT_LOG_PATH, "r", encoding="utf-8") as f:
        log_content = f.read()

    print(f"  Audit Log Saved To: {AUDIT_LOG_PATH}")
    assert cust_id not in log_content, "Raw customer_id must NEVER be written to audit log!"
    assert "user@example.com" not in log_content, "Email PII must NEVER be written to audit log!"
    assert pseudo_id_1 in log_content, "Pseudo ID must be recorded in audit log"
    print("  Audit Log PII Stripping: PASSED (Zero PII found in log file)")

    print("\n================================================================================")
    print("                    DPDP COMPLIANCE GUARDRAILS PASSED                          ")
    print("================================================================================\n")


if __name__ == "__main__":
    test_dpdp_guardrails()
