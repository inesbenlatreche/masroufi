from typing import Any, Dict


VALID_TYPES = {"income", "expense"}

VALID_CATEGORIES = {
    "vente",
    "salaire",
    "transport",
    "nourriture",
    "logement",
    "sante",
    "famille",
    "materiel",
    "autre",
}


def validate(raw: Dict[str, Any]) -> Dict[str, Any]:
    """
    Deterministic validation layer.

    Takes the JSON returned by Groq and decides whether the
    result should be stored, discarded, or treated as incomplete.

    No AI reasoning happens here.
    """

    if not isinstance(raw, dict):
        return {
            "status": "discard",
            "reason": "invalid_response",
        }

    transaction_status = raw.get("transaction_status")

    transaction_type = raw.get("type")
    amount = raw.get("amount")
    currency = raw.get("currency")
    category = raw.get("category")
    confidence = raw.get("confidence")
    original_text = raw.get("original_text", "")

    # ---------------------------------------------------------
    # 1. Explicitly non-transactional input
    # ---------------------------------------------------------

    if transaction_status == "none":
        return {
            "status": "discard",
            "reason": "not_a_transaction",
            "original_text": original_text,
            "raw": raw,
        }

    # ---------------------------------------------------------
    # 2. Validate transaction type
    # ---------------------------------------------------------

    if transaction_type not in VALID_TYPES:
        return {
            "status": "discard",
            "reason": "invalid_transaction_type",
            "original_text": original_text,
            "raw": raw,
        }

    # ---------------------------------------------------------
    # 3. Validate amount
    # ---------------------------------------------------------

    if not isinstance(amount, (int, float)):
        return {
            "status": "discard",
            "reason": "invalid_amount",
            "original_text": original_text,
            "raw": raw,
        }

    if amount < 0:
        return {
            "status": "discard",
            "reason": "negative_amount",
            "original_text": original_text,
            "raw": raw,
        }

    # ---------------------------------------------------------
    # 4. Validate currency
    # ---------------------------------------------------------

    if currency != "DZD":
        return {
            "status": "discard",
            "reason": "unsupported_currency",
            "original_text": original_text,
            "raw": raw,
        }

    # ---------------------------------------------------------
    # 5. Validate category
    # ---------------------------------------------------------

    if category not in VALID_CATEGORIES:
        category = "autre"

    # ---------------------------------------------------------
    # 6. Missing amount
    # ---------------------------------------------------------

    if amount == 0:
        return {
            "status": "incomplete",
            "reason": "missing_amount",
            "transaction": {
                "type": transaction_type,
                "amount": 0,
                "currency": "DZD",
                "category": category,
            },
            "confidence": "low",
            "original_text": original_text,
            "raw": raw,
        }

    # ---------------------------------------------------------
    # 7. Low confidence
    # ---------------------------------------------------------

    if confidence == "low":
        return {
            "status": "clarification",
            "reason": "low_confidence",
            "transaction": {
                "type": transaction_type,
                "amount": amount,
                "currency": "DZD",
                "category": category,
            },
            "confidence": "low",
            "original_text": original_text,
            "raw": raw,
        }

    # ---------------------------------------------------------
    # 8. Valid transaction
    # ---------------------------------------------------------

    return {
        "status": "store",
        "transaction": {
            "type": transaction_type,
            "amount": amount,
            "currency": "DZD",
            "category": category,
        },
        "confidence": confidence,
        "original_text": original_text,
    }