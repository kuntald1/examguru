"""
Vorpet OCR Service — Claude Vision
Replaces Bhashini OCR (was pending approval)
Extracts text from textbook images in any Indian language
"""

import anthropic
import base64
import os
from pathlib import Path


def _encode_image(path: str) -> tuple[str, str]:
    """Encode image to base64 and detect media type"""
    suffix = Path(path).suffix.lower()
    media_map = {
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".png": "image/png", ".gif": "image/gif",
        ".webp": "image/webp"
    }
    media_type = media_map.get(suffix, "image/jpeg")
    with open(path, "rb") as f:
        data = base64.standard_b64encode(f.read()).decode("utf-8")
    return data, media_type


async def extract_text_from_images(image_paths: list[str], language: str = "bengali") -> str:
    """
    Extract text from textbook images using Claude Vision.
    Returns clean text preserving mathematical notation with FRAC() format.
    """
    client = anthropic.Anthropic(
        api_key=os.getenv("ANTHROPIC_API_KEY")
    )

    lang_map = {
        "bengali": "Bengali (বাংলা)",
        "hindi": "Hindi (हिंदी)",
        "english": "English",
        "tamil": "Tamil (தமிழ்)",
        "telugu": "Telugu (తెలుగు)",
        "kannada": "Kannada (ಕನ್ನಡ)",
        "malayalam": "Malayalam (മലയാളം)",
        "marathi": "Marathi (मराठी)",
        "gujarati": "Gujarati (ગુજરાતી)",
        "odia": "Odia (ଓଡ଼ିଆ)",
    }
    lang_name = lang_map.get(language, "Bengali (বাংলা)")

    # Build content with all images
    content = []
    for path in image_paths:
        try:
            data, media_type = _encode_image(path)
            content.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": media_type,
                    "data": data,
                }
            })
        except Exception as e:
            print(f"Error encoding image {path}: {e}")
            continue

    if not content:
        return ""

    content.append({
        "type": "text",
        "text": f"""Extract all text from this textbook image. The text is in {lang_name}.

CRITICAL FRACTION RULES — apply to EVERY fraction you see:
- ANY expression with a numerator OVER a denominator (fraction bar) → FRAC(numerator,denominator)
- x/y → FRAC(x,y)
- x³/y³ → FRAC(x^3,y^3)
- y³/x³ → FRAC(y^3,x^3)
- 1/x → FRAC(1,x)
- 1/x² → FRAC(1,x^2)
- 1/3a → FRAC(1,3a)
- a²/b² → FRAC(a^2,b^2)
- b²/a² → FRAC(b^2,a^2)
- 4a³ → 4a^3 (exponent with ^)

RULES:
1. Preserve original {lang_name} words exactly
2. EVERY fraction must use FRAC(top,bottom) — no exceptions
3. Powers use ^ notation: x² → x^2, x³ → x^3, a³ → a^3
4. Keep question numbers exactly: (i), (ii), (vii) etc.
5. Extract ALL visible text
6. Output extracted text ONLY — no explanation

Examples of correct output:
- "যদি FRAC(x,y) + FRAC(y,x) = 3 হলে FRAC(x^3,y^3) + FRAC(y^3,x^3) এর মান কত?"
- "যদি 2x + FRAC(1,x) = 5 হলে 4x^2 + FRAC(1,x^2) এর মান নির্ণয় করো।"
- "যদি 2a + FRAC(1,3a) = 6 হলে 4a^3 + FRAC(1,27a^3) এর মান নির্ণয় করো।"

Output the extracted text only."""
    })

    response = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=2000,
        messages=[{"role": "user", "content": content}]
    )

    return response.content[0].text.strip()
