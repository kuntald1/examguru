"""
Vorpet Translate Service — Claude Haiku
Replaces Bhashini Translate (was pending approval)
Translates questions between Indian languages preserving math notation
"""

import anthropic
import os
import json
import re


async def translate_questions(questions: dict, target_language: str) -> dict:
    """
    Translate questions to target language.
    Preserves FRAC() notation and mathematical expressions exactly.
    """
    if target_language == "bengali":
        return questions  # Already in Bengali

    client = anthropic.Anthropic(
        api_key=os.getenv("ANTHROPIC_API_KEY")
    )

    lang_map = {
        "hindi": "Hindi (हिंदी)",
        "english": "English",
        "tamil": "Tamil (தமிழ்)",
        "telugu": "Telugu (తెలుగు)",
        "kannada": "Kannada (ಕನ್ನಡ)",
        "malayalam": "Malayalam (മലയാളം)",
        "marathi": "Marathi (मराठी)",
        "gujarati": "Gujarati (ગુ��રાતી)",
        "odia": "Odia (ଓଡ଼ିଆ)",
    }
    lang_name = lang_map.get(target_language, target_language)

    all_questions = (
        questions.get("marks_1_questions", []) +
        questions.get("marks_5_questions", [])
    )

    if not all_questions:
        return questions

    # Build translation prompt
    q_list = json.dumps(
        [{"number": q["number"], "question": q["question"], "marks": q["marks"]}
         for q in all_questions],
        ensure_ascii=False
    )

    prompt = f"""Translate these exam questions to {lang_name}.

CRITICAL RULES:
1. Translate ONLY the Bengali/language words — NOT math symbols
2. Keep FRAC(a,b) notation EXACTLY as-is — do not translate
3. Keep ^2, ^3 notation EXACTLY as-is
4. Keep variable names (x, a, b, m, n) EXACTLY as-is
5. Keep numbers EXACTLY as-is
6. Translate naturally for school students

Questions to translate:
{q_list}

Return ONLY JSON array (no other text):
[
  {{"number": 1, "question": "translated question", "marks": 1}},
  {{"number": 2, "question": "translated question", "marks": 5}}
]"""

    response = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = response.content[0].text.strip()
    raw = re.sub(r'```json\s*', '', raw)
    raw = re.sub(r'```\s*', '', raw).strip()

    try:
        translated = json.loads(raw)
        # Map back to original structure
        trans_map = {t["number"]: t["question"] for t in translated}

        result = {"marks_1_questions": [], "marks_5_questions": []}

        for q in questions.get("marks_1_questions", []):
            result["marks_1_questions"].append({
                **q,
                "question": trans_map.get(q["number"], q["question"])
            })

        for q in questions.get("marks_5_questions", []):
            result["marks_5_questions"].append({
                **q,
                "question": trans_map.get(q["number"], q["question"])
            })

        return result

    except Exception:
        return questions  # Return original if translation fails
