from typing import Any, Dict

from asr import transcribe
from extraction import extract_financial_data
from validation import validate


# Demo-only storage.
# Everything is lost when the application restarts.
transactions = []


def process_audio(audio_path: str) -> Dict[str, Any]:
    """
    Complete audio processing pipeline:

    audio
      ↓
    ASR
      ↓
    financial extraction
      ↓
    deterministic validation
      ↓
    optional in-memory storage
    """

    transcript = transcribe(audio_path)

    raw = extract_financial_data(transcript)

    result = validate(raw)

    if result["status"] == "store":
        transactions.append(result)

    return {
        "transcript": transcript,
        "result": result,
    }


def get_summary() -> Dict[str, Any]:
    """
    Calculate the current in-memory financial summary.
    """

    stored_transactions = [
        item
        for item in transactions
        if item.get("status") == "store"
    ]

    total_income = sum(
        item["transaction"]["amount"]
        for item in stored_transactions
        if item["transaction"]["type"] == "income"
    )

    total_expense = sum(
        item["transaction"]["amount"]
        for item in stored_transactions
        if item["transaction"]["type"] == "expense"
    )

    return {
        "income": total_income,
        "expense": total_expense,
        "net": total_income - total_expense,
        "transactions": stored_transactions,
    }