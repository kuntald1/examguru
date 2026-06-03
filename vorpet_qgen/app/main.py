"""
Vorpet Question Paper Generator — FastAPI
Pipeline: Claude Vision OCR → Claude Haiku LLM → Claude Haiku Translate → PDF
Phase 3: Full Claude pipeline replacing Bhashini + BharatGen
"""

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn, os, uuid, json
from pathlib import Path

from app.services.ocr_service       import extract_text_from_images
from app.services.llm_service       import generate_questions
from app.services.translate_service import translate_questions
from app.services.pdf_service       import generate_pdf

# ── Phase 2 imports ───────────────────────────────────────────
from app.services.db_service import connect_db, disconnect_db
from app.routers.exam_router import router as exam_router
# ── Phase 3 imports ───────────────────────────────────────────
from app.routers.auth_router      import router as auth_router
from app.services.auth_service    import decode_token
from app.services.quota_service   import check_quota, record_usage, get_current_usage
# ─────────────────────────────────────────────────────────────

app = FastAPI(title="Vorpet Question Generator")

app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])

# ── Phase 2: DB lifecycle + router ───────────────────────────
app.add_event_handler("startup",  connect_db)
app.add_event_handler("shutdown", disconnect_db)
app.include_router(exam_router)
# ── Phase 3: Auth router ──────────────────────────────────────
app.include_router(auth_router)
# ── Phase 3: Superadmin router ────────────────────────────────
from app.routers.superadmin_router import router as superadmin_router
app.include_router(superadmin_router)
# ── Phase 4: Billing + Export ─────────────────────────────────
from app.routers.billing_router import router as billing_router
from app.routers.export_router  import router as export_router
from app.routers.teacher_router import router as teacher_router
from app.routers.call_router    import router as call_router
from app.routers.notify_router  import router as notify_router
app.include_router(billing_router)
app.include_router(export_router)
app.include_router(teacher_router)
app.include_router(call_router)
app.include_router(notify_router)
# ─────────────────────────────────────────────────────────────

app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")
app.mount("/static",  StaticFiles(directory="static"),  name="static")


# ════════════════════════════════════════════════════════════════
# PHASE 1 ENDPOINTS — UNCHANGED
# ════════════════════════════════════════════════════════════════

@app.post("/api/generate")
async def generate(
    request: Request,
    images:      list[UploadFile] = File(...),
    marks_1:     int  = Form(5),
    marks_5:     int  = Form(3),
    language:    str  = Form("bengali"),
    school_name: str  = Form(""),
    class_name:  str  = Form("Class VIII"),
    subject:     str  = Form("গণিত"),
    patterns_json: str = Form(""),   # JSON string of pattern array
    duration_minutes: int = Form(90),
):
    job_id = str(uuid.uuid4())[:8]
    paths  = []

    # Parse patterns
    patterns = None
    if patterns_json:
        try:
            patterns = json.loads(patterns_json)
        except Exception:
            patterns = None

    # ── Phase 3: Quota check ──────────────────────────────────
    institute_id = None
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        payload = decode_token(auth.split(" ", 1)[1])
        if payload:
            institute_id = int(payload["sub"])
            requested_qs = sum(p["total"] for p in patterns) if patterns else (marks_1 + marks_5)
            allowed, usage = await check_quota(institute_id, requested_qs)
            if not allowed:
                raise HTTPException(429, {
                    "error": "quota_exceeded",
                    "message": f"Monthly limit reached. Your {usage['plan'].title()} plan allows {usage['limit']} questions/month. Used: {usage['used']}, Remaining: {usage['remaining']}.",
                    "usage": usage,
                })
    # ─────────────────────────────────────────────────────────
    job_id = str(uuid.uuid4())[:8]
    paths  = []

    # Save uploaded images
    for img in images:
        ext  = Path(img.filename).suffix or ".jpg"
        path = f"uploads/{job_id}_{len(paths)}{ext}"
        with open(path, "wb") as f:
            f.write(await img.read())
        paths.append(path)

    try:
        # Step 1 — Claude Vision OCR
        text = await extract_text_from_images(paths, language)
        if not text.strip():
            raise HTTPException(400, "OCR returned empty text. Check image quality.")

        # Normalize fractions in OCR output before sending to LLM
        from app.services.llm_service import normalize_fracs
        text = normalize_fracs(text)

        # Step 2 — Claude Haiku LLM
        questions = await generate_questions(text, marks_1, marks_5, language, patterns=patterns)

        # Normalize fractions in generated questions for PDF
        for q in questions.get("marks_1_questions", []):
            q["question"] = normalize_fracs(q.get("question",""))
        for q in questions.get("marks_5_questions", []):
            q["question"] = normalize_fracs(q.get("question",""))

        # Step 3 — Claude Haiku Translate (only if Hindi or English needed)
        if language != "bengali":
            questions = await translate_questions(questions, language)

        # Step 4 — PDF
        pdf_path = await generate_pdf(
            questions, school_name, class_name, subject, language, job_id,
            duration_minutes=duration_minutes
        )

        # ── Phase 3: Record usage ─────────────────────────────
        actual_qs = len(questions.get("marks_1_questions", [])) + len(questions.get("marks_5_questions", []))
        if institute_id:
            await record_usage(institute_id, actual_qs)
        # ─────────────────────────────────────────────────────

        return JSONResponse({
            "success":   True,
            "pdf_url":   f"/outputs/{Path(pdf_path).name}",
            "questions": questions,
            "text":      text[:500],
        })

    finally:
        for p in paths:
            try: os.remove(p)
            except: pass


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "pipeline": "Claude Vision OCR → Claude Haiku LLM → Claude Haiku Translate → PDF",
        "phase2": "PostgreSQL connected",
        "phase3": "Claude API active"
    }


@app.get("/api/usage")
async def get_usage(request: Request):
    """Return current month question usage + plan limits for authenticated institute"""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return JSONResponse({"used": 0, "limit": 0, "remaining": 0, "plan": "unknown"})
    payload = decode_token(auth.split(" ", 1)[1])
    if not payload:
        return JSONResponse({"used": 0, "limit": 0, "remaining": 0, "plan": "unknown"})
    usage = await get_current_usage(int(payload["sub"]))
    return JSONResponse(usage)


@app.post("/api/pdf-direct")
async def pdf_direct(
    language:        str = Form("bengali"),
    school_name:     str = Form(""),
    class_name:      str = Form("Class VIII"),
    subject:         str = Form("গণিত"),
    questions_json:  str = Form("{}"),
    include_answers: str = Form("0"),
    duration_minutes: int = Form(90),
):
    """Generate PDF directly from provided questions — NO LLM call, fast!
    If include_answers=1, calls LLM to generate answers and includes them."""
    job_id = str(uuid.uuid4())[:8]
    print(f"PDF_DIRECT dur={duration_minutes}", flush=True)
    try:
        raw = json.loads(questions_json)
    except Exception:
        raise HTTPException(400, "Invalid questions_json")

    from app.services.llm_service import normalize_fracs

    def restore_frac(text):
        if not text: return text
        text = normalize_fracs(text)
        text = text.replace("²","^2").replace("³","^3").replace("⁴","^4")
        return text

    def get_text(q):
        return q.get("question") or q.get("question_text") or ""

    # Handle both formats
    if isinstance(raw, dict):
        questions = {}
        for key, qlist in raw.items():
            if key.endswith("_questions") and isinstance(qlist, list):
                marks_val = int(key.split("_")[1])
                normalized = []
                for i, q in enumerate(qlist):
                    normalized.append({
                        "number": i + 1,
                        "question": restore_frac(get_text(q) if isinstance(q, dict) else str(q)),
                        "marks": q.get("marks", marks_val) if isinstance(q, dict) else marks_val,
                        "type": q.get("type", "subjective") if isinstance(q, dict) else "subjective",
                        "total": q.get("total", len(qlist)) if isinstance(q, dict) else len(qlist),
                        "attempt": q.get("attempt", len(qlist)) if isinstance(q, dict) else len(qlist),
                        "section_label": q.get("section_label", "") if isinstance(q, dict) else "",
                        "attempt_instruction": q.get("attempt_instruction", "") if isinstance(q, dict) else "",
                    })
                questions[key] = normalized
    else:
        marks_1 = []
        for i, q in enumerate(raw if isinstance(raw, list) else []):
            marks_1.append({
                "number": i + 1,
                "question": restore_frac(get_text(q) if isinstance(q, dict) else str(q)),
                "marks": q.get("marks", 1) if isinstance(q, dict) else 1,
                "type": "short",
                "total": len(raw),
                "attempt": len(raw),
                "section_label": "",
                "attempt_instruction": "",
            })
        questions = {"marks_1_questions": marks_1}

    # Generate answers via LLM if requested
    if include_answers == "1":
        try:
            import anthropic as _anthropic
            client = _anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
            lang_map = {
                "bengali": "Bengali (বাংলা)", "hindi": "Hindi (हिंदी)",
                "english": "English", "tamil": "Tamil (தமிழ்)",
                "telugu": "Telugu (తెలుగు)", "kannada": "Kannada (ಕನ್ನಡ)",
                "malayalam": "Malayalam (മലയാളം)", "marathi": "Marathi (मराठी)",
            }
            lang_name = lang_map.get(language, "Bengali (বাংলা)")

            # Process each section separately to avoid numbering conflicts
            for key in sorted(questions.keys()):
                qlist = questions[key]
                if not qlist:
                    continue
                marks_val = int(key.split("_")[1])

                # Set length instruction based on marks
                if marks_val == 1:
                    length_instr = "1 sentence only. Maximum 15 words. Very short."
                elif marks_val == 2:
                    length_instr = "2-3 sentences. About 30-40 words."
                elif marks_val == 3:
                    length_instr = "3-4 sentences covering all key points. About 60-80 words."
                elif marks_val == 4:
                    length_instr = "4-5 sentences with explanation and examples. About 80-100 words."
                else:  # 5+ marks
                    length_instr = "Detailed answer with all major points, examples and explanation. About 120-150 words."

                # Build question list for this section
                qs_text = "\n".join([
                    f"Q{q['number']}: {q['question']}"
                    for q in qlist
                ])

                prompt = f"""You are an expert teacher. Write answers for {marks_val}-mark exam questions in {lang_name}.

ANSWER LENGTH: {length_instr}
Write answers appropriate for {marks_val} marks — not more, not less.

Questions:
{qs_text}

Return ONLY valid JSON. Keys must be "Q1", "Q2" etc:
{{{", ".join([f'"Q{q["number"]}": "answer here"' for q in qlist])}}}"""

                response = client.messages.create(
                    model="claude-haiku-4-5",
                    max_tokens=2000,
                    messages=[{"role": "user", "content": prompt}]
                )
                raw_ans = response.content[0].text.strip()
                raw_ans = raw_ans.replace("```json","").replace("```","").strip()

                try:
                    answers = json.loads(raw_ans)
                    for q in qlist:
                        q["answer"] = answers.get(f"Q{q['number']}", "")
                except Exception:
                    # If JSON fails, leave answers empty for this section
                    pass

        except Exception as e:
            print(f"[Answer generation] Failed: {e}")

    pdf_path = await generate_pdf(
        questions, school_name, class_name, subject, language, job_id,
        duration_minutes=duration_minutes
    )
    return JSONResponse({
        "success": True,
        "pdf_url": f"/outputs/{Path(pdf_path).name}",
    })


@app.post("/api/generate-mcq-options")
async def generate_mcq_options(
    question_text: str = Form(...),
    language: str = Form("bengali"),
):
    """Generate MCQ options using Claude Haiku — works for math and general questions"""
    import anthropic as _anthropic
    import json as _json, re

    client = _anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    lang_map = {
        "bengali": "Bengali (বাংলা)", "hindi": "Hindi (हिंदी)",
        "english": "English", "tamil": "Tamil (தமிழ்)",
    }
    lang_name = lang_map.get(language, "Bengali (বাংলা)")

    prompt = f"""You are an expert teacher. Create 4 MCQ options for this question.

Question ({lang_name}): {question_text}

Instructions:
1. Read the question carefully — it may be math, science, geography, history, or any subject
2. Find/calculate the correct answer
3. Create 3 plausible but wrong options
4. For math: use nearby numbers as wrong options
5. For general/descriptive: use related but incorrect facts as wrong options  
6. Write ALL options in {lang_name} language
7. Place correct answer randomly as A, B, C, or D
8. Return ONLY valid JSON, no explanation

JSON format (write options in {lang_name}):
{{"correct_value": "correct answer text", "option_a": "option text", "option_b": "option text", "option_c": "option text", "option_d": "option text", "correct_answer": "B"}}"""

    try:
        response = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = response.content[0].text.strip()
        raw = re.sub(r'```json\s*', '', raw)
        raw = re.sub(r'```\s*', '', raw).strip()

        match = re.search(r'\{[^{}]*"option_a"[^{}]*\}', raw, re.DOTALL)
        if not match:
            match = re.search(r'\{[\s\S]*\}', raw)
        if not match:
            raise ValueError(f"No JSON: {raw[:200]}")

        data = _json.loads(match.group())
        correct = data.get("correct_answer", "A").strip().upper()
        if correct not in ("A","B","C","D"):
            correct = "A"

        # Cross-check: correct_answer must match correct_value
        correct_value = str(data.get("correct_value","")).strip()
        opts = {
            "A": str(data.get("option_a","")),
            "B": str(data.get("option_b","")),
            "C": str(data.get("option_c","")),
            "D": str(data.get("option_d","")),
        }
        if correct_value and opts.get(correct) != correct_value:
            for letter, val in opts.items():
                if val == correct_value:
                    correct = letter
                    break

        return JSONResponse({
            "success": True,
            "option_a": opts["A"], "option_b": opts["B"],
            "option_c": opts["C"], "option_d": opts["D"],
            "correct_answer": correct,
            "correct_value": correct_value,
        })
    except Exception as e:
        return JSONResponse({
            "success": False, "error": str(e),
            "option_a": "", "option_b": "", "option_c": "", "option_d": "",
            "correct_answer": "A",
        })


@app.post("/api/test")
async def test_pipeline(
    language:    str = Form("bengali"),
    school_name: str = Form("Test School"),
    class_name:  str = Form("Class VIII"),
    subject:     str = Form("গণিত"),
    marks_1:     int = Form(5),
    marks_5:     int = Form(3),
    patterns_json: str = Form(""),
):
    """Test pipeline without OCR — uses sample Bengali math text"""
    job_id = str(uuid.uuid4())[:8]

    # Parse patterns
    patterns = None
    if patterns_json:
        try:
            patterns = json.loads(patterns_json)
        except Exception:
            patterns = None

    sample_text = """
    অধ্যায় ১২ - বীজগাণিতিক সূত্রাবলী
    (vii) 2x + FRAC(1,x) = 5 হলে 4x^2 + FRAC(1,x^2) এর মান লিখি।
    (x) 2a + FRAC(1,3a) = 6 হলে 4a^2 + FRAC(1,9a^2) এর মান কত লিখি।
    (xi) 5a + FRAC(1,7a) = 5 হলে 25a^2 + FRAC(1,49a^2) এর মান কত লিখি।
    (xii) 2x - FRAC(1,x) = 4 হলে x^2 + FRAC(1,4x^2) এর মান লিখি।
    (xiii) m + FRAC(1,m) = -p হলে দেখাই যে m^2 + FRAC(1,m^2) = p^2 - 2
    (xiv) a^2 + b^2 = 5ab হলে দেখাই যে FRAC(a^2,b^2) + FRAC(b^2,a^2) = 23
    (xv) 6x^2 - 1 = 4x হলে দেখাই যে 36x^2 + FRAC(1,x^2) = 28
    """

    from app.services.llm_service import generate_questions
    from app.services.translate_service import translate_questions
    from app.services.pdf_service import generate_pdf

    questions = await generate_questions(sample_text, marks_1, marks_5, language, patterns=patterns)

    if language != "bengali":
        questions = await translate_questions(questions, language)

    pdf_path = await generate_pdf(
        questions, school_name, class_name, subject, language, job_id,
        duration_minutes=duration_minutes
    )

    return JSONResponse({
        "success": True,
        "pdf_url": f"/outputs/{Path(pdf_path).name}",
        "questions": questions,
    })


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
