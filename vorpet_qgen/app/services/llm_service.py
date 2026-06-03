"""
Vorpet LLM Service — Claude Haiku
Generates questions for any pattern: 1-mark, 3-mark, 5-mark etc.
Full pattern support: marks, total questions, attempt count
"""

import anthropic
import os
import json
import re


def normalize_fracs(text: str) -> str:
    """Convert all a/b patterns to FRAC(a,b) including complex denominators"""
    if not text:
        return text
    text = re.sub(r'\(([^)]+)²\)', r'(\1)^2', text)
    text = re.sub(r'\(([^)]+)³\)', r'(\1)^3', text)
    text = text.replace('।', '').replace('\u0964', '')
    text = text.replace('²','^2').replace('³','^3').replace('⁴','^4')
    text = re.sub(
        r'([a-zA-Z0-9]+)\s*/\s*(\([^)]+\)(?:\^[234])?)',
        lambda m: f'FRAC({m.group(1)},{m.group(2)})',
        text
    )
    text = re.sub(
        r'(\d+)\s*/\s*([a-zA-Z][a-zA-Z0-9]*-[0-9]+(?:\^[234])?)',
        lambda m: f'FRAC({m.group(1)},{m.group(2)})',
        text
    )
    tok = r'[a-zA-Z0-9][a-zA-Z0-9\^]*'
    prev = None
    while prev != text:
        prev = text
        result = []
        last = 0
        for m in re.finditer(rf'({tok})\s*/\s*({tok})', text):
            before = text[max(0, m.start()-5):m.start()]
            if 'FRAC(' in before:
                continue
            result.append(text[last:m.start()])
            result.append(f'FRAC({m.group(1)},{m.group(2)})')
            last = m.end()
        result.append(text[last:])
        text = ''.join(result)
    return text


# Instruction phrases for "attempt any N" in each language
ATTEMPT_PHRASES = {
    "bengali":   "যেকোনো {n}টি প্রশ্নের উত্তর দাও",
    "hindi":     "कोई भी {n} प्रश्नों के उत्तर दें",
    "english":   "Answer any {n} of the following questions",
    "tamil":     "எந்த {n} கேள்விகளுக்கும் பதிலளிக்கவும்",
    "telugu":    "ఏవైనా {n} ప్రశ్నలకు సమాధానం ఇవ్వండి",
    "kannada":   "ಯಾವುದಾದರೂ {n} ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಿಸಿ",
    "malayalam": "ഏതെങ്കിലും {n} ചോദ്യങ്ങൾക്ക് ഉത்தரിക്കുക",
    "marathi":   "कोणत्याही {n} प्रश्नांची उत्तरे द्या",
    "gujarati":  "કોઈ પણ {n} પ્રશ્નોના ઉત્તર આપો",
    "odia":      "ଯେକୌଣସି {n}ଟି ପ୍ରଶ୍ନର ଉତ୍ତର ଦିଅ",
}

SECTION_LABELS = {
    "bengali":  ["ক", "খ", "গ", "ঘ", "ঙ"],
    "hindi":    ["अ", "ब", "स", "द", "इ"],
    "english":  ["A", "B", "C", "D", "E"],
    "tamil":    ["அ", "ஆ", "இ", "ஈ", "உ"],
    "telugu":   ["అ", "ఆ", "ఇ", "ఈ", "ఉ"],
}

SECTION_NAMES = {
    "bengali":  "বিভাগ",
    "hindi":    "खंड",
    "english":  "Section",
    "tamil":    "பிரிவு",
    "telugu":   "విభాగం",
    "kannada":  "ವಿಭಾಗ",
    "malayalam": "വിഭാഗം",
    "marathi":  "विभाग",
    "gujarati": "વિભાગ",
    "odia":     "ବିଭାଗ",
}

MARKS_WORD = {
    "bengali":  "নম্বর",
    "hindi":    "अंक",
    "english":  "marks",
    "tamil":    "மதிப்பெண்",
    "telugu":   "మార్కులు",
    "kannada":  "ಅಂಕ",
    "malayalam": "മാർക്ക്",
    "marathi":  "गुण",
    "gujarati": "ગુણ",
    "odia":     "ନମ୍ବର",
}


def get_attempt_phrase(language: str, n: int) -> str:
    phrase = ATTEMPT_PHRASES.get(language, ATTEMPT_PHRASES["english"])
    return phrase.format(n=n)


def get_section_label(language: str, index: int) -> str:
    labels = SECTION_LABELS.get(language, SECTION_LABELS["english"])
    if index < len(labels):
        return labels[index]
    return chr(65 + index)  # A, B, C...


async def generate_questions(
    text: str,
    marks_1_count: int = 5,
    marks_5_count: int = 3,
    language: str = "bengali",
    patterns: list = None,
) -> dict:
    """
    Generate exam questions for any pattern.
    patterns = [{"marks": 1, "total": 4, "attempt": 3}, ...]
    """
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    lang_map = {
        "bengali": "Bengali (বাংলা)", "hindi": "Hindi (हिंदी)",
        "english": "English", "tamil": "Tamil (தமிழ்)",
        "telugu": "Telugu (తెలుగు)", "kannada": "Kannada (ಕನ್ನಡ)",
        "malayalam": "Malayalam (മലയാളം)", "marathi": "Marathi (मराठी)",
        "gujarati": "Gujarati (ગુજરાતી)", "odia": "Odia (ଓଡ଼ିଆ)",
    }
    lang_name = lang_map.get(language, "Bengali (বাংলা)")
    text = text[:3000]

    # Build pattern-based prompt
    if patterns and len(patterns) > 0:
        sections_desc = ""
        expected_keys = []
        for i, p in enumerate(patterns):
            marks = int(p["marks"])
            total = int(p["total"])
            attempt = int(p["attempt"])
            label = get_section_label(language, i)
            key = f"marks_{marks}_questions"
            expected_keys.append(key)
            attempt_phrase = get_attempt_phrase(language, attempt)
            sections_desc += f"- JSON key \"{key}\": Generate exactly {total} questions, each worth {marks} mark(s). Attempt: {attempt}. Instruction: \"{attempt_phrase}\"\n"

        # Build example JSON structure
        example_json = "{\n"
        for i, p in enumerate(patterns):
            marks = int(p["marks"])
            total = int(p["total"])
            attempt = int(p["attempt"])
            label = get_section_label(language, i)
            key = f"marks_{marks}_questions"
            attempt_phrase = get_attempt_phrase(language, attempt)
            example_json += f'  "{key}": [\n'
            for n in range(1, total+1):
                comma = "," if n < total else ""
                example_json += f'    {{"number": {n}, "question": "question text in {lang_name}", "marks": {marks}, "type": "subjective", "total": {total}, "attempt": {attempt}, "section_label": "{label}", "attempt_instruction": "{attempt_phrase}"}}{comma}\n'
            comma = "," if i < len(patterns)-1 else ""
            example_json += f'  ]{comma}\n'
        example_json += "}"

        prompt = f"""You are an expert exam question generator for Indian school students.

SOURCE TEXT ({lang_name}):
{text}

Generate exam questions based on this text. Use EXACTLY these JSON keys:
{sections_desc}

CRITICAL RULES:
1. Return ONLY valid JSON — no markdown, no explanation
2. Use EXACTLY the key names shown above (marks_1_questions, marks_3_questions etc.)
3. Generate EXACTLY the number of questions specified per key
4. Write ALL question text in {lang_name} language
5. Keep total, attempt, section_label, attempt_instruction exactly as specified
6. Use FRAC(n,d) for fractions, ^ for powers

Return this EXACT JSON structure (fill in real questions):
{example_json}"""

    else:
        # Legacy 2-section mode
        prompt = f"""You are an expert exam question generator for Indian school students.

SOURCE TEXT ({lang_name}):
{text}

Generate exactly {marks_1_count} short questions (1 mark each) and {marks_5_count} long questions (5 marks each).
Write ALL questions in {lang_name}. Use FRAC(n,d) for fractions.

Return ONLY this JSON:
{{
  "marks_1_questions": [
    {{"number": 1, "question": "...", "marks": 1, "type": "short", "total": {marks_1_count}, "attempt": {marks_1_count}, "section_label": "ক", "attempt_instruction": ""}}
  ],
  "marks_5_questions": [
    {{"number": 1, "question": "...", "marks": 5, "type": "long", "total": {marks_5_count}, "attempt": {marks_5_count}, "section_label": "খ", "attempt_instruction": ""}}
  ]
}}"""

    response = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=3000,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = response.content[0].text.strip()
    raw = re.sub(r'```json\s*', '', raw)
    raw = re.sub(r'```\s*', '', raw).strip()

    try:
        data = json.loads(raw)
        # Normalize all question text
        for key in list(data.keys()):
            if key.endswith("_questions"):
                marks_val = int(key.split("_")[1])
                for i, q in enumerate(data[key]):
                    q["number"] = i + 1
                    q["marks"] = marks_val
                    q["question"] = normalize_fracs(q.get("question", ""))
                    # Ensure attempt fields exist
                    if "total" not in q:
                        q["total"] = len(data[key])
                    if "attempt" not in q:
                        q["attempt"] = q["total"]
                    if "attempt_instruction" not in q:
                        q["attempt_instruction"] = get_attempt_phrase(language, q["attempt"])
                    if "section_label" not in q:
                        q["section_label"] = "A"
        # Filter out empty/blank questions
        for key in list(data.keys()):
            if key.endswith("_questions"):
                data[key] = [
                    q for q in data[key]
                    if q.get("question","").strip() and
                       q.get("question","").strip() not in ["","question text","Edit raw text here..."]
                ]
        return data
    except json.JSONDecodeError:
        return {
            "marks_1_questions": [],
            "marks_5_questions": []
        }
