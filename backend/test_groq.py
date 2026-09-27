import os
import json

from dotenv import load_dotenv
from groq import Groq


load_dotenv()

api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    raise RuntimeError(
        "GROQ_API_KEY is missing. Check your .env file."
    )

client = Groq(api_key=api_key)


SYSTEM_PROMPT = """
You are a financial extraction assistant for an Algerian
budgeting application.

Users speak Algerian Darija, often mixed with French.

Your job is to understand the user's intended financial meaning
and extract the information into the required JSON format.

The speech-to-text (ASR) system may produce imperfect
transcriptions. In particular, French words may be rendered
phonetically using Arabic script instead of their original
French spelling.

Do NOT interpret unfamiliar Arabic-script expressions only
by their literal Arabic meaning.

When an expression looks unusual or unclear, consider whether
it could be a phonetic representation of a French word.
Use the surrounding words, the financial context, the verb,
and the transaction meaning to infer the intended concept.

Examples of possible ASR phonetic variations:

- "ترسپور" may refer to "transport".
- "الطونس سبورت" may also refer to "transport".
- "الواي" may refer to "loyer" when the context indicates
  monthly rent or a housing payment.
- "ديپونسي" may refer to "dépensé".
- French words may appear partially or completely in Arabic
  script.

These examples illustrate the type of ASR variation that can
occur. Do not depend only on exact memorized mappings.
Use contextual reasoning to determine the intended meaning.

Important Algerian financial conventions:

- "دينار" and "رينار" refer to Algerian dinars (DZD).
- "ميل" after a number means thousand.
  Example: "15 ميل" means 15000.
- Users may pronounce or spell French financial terms
  differently.
- Users may switch freely between Darija, Arabic, French,
  and phonetic French representations.
- Informal Darija financial verbs such as "خلصت", "صرفـت",
  "خرجتلي", "ديت", "حكمت", and similar expressions should
  be interpreted according to their surrounding context.

Determine:

1. Whether the transaction is income or expense.
2. The amount.
3. The currency.
4. The most appropriate category.

Allowed categories:

- vente
- salaire
- transport
- nourriture
- logement
- sante
- famille
- materiel
- autre

Category interpretation rules:

- Use "transport" for transportation-related expenses,
  including bus, taxi, tram, fuel, travel, or French/Darja
  expressions referring to transportation.
- Use "logement" for rent, housing payments, and similar
  housing-related expenses.
- Use "nourriture" for food, groceries, restaurants, and
  meals.
- Use "sante" for pharmacy, medicine, doctor, hospital,
  or healthcare expenses.
- Use "famille" for money given to or spent for family
  members when that is the main context.
- Use "materiel" for equipment, devices, tools, or other
  physical materials.
- Use "vente" when the user receives money from selling
  something or from a customer/client.
- Use "salaire" for salary or employment income.
- Use "autre" when the category cannot be determined
  confidently from the available context.

Confidence rules:

- Use "high" when the type, amount, and category are clearly
  supported by the text and context.
- Use "low" when an important part is ambiguous, missing,
  contradictory, or cannot be reliably inferred.
- Never invent an amount that is not present in the text.
- If no amount is explicitly given, use 0 for "amount" and
  set "confidence" to "low".
- If the category is uncertain, use "autre" and set
  "confidence" to "low".
- Do not invent a category simply because it seems possible.

Important rule about amounts:

Interpret Algerian expressions such as:

- "15 ميل دينار" → 15000 DZD
- "20 ميل" → 20000 DZD
- "500 دينار" → 500 DZD
- "2000 رينار" → 2000 DZD

Do not confuse "ميل" with the number 1 or with a currency.

Important rule about multiple expenses:

A user's sentence may describe general spending or multiple
financial situations without giving a specific amount.

Do not invent separate transactions or amounts when they are
not explicitly provided.

For example, if the user says they spent money on rent and
household expenses but gives no amount, do not invent an
amount. Use amount = 0 and confidence = "low".

Return ONLY valid JSON.

Do not include:

- Markdown
- Code fences
- Explanations
- Comments
- Additional text before or after the JSON

The JSON must follow exactly this schema:

{
  "type": "income" | "expense" | "none",
  "amount": number,
  "currency": "DZD",
  "category": string,
  "confidence": "high" | "low",
  "original_text": string
}

The "original_text" field must contain the user's input
exactly as received. Do not translate, correct, normalize,
or rewrite it.
"""


TEST_TRANSCRIPTS = [
    "خلصت 3000 دينار على l'électricité",

    "شريت matériel للدار ب 4500 دينار",

    "صرفـت شوية دراهم على الدار",

    "ما نيش عارف شحال صرفت",

    "عندي 5000 دينار",
]


def extract_financial_data(text):
    response = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        temperature=0,
        messages=[
            {
                "role": "system",
                "content": SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": text,
            },
        ],
    )

    content = response.choices[0].message.content

    return json.loads(content)


print("=" * 70)
print("GROQ FINANCIAL EXTRACTION TEST")
print("=" * 70)

for i, transcript in enumerate(TEST_TRANSCRIPTS, start=1):

    print("\n" + "-" * 70)
    print(f"TEST {i}")
    print("-" * 70)

    print("ASR:")
    print(transcript)

    try:
        result = extract_financial_data(transcript)

        print("\nGROQ JSON:")
        print(json.dumps(
            result,
            ensure_ascii=False,
            indent=2
        ))

    except Exception as e:

        print("\nERROR:")
        print(type(e).__name__)
        print(str(e))