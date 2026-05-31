"""
Vorpet Phase 2 + 3 — Exam Router
All Phase 2 endpoints — admin + student exam portal
Phase 3: Admin routes now require JWT (institute isolation via institute_id)
Existing Phase 1 endpoints (main.py) are NOT touched
"""

from fastapi import APIRouter, HTTPException, Form, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
import datetime, json
from decimal import Decimal

from app.services.db_service import (
    create_exam, get_exam, list_exams, update_exam_status,
    add_question, get_questions, get_questions_for_student,
    create_student, get_student, list_students,
    create_exam_access, get_access_by_code, mark_access_used,
    list_access_for_exam,
    save_response, get_responses,
    save_result, get_result, get_exam_results,
    log_security_event, get_security_log,
    # Batch system
    create_batch, list_batches, get_batch, add_student_to_batch,
    remove_student_from_batch, get_batch_students,
    assign_exam_to_batch, get_exams_for_batch, get_batches_for_exam,
    student_login, set_student_password,
    get_or_create_exam_session, get_batch_results,
)

# Phase 3 — JWT dependency
from app.dependencies import get_current_institute

router = APIRouter(prefix="/api/v2", tags=["Phase 2+3 — OMR Exam"])


def safe_dict(row) -> dict:
    """Convert a DB row to a JSON-serializable dict (handles datetime, Decimal)"""
    if row is None:
        return {}
    out = {}
    for k, v in dict(row).items():
        if isinstance(v, (datetime.datetime, datetime.date)):
            out[k] = v.isoformat()
        elif isinstance(v, Decimal):
            out[k] = float(v)
        else:
            out[k] = v
    return out


def safe_list(rows) -> list:
    return [safe_dict(r) for r in rows]



# ═══════════════════════════════════════════════════════════════
# PYDANTIC MODELS
# ═══════════════════════════════════════════════════════════════

class QuestionIn(BaseModel):
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_answer: str       # A, B, C, or D
    marks: int = 1
    negative_marks: float = 0.0

class ExamCreateIn(BaseModel):
    school_name: str
    class_name: str
    subject: str
    language: str = "bengali"
    duration_minutes: int = 60
    questions: List[QuestionIn]

class StudentIn(BaseModel):
    name: str
    roll_no: str = ""
    batch: str = ""
    school_name: str = ""
    email: str = ""
    phone: str = ""
    admission_date: str = ""  # YYYY-MM-DD

class AssignStudentsIn(BaseModel):
    exam_id: int
    student_ids: List[int]
    expires_hours: Optional[int] = 24  # code valid for 24h by default

class AnswerIn(BaseModel):
    question_id: int
    selected_answer: Optional[str] = None  # None = skipped

class SubmitExamIn(BaseModel):
    access_code: str
    answers: List[AnswerIn]
    time_taken_seconds: int = 0
    auto_submitted: bool = False

class SecurityEventIn(BaseModel):
    access_code: str
    event_type: str   # tab_switch | fullscreen_exit | auto_submit


# ═══════════════════════════════════════════════════════════════
# ADMIN — EXAM MANAGEMENT
# ═══════════════════════════════════════════════════════════════

@router.post("/exam/create")
async def api_create_exam(
    payload: ExamCreateIn,
    institute: dict = Depends(get_current_institute),
):
    """Admin creates an MCQ exam with questions"""
    if not payload.questions:
        raise HTTPException(400, "At least one question is required")

    for q in payload.questions:
        if q.correct_answer.upper() not in ("A", "B", "C", "D"):
            raise HTTPException(400, f"correct_answer must be A/B/C/D, got: {q.correct_answer}")

    total_marks = sum(q.marks for q in payload.questions)
    iid = institute["id"]

    exam_id = await create_exam(
        school_name=payload.school_name,
        class_name=payload.class_name,
        subject=payload.subject,
        language=payload.language,
        duration_minutes=payload.duration_minutes,
        total_marks=total_marks,
        institute_id=iid,
    )

    for i, q in enumerate(payload.questions, start=1):
        await add_question(
            exam_id=exam_id,
            question_no=i,
            question_text=q.question_text,
            option_a=q.option_a,
            option_b=q.option_b,
            option_c=q.option_c,
            option_d=q.option_d,
            correct_answer=q.correct_answer,
            marks=q.marks,
            negative_marks=q.negative_marks
        )

    return JSONResponse({
        "success": True,
        "exam_id": exam_id,
        "total_questions": len(payload.questions),
        "total_marks": total_marks,
        "message": f"Exam created with {len(payload.questions)} questions"
    })


@router.get("/exam/list")
async def api_list_exams(institute: dict = Depends(get_current_institute)):
    """Admin — list all exams for this institute"""
    rows = await list_exams(institute_id=institute["id"])
    return JSONResponse({"exams": safe_list(rows)})


@router.get("/exam/{exam_id}")
async def api_get_exam(exam_id: int, institute: dict = Depends(get_current_institute)):
    """Admin — get exam details with questions"""
    exam = await get_exam(exam_id, institute_id=institute["id"])
    if not exam:
        raise HTTPException(404, "Exam not found")
    questions = await get_questions(exam_id)
    return JSONResponse({
        "exam": safe_dict(exam),
        "questions": safe_list(questions)
    })


@router.post("/exam/{exam_id}/activate")
async def api_activate_exam(exam_id: int, institute: dict = Depends(get_current_institute)):
    """Admin — make exam live (students can now take it)"""
    exam = await get_exam(exam_id, institute_id=institute["id"])
    if not exam:
        raise HTTPException(404, "Exam not found")
    await update_exam_status(exam_id, "active")
    return JSONResponse({"success": True, "status": "active"})


@router.post("/exam/{exam_id}/close")
async def api_close_exam(exam_id: int, institute: dict = Depends(get_current_institute)):
    """Admin — close exam (no more submissions)"""
    await update_exam_status(exam_id, "closed")
    return JSONResponse({"success": True, "status": "closed"})


# ═══════════════════════════════════════════════════════════════
# ADMIN — STUDENT MANAGEMENT
# ═══════════════════════════════════════════════════════════════

@router.post("/student/create")
async def api_create_student(
    payload: StudentIn,
    institute: dict = Depends(get_current_institute),
):
    """Admin — add a single student"""
    from app.services.db_service import database
    iid = institute["id"]
    try:
        await database.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS admission_date DATE")
    except: pass
    student_id = await create_student(
        name=payload.name, roll_no=payload.roll_no,
        batch=payload.batch, school_name=payload.school_name,
        email=payload.email, phone=payload.phone,
        institute_id=iid,
    )
    if payload.admission_date:
        from datetime import date
        try:
            adm = date.fromisoformat(payload.admission_date)
            await database.execute(
                "UPDATE students SET admission_date=:d WHERE id=:id",
                values={"d": adm, "id": student_id}
            )
        except: pass
    return JSONResponse({"success": True, "student_id": student_id})


@router.post("/student/bulk")
async def api_bulk_create_students(
    students: List[StudentIn],
    institute: dict = Depends(get_current_institute),
):
    """Admin — add multiple students at once"""
    iid = institute["id"]
    ids = []
    for s in students:
        sid = await create_student(
            name=s.name, roll_no=s.roll_no, batch=s.batch,
            school_name=s.school_name, email=s.email, phone=s.phone,
            institute_id=iid,
        )
        ids.append(sid)
    return JSONResponse({"success": True, "created": len(ids), "student_ids": ids})


@router.get("/student/list")
async def api_list_students(institute: dict = Depends(get_current_institute)):
    from app.services.db_service import database
    iid = institute["id"]
    try:
        await database.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS admission_date DATE")
    except: pass
    rows = await database.fetch_all("""
        SELECT s.*, bs.batch_id,
               b.name as batch_name, b.default_fee as batch_default_fee
        FROM students s
        LEFT JOIN batch_students bs ON bs.student_id = s.id
        LEFT JOIN batches b ON bs.batch_id = b.id
        WHERE s.institute_id = :iid
        ORDER BY s.name
    """, values={"iid": iid})
    seen = set()
    result = []
    for r in rows:
        if r['id'] in seen: continue
        seen.add(r['id'])
        d = {}
        for k in r._mapping.keys():
            v = r[k]
            d[k] = float(v) if type(v).__name__=='Decimal' else (str(v) if hasattr(v,'isoformat') else v)
        result.append(d)
    return JSONResponse({"students": result})


# ═══════════════════════════════════════════════════════════════
# ADMIN — ASSIGN EXAM ACCESS CODES
# ═══════════════════════════════════════════════════════════════

@router.post("/exam/assign")
async def api_assign_students(
    payload: AssignStudentsIn,
    institute: dict = Depends(get_current_institute),
):
    """Admin assigns students to an exam."""
    exam = await get_exam(payload.exam_id, institute_id=institute["id"])
    if not exam:
        raise HTTPException(404, "Exam not found")

    expires_at = None
    if payload.expires_hours:
        expires_at = datetime.datetime.utcnow() + datetime.timedelta(hours=payload.expires_hours)

    codes = []
    for student_id in payload.student_ids:
        student = await get_student(student_id)
        if not student:
            continue
        code = await create_exam_access(
            exam_id=payload.exam_id,
            student_id=student_id,
            expires_at=expires_at
        )
        codes.append({
            "student_id": student_id,
            "student_name": student["name"],
            "access_code": code,
            "expires_at": expires_at.isoformat() if expires_at else None
        })

    return JSONResponse({
        "success": True,
        "exam_id": payload.exam_id,
        "assigned": len(codes),
        "codes": codes
    })


@router.get("/exam/{exam_id}/codes")
async def api_get_exam_codes(exam_id: int, institute: dict = Depends(get_current_institute)):
    """Admin — see all student codes for an exam"""
    exam = await get_exam(exam_id, institute_id=institute["id"])
    if not exam:
        raise HTTPException(404, "Exam not found")
    rows = await list_access_for_exam(exam_id)
    return JSONResponse({"codes": safe_list(rows)})


# ═══════════════════════════════════════════════════════════════
# STUDENT — EXAM PORTAL
# ═══════════════════════════════════════════════════════════════

@router.get("/exam/join/{code}")
async def api_join_exam(code: str):
    """
    Student enters their unique code.
    Returns exam info + questions (WITHOUT correct answers).
    """
    access = await get_access_by_code(code.upper())
    if not access:
        raise HTTPException(404, "Invalid exam code. Please check and try again.")

    if access["exam_status"] == "draft":
        raise HTTPException(403, "This exam has not been activated yet. Please wait.")

    if access["exam_status"] == "closed":
        raise HTTPException(403, "This exam is closed. No more submissions allowed.")

    if access["expires_at"] and access["expires_at"] < datetime.datetime.utcnow():
        raise HTTPException(403, "Your exam code has expired.")

    if access["used"]:
        # Allow rejoining — return result instead
        result = await get_result(access["id"])
        if result:
            return JSONResponse({
                "already_submitted": True,
                "result": safe_dict(result)
            })

    # Mark as started
    await mark_access_used(access["id"])

    questions = await get_questions_for_student(access["exam_id"])

    return JSONResponse({
        "already_submitted": False,
        "access_id": access["id"],
        "exam": {
            "id": access["exam_id"],
            "school_name": access["school_name"],
            "class_name": access["class_name"],
            "subject": access["subject"],
            "language": access["language"],
            "duration_minutes": access["duration_minutes"],
            "total_marks": access["total_marks"],
        },
        "student_name": access["student_name"],
        "questions": safe_list(questions)
    })


@router.post("/exam/submit")
async def api_submit_exam(payload: SubmitExamIn):
    """
    Student submits their answers.
    Auto-evaluates against correct answers and saves result.
    """
    access = await get_access_by_code(payload.access_code.upper())
    if not access:
        raise HTTPException(404, "Invalid exam code")

    if access["exam_status"] == "closed":
        raise HTTPException(403, "Exam is closed")

    # Check if already submitted
    existing = await get_result(access["id"])
    if existing:
        return JSONResponse({"already_submitted": True, "result": safe_dict(existing)})

    # Get correct answers
    questions = await get_questions(access["exam_id"])
    q_map = {q["id"]: q for q in questions}

    total_correct = 0
    total_wrong = 0
    total_skipped = 0
    total_attempted = 0
    marks_obtained = 0.0

    for ans in payload.answers:
        q = q_map.get(ans.question_id)
        if not q:
            continue

        if ans.selected_answer:
            total_attempted += 1
            is_correct, marks_awarded = await save_response(
                exam_access_id=access["id"],
                question_id=ans.question_id,
                selected_answer=ans.selected_answer,
                correct_answer=q["correct_answer"],
                marks=q["marks"],
                negative_marks=float(q["negative_marks"])
            )
            if is_correct:
                total_correct += 1
            else:
                total_wrong += 1
            marks_obtained += marks_awarded
        else:
            total_skipped += 1
            await save_response(
                exam_access_id=access["id"],
                question_id=ans.question_id,
                selected_answer=None,
                correct_answer=q["correct_answer"],
                marks=q["marks"],
                negative_marks=0
            )

    total_marks = access["total_marks"]
    marks_obtained = max(0, marks_obtained)  # no negative total

    await save_result(
        exam_access_id=access["id"],
        total_attempted=total_attempted,
        total_correct=total_correct,
        total_wrong=total_wrong,
        total_skipped=total_skipped,
        marks_obtained=marks_obtained,
        total_marks=total_marks,
        auto_submitted=payload.auto_submitted,
        time_taken_seconds=payload.time_taken_seconds
    )

    percentage = round(marks_obtained / total_marks * 100, 2) if total_marks > 0 else 0

    return JSONResponse({
        "success": True,
        "result": {
            "student_name": access["student_name"],
            "total_questions": len(questions),
            "total_attempted": total_attempted,
            "total_correct": total_correct,
            "total_wrong": total_wrong,
            "total_skipped": total_skipped,
            "marks_obtained": marks_obtained,
            "total_marks": total_marks,
            "percentage": percentage,
            "auto_submitted": payload.auto_submitted,
        }
    })


@router.post("/exam/security")
async def api_security_event(payload: SecurityEventIn):
    """Log tab switch / fullscreen exit events"""
    access = await get_access_by_code(payload.access_code.upper())
    if not access:
        raise HTTPException(404, "Invalid code")
    await log_security_event(access["id"], payload.event_type)
    return JSONResponse({"logged": True})


# ═══════════════════════════════════════════════════════════════
# ADMIN — RESULTS DASHBOARD
# ═══════════════════════════════════════════════════════════════

@router.get("/public/results/{exam_id}")
async def api_public_exam_results(exam_id: int):
    """Public endpoint — rank list for student portal after exam submission"""
    from app.services.db_service import database
    rows = await database.fetch_all("""
        SELECT ea.id as exam_access_id, s.name as student_name,
               er.marks_obtained, er.total_marks, er.percentage,
               er.correct_answers, er.wrong_answers, er.skipped,
               er.time_taken_seconds, er.submitted_at, er.auto_submitted
        FROM exam_access ea
        JOIN students s ON s.id = ea.student_id
        LEFT JOIN exam_results er ON er.exam_access_id = ea.id
        WHERE ea.exam_id = :eid AND er.id IS NOT NULL
        ORDER BY er.marks_obtained DESC, er.time_taken_seconds ASC
    """, values={"eid": exam_id})
    return JSONResponse({"results": safe_list(rows)})

@router.get("/results/{exam_id}")
async def api_exam_results(exam_id: int, institute: dict = Depends(get_current_institute)):
    """Admin — full results for an exam with batch info"""
    from app.services.db_service import database
    exam = await get_exam(exam_id, institute_id=institute["id"])
    if not exam:
        raise HTTPException(404, "Exam not found")

    rows = await database.fetch_all("""
        SELECT
            er.id as result_id,
            er.exam_access_id,
            er.marks_obtained,
            er.total_marks,
            er.percentage,
            er.total_correct,
            er.total_wrong,
            er.total_skipped,
            er.auto_submitted,
            er.time_taken_seconds,
            s.name as student_name,
            s.roll_no,
            b.id as batch_id,
            b.name as batch,
            b.class_name as batch_class
        FROM exam_results er
        JOIN exam_access ea ON er.exam_access_id = ea.id
        JOIN students s ON ea.student_id = s.id
        LEFT JOIN batch_students bs ON bs.student_id = s.id
        LEFT JOIN batches b ON bs.batch_id = b.id
        WHERE ea.exam_id = :exam_id
        ORDER BY er.percentage DESC, er.marks_obtained DESC
    """, values={"exam_id": exam_id})

    result_list = []
    seen = set()
    for r in rows:
        rid = r["result_id"]
        if rid in seen:
            continue
        seen.add(rid)
        d = {}
        for k in r._mapping.keys():
            v = r[k]
            if hasattr(v, 'isoformat'):
                d[k] = str(v)
            elif type(v).__name__ == 'Decimal':
                d[k] = float(v)
            else:
                d[k] = v
        result_list.append(d)

    if result_list:
        avg = sum(r["percentage"] or 0 for r in result_list) / len(result_list)
        highest = max(r["marks_obtained"] or 0 for r in result_list)
        passed = sum(1 for r in result_list if (r["percentage"] or 0) >= 40)
    else:
        avg = highest = passed = 0

    return JSONResponse({
        "exam": safe_dict(exam),
        "summary": {
            "total_students": len(result_list),
            "average_percentage": round(avg, 2),
            "highest_marks": highest,
            "passed_count": passed,
        },
        "results": result_list
    })


@router.get("/results/{exam_id}/student/{access_id}")
async def api_student_result_detail(exam_id: int, access_id: int, institute: dict = Depends(get_current_institute)):
    """Admin — detailed result for one student including all answers"""
    exam = await get_exam(exam_id, institute_id=institute["id"])
    if not exam:
        raise HTTPException(404, "Exam not found")
    result = await get_result(access_id)
    responses = await get_responses(access_id)
    security = await get_security_log(access_id)
    return JSONResponse({
        "result": safe_dict(result) if result else None,
        "responses": safe_list(responses),
        "security_events": safe_list(security)
    })


# ═══════════════════════════════════════════════════════════════
# BATCH MANAGEMENT — ADMIN
# ═══════════════════════════════════════════════════════════════

class BatchIn(BaseModel):
    name: str
    class_name: str
    school_name: str
    subject: str = ""

class AddStudentsToBatchIn(BaseModel):
    student_ids: List[int]

class AssignExamToBatchIn(BaseModel):
    batch_id: int

class StudentLoginIn(BaseModel):
    roll_no: str
    batch_id: int
    password: str

class SetPasswordIn(BaseModel):
    student_id: int
    password: str

class BatchExamSubmitIn(BaseModel):
    exam_id: int
    student_id: int
    answers: List[AnswerIn]
    time_taken_seconds: int = 0
    auto_submitted: bool = False


@router.post("/batch/create")
async def api_create_batch(
    payload: BatchIn,
    institute: dict = Depends(get_current_institute),
):
    batch_id = await create_batch(
        name=payload.name, class_name=payload.class_name,
        school_name=payload.school_name, subject=payload.subject,
        institute_id=institute["id"],
    )
    return JSONResponse({"success": True, "batch_id": batch_id})


@router.get("/batch/list")
async def api_list_batches(institute: dict = Depends(get_current_institute)):
    from app.services.db_service import database
    iid = institute["id"]
    try:
        await database.execute("ALTER TABLE batches ADD COLUMN IF NOT EXISTS default_fee NUMERIC(10,2) DEFAULT 0")
    except: pass
    rows = await database.fetch_all("""
        SELECT b.*, COUNT(bs.student_id) as student_count,
               COALESCE(b.default_fee, 0) as default_fee
        FROM batches b
        LEFT JOIN batch_students bs ON bs.batch_id = b.id
        WHERE b.institute_id = :iid
        GROUP BY b.id
        ORDER BY b.name
    """, values={"iid": iid})
    result = []
    for r in rows:
        d = {}
        for k in r._mapping.keys():
            v = r[k]
            d[k] = float(v) if type(v).__name__=='Decimal' else (str(v) if hasattr(v,'isoformat') else v)
        result.append(d)
    return JSONResponse({"batches": result})


@router.get("/batch/{batch_id}")
async def api_get_batch(batch_id: int, institute: dict = Depends(get_current_institute)):
    batch = await get_batch(batch_id)
    if not batch:
        raise HTTPException(404, "Batch not found")
    students = await get_batch_students(batch_id)
    return JSONResponse({"batch": safe_dict(batch), "students": safe_list(students)})


@router.post("/batch/{batch_id}/students")
async def api_add_students_to_batch(
    batch_id: int,
    payload: AddStudentsToBatchIn,
    institute: dict = Depends(get_current_institute),
):
    batch = await get_batch(batch_id)
    if not batch:
        raise HTTPException(404, "Batch not found")
    for sid in payload.student_ids:
        await add_student_to_batch(batch_id, sid)
    return JSONResponse({"success": True, "added": len(payload.student_ids)})


@router.delete("/batch/{batch_id}/students/{student_id}")
async def api_remove_student_from_batch(
    batch_id: int,
    student_id: int,
    institute: dict = Depends(get_current_institute),
):
    await remove_student_from_batch(batch_id, student_id)
    return JSONResponse({"success": True})


@router.post("/student/set-password")
async def api_set_password(
    payload: SetPasswordIn,
    institute: dict = Depends(get_current_institute),
):
    await set_student_password(payload.student_id, payload.password)
    return JSONResponse({"success": True})


# ═══════════════════════════════════════════════════════════════
# EXAM → BATCH PUBLISHING
# ═══════════════════════════════════════════════════════════════

@router.post("/exam/{exam_id}/publish")
async def api_publish_exam_to_batch(
    exam_id: int,
    payload: AssignExamToBatchIn,
    institute: dict = Depends(get_current_institute),
):
    """Admin publishes exam to a batch — students can now see and take it"""
    exam = await get_exam(exam_id, institute_id=institute["id"])
    if not exam:
        raise HTTPException(404, "Exam not found")
    batch = await get_batch(payload.batch_id)
    if not batch:
        raise HTTPException(404, "Batch not found")
    await assign_exam_to_batch(exam_id, payload.batch_id)
    return JSONResponse({
        "success": True,
        "message": f"Exam published to {batch['name']}",
        "exam_id": exam_id,
        "batch_id": payload.batch_id
    })


@router.get("/exam/{exam_id}/batches")
async def api_get_exam_batches(exam_id: int, institute: dict = Depends(get_current_institute)):
    rows = await get_batches_for_exam(exam_id)
    return JSONResponse({"batches": safe_list(rows)})


# ═══════════════════════════════════════════════════════════════
# STUDENT PORTAL — BATCH LOGIN + EXAM LIST
# ═══════════════════════════════════════════════════════════════

@router.get("/public/batches")
async def api_public_batch_list(institute_id: int = None):
    """Public endpoint — returns batch names for student login dropdown"""
    from app.services.db_service import database
    try:
        if institute_id:
            rows = await database.fetch_all(
                "SELECT id, name FROM batches WHERE institute_id = :iid ORDER BY name",
                {"iid": institute_id}
            )
        else:
            rows = await database.fetch_all(
                "SELECT id, name FROM batches ORDER BY name"
            )
        return {"batches": [dict(r) for r in rows]}
    except Exception as e:
        return {"batches": []}

@router.post("/student/login")
async def api_student_login(payload: StudentLoginIn):
    """Student logs in with roll no + batch + password"""
    student = await student_login(payload.roll_no, payload.batch_id, payload.password)
    if not student:
        raise HTTPException(401, "Invalid roll number, batch, or password")
    batch = await get_batch(payload.batch_id)
    return JSONResponse({
        "success": True,
        "student": safe_dict(student),
        "batch": safe_dict(batch)
    })


@router.get("/student/{student_id}/exams/{batch_id}")
async def api_student_exams(student_id: int, batch_id: int):
    """Student sees all active exams for their batch"""
    exams = await get_exams_for_batch(batch_id)
    # For each exam, check if student already submitted
    result_list = []
    for e in exams:
        session = await get_or_create_exam_session(e["id"], student_id)
        submitted = session.get("result_id") is not None
        result_list.append({**safe_dict(e), "submitted": submitted, "session_id": session["id"]})
    return JSONResponse({"exams": result_list})


@router.post("/student/start-exam")
async def api_start_exam(data: dict):
    """Student starts an exam — returns questions (no correct answers)"""
    exam_id = data.get("exam_id")
    student_id = data.get("student_id")
    if not exam_id or not student_id:
        raise HTTPException(400, "exam_id and student_id required")

    exam = await get_exam(exam_id)
    if not exam:
        raise HTTPException(404, "Exam not found")
    if exam["status"] != "active":
        raise HTTPException(403, "Exam is not active")

    session = await get_or_create_exam_session(exam_id, student_id)

    # Check already submitted
    if session.get("result_id"):
        result = await get_result(session["id"])
        return JSONResponse({"already_submitted": True, "result": safe_dict(result)})

    questions = await get_questions_for_student(exam_id)
    return JSONResponse({
        "already_submitted": False,
        "session_id": session["id"],
        "access_code": session["access_code"],
        "exam": safe_dict(exam),
        "questions": safe_list(questions)
    })


@router.post("/student/submit-exam")
async def api_submit_batch_exam(payload: BatchExamSubmitIn):
    """Student submits exam answers — auto-evaluated, saved against batch"""
    session = await get_or_create_exam_session(payload.exam_id, payload.student_id)

    # Already submitted?
    existing = await get_result(session["id"])
    if existing:
        return JSONResponse({"already_submitted": True, "result": safe_dict(existing)})

    questions = await get_questions(payload.exam_id)
    q_map = {q["id"]: q for q in questions}

    total_correct = total_wrong = total_skipped = total_attempted = 0
    marks_obtained = 0.0

    for ans in payload.answers:
        q = q_map.get(ans.question_id)
        if not q:
            continue
        if ans.selected_answer:
            total_attempted += 1
            is_correct, marks_awarded = await save_response(
                exam_access_id=session["id"],
                question_id=ans.question_id,
                selected_answer=ans.selected_answer,
                correct_answer=q["correct_answer"],
                marks=q["marks"],
                negative_marks=float(q["negative_marks"])
            )
            if is_correct: total_correct += 1
            else: total_wrong += 1
            marks_obtained += marks_awarded
        else:
            total_skipped += 1
            await save_response(
                exam_access_id=session["id"],
                question_id=ans.question_id,
                selected_answer=None,
                correct_answer=q["correct_answer"],
                marks=q["marks"],
                negative_marks=0
            )

    exam = await get_exam(payload.exam_id)
    total_marks = exam["total_marks"]
    marks_obtained = max(0, marks_obtained)

    await save_result(
        exam_access_id=session["id"],
        total_attempted=total_attempted,
        total_correct=total_correct,
        total_wrong=total_wrong,
        total_skipped=total_skipped,
        marks_obtained=marks_obtained,
        total_marks=total_marks,
        auto_submitted=payload.auto_submitted,
        time_taken_seconds=payload.time_taken_seconds
    )

    percentage = round(marks_obtained / total_marks * 100, 2) if total_marks > 0 else 0
    return JSONResponse({
        "success": True,
        "result": {
            "total_attempted": total_attempted,
            "total_correct": total_correct,
            "total_wrong": total_wrong,
            "total_skipped": total_skipped,
            "marks_obtained": marks_obtained,
            "total_marks": total_marks,
            "percentage": percentage,
            "auto_submitted": payload.auto_submitted,
        }
    })


# ═══════════════════════════════════════════════════════════════
# BATCH RESULTS — ADMIN
# ═══════════════════════════════════════════════════════════════

@router.get("/batch/{batch_id}/results")
async def api_batch_results(
    batch_id: int,
    exam_id: int = None,
    institute: dict = Depends(get_current_institute),
):
    """Admin sees all results for a batch, optionally filtered by exam"""
    rows = await get_batch_results(batch_id, exam_id, institute_id=institute["id"])
    results = safe_list(rows)
    if results:
        avg = sum(r["percentage"] for r in results) / len(results)
        passed = sum(1 for r in results if r["percentage"] >= 40)
    else:
        avg = passed = 0
    return JSONResponse({
        "batch_id": batch_id,
        "total_submissions": len(results),
        "average_percentage": round(avg, 2),
        "passed_count": passed,
        "results": results
    })


# ═══════════════════════════════════════════════════════════════
# EXAM QUESTION EDIT + UNASSIGN BATCH
# ═══════════════════════════════════════════════════════════════

class UpdateQuestionIn(BaseModel):
    question_text: str = None
    option_a: str = None
    option_b: str = None
    option_c: str = None
    option_d: str = None
    correct_answer: str = None
    marks: int = None

@router.put("/question/{question_id}")
async def api_update_question(
    question_id: int,
    payload: UpdateQuestionIn,
    institute: dict = Depends(get_current_institute),
):
    """Admin updates a question's text, options or correct answer"""
    fields = []
    values = {"id": question_id}
    if payload.question_text is not None:
        fields.append("question_text = :qt"); values["qt"] = payload.question_text
    if payload.option_a is not None:
        fields.append("option_a = :oa"); values["oa"] = payload.option_a
    if payload.option_b is not None:
        fields.append("option_b = :ob"); values["ob"] = payload.option_b
    if payload.option_c is not None:
        fields.append("option_c = :oc"); values["oc"] = payload.option_c
    if payload.option_d is not None:
        fields.append("option_d = :od"); values["od"] = payload.option_d
    if payload.correct_answer is not None:
        if payload.correct_answer.upper() not in ("A","B","C","D"):
            raise HTTPException(400, "correct_answer must be A/B/C/D")
        fields.append("correct_answer = :ca"); values["ca"] = payload.correct_answer.upper()
    if payload.marks is not None:
        fields.append("marks = :mk"); values["mk"] = payload.marks
    if not fields:
        raise HTTPException(400, "Nothing to update")
    from app.services.db_service import database
    await database.execute(f"UPDATE exam_questions SET {', '.join(fields)} WHERE id = :id", values=values)
    return JSONResponse({"success": True})


@router.delete("/exam/{exam_id}/batch/{batch_id}")
async def api_unassign_batch(
    exam_id: int,
    batch_id: int,
    institute: dict = Depends(get_current_institute),
):
    """Admin removes an exam from a batch"""
    from app.services.db_service import database
    await database.execute(
        "DELETE FROM exam_batches WHERE exam_id = :exam_id AND batch_id = :batch_id",
        values={"exam_id": exam_id, "batch_id": batch_id}
    )
    return JSONResponse({"success": True})


@router.get("/exam/{exam_id}/full")
async def api_get_exam_full(exam_id: int, institute: dict = Depends(get_current_institute)):
    """Get exam with all questions (including correct answers) + assigned batches"""
    exam = await get_exam(exam_id, institute_id=institute["id"])
    if not exam:
        raise HTTPException(404, "Exam not found")
    questions = await get_questions(exam_id)
    batches = await get_batches_for_exam(exam_id)
    return JSONResponse({
        "exam": safe_dict(exam),
        "questions": safe_list(questions),
        "assigned_batches": safe_list(batches)
    })


# ═══════════════════════════════════════════════════════════════
# STUDENT RESULT DETAIL — correct/wrong per question
# ═══════════════════════════════════════════════════════════════

@router.get("/student/{student_id}/result/{exam_id}")
async def api_student_result_detail(student_id: int, exam_id: int):
    """Student sees their detailed result — which answers were correct/wrong"""
    from app.services.db_service import database
    # Get session
    session = await database.fetch_one(
        "SELECT * FROM exam_access WHERE student_id=:sid AND exam_id=:eid",
        values={"sid": student_id, "eid": exam_id}
    )
    if not session:
        raise HTTPException(404, "No session found")

    result = await get_result(session["id"])
    responses = await get_responses(session["id"])

    return JSONResponse({
        "result": safe_dict(result) if result else None,
        "responses": safe_list(responses)
    })


# ═══════════════════════════════════════════════════════════════
# FEES MANAGEMENT
# ═══════════════════════════════════════════════════════════════

class FeeIn(BaseModel):
    student_id: int
    amount: float
    due_date: str = ""
    note: str = ""

class PaymentIn(BaseModel):
    student_id: int
    amount: float
    note: str = ""

@router.get("/fees")
async def api_get_fees(institute: dict = Depends(get_current_institute)):
    """Get all fee records for this institute"""
    from app.services.db_service import database
    iid = institute["id"]
    await database.execute("""
        CREATE TABLE IF NOT EXISTS student_fees (
            id SERIAL PRIMARY KEY,
            student_id INTEGER REFERENCES students(id),
            amount NUMERIC(10,2) DEFAULT 0,
            paid NUMERIC(10,2) DEFAULT 0,
            due_date DATE,
            note TEXT DEFAULT '',
            status VARCHAR(20) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    """)
    rows = await database.fetch_all("""
        SELECT sf.*, s.name as student_name, s.roll_no,
               b.name as batch_name, b.id as batch_id
        FROM student_fees sf
        JOIN students s ON sf.student_id = s.id
        LEFT JOIN batch_students bs ON bs.student_id = s.id
        LEFT JOIN batches b ON bs.batch_id = b.id
        WHERE s.institute_id = :iid
        ORDER BY s.name
    """, values={"iid": iid})
    return JSONResponse({"fees": safe_list(rows)})

@router.post("/fees/set")
async def api_set_fee(payload: FeeIn, institute: dict = Depends(get_current_institute)):
    """Set or update fee for a student"""
    from app.services.db_service import database
    await database.execute("""
        CREATE TABLE IF NOT EXISTS student_fees (
            id SERIAL PRIMARY KEY,
            student_id INTEGER REFERENCES students(id),
            amount NUMERIC(10,2) DEFAULT 0,
            paid NUMERIC(10,2) DEFAULT 0,
            due_date DATE,
            note TEXT DEFAULT '',
            status VARCHAR(20) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    """)
    existing = await database.fetch_one(
        "SELECT id FROM student_fees WHERE student_id=:sid",
        values={"sid": payload.student_id}
    )
    due_date = None
    if payload.due_date:
        try:
            from datetime import date
            due_date = date.fromisoformat(payload.due_date)
        except:
            due_date = None
    if existing:
        await database.execute("""
            UPDATE student_fees SET amount=:amt, due_date=:dd, note=:note,
            status=CASE WHEN paid>=:amt THEN 'paid' ELSE 'pending' END,
            updated_at=NOW()
            WHERE student_id=:sid
        """, values={"amt": payload.amount, "dd": due_date, "note": payload.note, "sid": payload.student_id})
    else:
        await database.execute("""
            INSERT INTO student_fees (student_id, amount, paid, due_date, note, status)
            VALUES (:sid, :amt, 0, :dd, :note, 'pending')
        """, values={"sid": payload.student_id, "amt": payload.amount, "dd": due_date, "note": payload.note})
    return JSONResponse({"success": True})

@router.post("/fees/pay")
async def api_pay_fee(payload: PaymentIn, institute: dict = Depends(get_current_institute)):
    """Record a payment for a student"""
    from app.services.db_service import database
    await database.execute("""
        UPDATE student_fees
        SET paid = paid + :amt,
            status = CASE WHEN paid + :amt >= amount THEN 'paid' ELSE 'partial' END,
            updated_at = NOW()
        WHERE student_id = :sid
    """, values={"amt": payload.amount, "sid": payload.student_id})
    return JSONResponse({"success": True})

@router.delete("/fees/{student_id}")
async def api_delete_fee(student_id: int, institute: dict = Depends(get_current_institute)):
    """Delete fee record for a student"""
    from app.services.db_service import database
    await database.execute(
        "DELETE FROM student_fees WHERE student_id=:sid",
        values={"sid": student_id}
    )
    return JSONResponse({"success": True})

@router.get("/fees/summary")
async def api_fees_summary(institute: dict = Depends(get_current_institute)):
    """Dashboard summary of fees"""
    from app.services.db_service import database
    iid = institute["id"]
    try:
        row = await database.fetch_one("""
            SELECT
                COUNT(*) as total,
                COALESCE(SUM(sf.paid),0) as collected,
                COALESCE(SUM(GREATEST(sf.amount-sf.paid,0)),0) as pending,
                COUNT(CASE WHEN sf.status='paid' THEN 1 END) as fully_paid
            FROM student_fees sf
            JOIN students s ON sf.student_id = s.id
            WHERE s.institute_id = :iid
        """, values={"iid": iid})
        return JSONResponse({
            "total": row["total"], "collected": float(row["collected"]),
            "pending": float(row["pending"]), "fully_paid": row["fully_paid"]
        })
    except:
        return JSONResponse({"total":0,"collected":0,"pending":0,"fully_paid":0})


# ═══════════════════════════════════════════════════════════════
# FEES — MONTHLY RECORDS
# ═══════════════════════════════════════════════════════════════

class MonthlyFeeIn(BaseModel):
    student_id: int
    month: str  # e.g. "2026-06"
    amount: float
    note: str = ""

class MonthlyPayIn(BaseModel):
    student_id: int
    month: str
    paid: float

@router.get("/fees/monthly")
async def api_get_monthly_fees(institute: dict = Depends(get_current_institute)):
    from app.services.db_service import database
    iid = institute["id"]
    await database.execute("""
        CREATE TABLE IF NOT EXISTS student_fees_monthly (
            id SERIAL PRIMARY KEY,
            student_id INTEGER REFERENCES students(id),
            month VARCHAR(7) NOT NULL,
            amount NUMERIC(10,2) DEFAULT 0,
            paid NUMERIC(10,2) DEFAULT 0,
            status VARCHAR(20) DEFAULT 'pending',
            note TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(student_id, month)
        )
    """)
    try:
        await database.execute("ALTER TABLE batches ADD COLUMN IF NOT EXISTS default_fee NUMERIC(10,2) DEFAULT 0")
    except: pass
    rows = await database.fetch_all("""
        SELECT sfm.*, s.name as student_name, s.roll_no,
               b.id as batch_id, b.name as batch_name, b.default_fee as batch_default_fee
        FROM student_fees_monthly sfm
        JOIN students s ON sfm.student_id = s.id
        LEFT JOIN batch_students bs ON bs.student_id = s.id
        LEFT JOIN batches b ON bs.batch_id = b.id
        WHERE s.institute_id = :iid
        ORDER BY sfm.month DESC, s.name
    """, values={"iid": iid})
    result = []
    seen = set()
    for r in rows:
        key = (r['student_id'], r['month'])
        if key in seen: continue
        seen.add(key)
        d = {}
        for k in r._mapping.keys():
            v = r[k]
            d[k] = str(v) if hasattr(v,'isoformat') else (float(v) if type(v).__name__=='Decimal' else v)
        result.append(d)
    return JSONResponse({"fees": result})

@router.post("/fees/monthly/set")
async def api_set_monthly_fee(payload: MonthlyFeeIn, institute: dict = Depends(get_current_institute)):
    from app.services.db_service import database
    await database.execute("""
        CREATE TABLE IF NOT EXISTS student_fees_monthly (
            id SERIAL PRIMARY KEY,
            student_id INTEGER REFERENCES students(id),
            month VARCHAR(7) NOT NULL,
            amount NUMERIC(10,2) DEFAULT 0,
            paid NUMERIC(10,2) DEFAULT 0,
            status VARCHAR(20) DEFAULT 'pending',
            note TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(student_id, month)
        )
    """)
    await database.execute("""
        INSERT INTO student_fees_monthly (student_id, month, amount, note, status)
        VALUES (:sid, :month, :amt, :note, 'pending')
        ON CONFLICT (student_id, month) DO UPDATE
        SET amount=:amt, note=:note,
            status=CASE WHEN student_fees_monthly.paid>=:amt THEN 'paid' ELSE 'pending' END
    """, values={"sid":payload.student_id,"month":payload.month,"amt":payload.amount,"note":payload.note})
    return JSONResponse({"success":True})

@router.post("/fees/monthly/pay")
async def api_pay_monthly_fee(payload: MonthlyPayIn, institute: dict = Depends(get_current_institute)):
    from app.services.db_service import database
    await database.execute("""
        UPDATE student_fees_monthly
        SET paid=:paid,
            status=CASE WHEN :paid>=amount THEN 'paid' WHEN :paid>0 THEN 'partial' ELSE 'pending' END
        WHERE student_id=:sid AND month=:month
    """, values={"paid":payload.paid,"sid":payload.student_id,"month":payload.month})
    return JSONResponse({"success":True})

@router.delete("/fees/monthly/{student_id}/{month}")
async def api_delete_monthly_fee(student_id: int, month: str, institute: dict = Depends(get_current_institute)):
    from app.services.db_service import database
    await database.execute(
        "DELETE FROM student_fees_monthly WHERE student_id=:sid AND month=:month",
        values={"sid":student_id,"month":month}
    )
    return JSONResponse({"success":True})

@router.get("/fees/monthly/summary")
async def api_monthly_fees_summary(institute: dict = Depends(get_current_institute)):
    from app.services.db_service import database
    import datetime
    iid = institute["id"]
    try:
        await database.execute("""
            CREATE TABLE IF NOT EXISTS student_fees_monthly (
                id SERIAL PRIMARY KEY, student_id INTEGER,
                month VARCHAR(7), amount NUMERIC(10,2) DEFAULT 0,
                paid NUMERIC(10,2) DEFAULT 0, status VARCHAR(20) DEFAULT 'pending',
                note TEXT DEFAULT '', created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(student_id, month)
            )
        """)
        current_month = datetime.date.today().strftime("%Y-%m")
        row = await database.fetch_one("""
            SELECT
                COALESCE(SUM(sfm.paid),0) as collected,
                COALESCE(SUM(GREATEST(sfm.amount - sfm.paid, 0)),0) as pending,
                COUNT(CASE WHEN sfm.status='paid' THEN 1 END) as fully_paid,
                COUNT(DISTINCT sfm.student_id) as students_with_fees
            FROM student_fees_monthly sfm
            JOIN students s ON sfm.student_id = s.id
            WHERE sfm.month = :month
            AND s.institute_id = :iid
            AND (s.admission_date IS NULL OR TO_CHAR(s.admission_date,'YYYY-MM') <= sfm.month)
        """, values={"month": current_month, "iid": iid})
        return JSONResponse({
            "collected": float(row["collected"]),
            "pending": float(row["pending"]),
            "fully_paid": int(row["fully_paid"]),
            "students_with_fees": int(row["students_with_fees"]),
            "month": current_month
        })
    except Exception as e:
        return JSONResponse({"collected":0,"pending":0,"fully_paid":0,"students_with_fees":0,"month":""})


# ── Batch rename + default fee endpoint ──────────────────────
class BatchUpdateIn(BaseModel):
    name: str
    class_name: str
    default_fee: float = 0

@router.put("/batch/{batch_id}")
async def api_update_batch(batch_id: int, payload: BatchUpdateIn, institute: dict = Depends(get_current_institute)):
    from app.services.db_service import database
    try:
        await database.execute("ALTER TABLE batches ADD COLUMN IF NOT EXISTS default_fee NUMERIC(10,2) DEFAULT 0")
    except: pass
    await database.execute(
        "UPDATE batches SET name=:name, class_name=:cls, default_fee=:fee WHERE id=:id",
        values={"name": payload.name, "cls": payload.class_name, "fee": payload.default_fee, "id": batch_id}
    )
    return JSONResponse({"success": True})

@router.get("/batch/{batch_id}/fee")
async def api_get_batch_fee(batch_id: int, institute: dict = Depends(get_current_institute)):
    from app.services.db_service import database
    try:
        row = await database.fetch_one("SELECT default_fee FROM batches WHERE id=:id", values={"id": batch_id})
        return JSONResponse({"default_fee": float(row["default_fee"] or 0)})
    except:
        return JSONResponse({"default_fee": 0})


# ── Student update endpoint ───────────────────────────────────
class StudentUpdateIn(BaseModel):
    name: str
    roll_no: str = ""
    phone: str = ""
    school_name: str = ""
    email: str = ""
    admission_date: str = ""
    batch_id: Optional[int] = None

@router.put("/student/{student_id}")
async def api_update_student(student_id: int, payload: StudentUpdateIn, institute: dict = Depends(get_current_institute)):
    from app.services.db_service import database
    from datetime import date as _date
    adm = None
    if payload.admission_date:
        try: adm = _date.fromisoformat(payload.admission_date)
        except: pass
    await database.execute("""
        UPDATE students SET name=:name, roll_no=:roll, phone=:phone,
        school_name=:school, email=:email, admission_date=:adm
        WHERE id=:id AND institute_id=:iid
    """, values={"name":payload.name,"roll":payload.roll_no,"phone":payload.phone,
                 "school":payload.school_name,"email":payload.email,"adm":adm,"id":student_id,"iid":institute["id"]})
    if payload.batch_id:
        await database.execute("DELETE FROM batch_students WHERE student_id=:sid", values={"sid":student_id})
        await database.execute(
            "INSERT INTO batch_students (batch_id, student_id) VALUES (:bid, :sid) ON CONFLICT DO NOTHING",
            values={"bid": payload.batch_id, "sid": student_id}
        )
    return JSONResponse({"success": True})


# ── Outstanding dues per student ─────────────────────────────
@router.get("/fees/outstanding")
async def api_outstanding_dues(institute: dict = Depends(get_current_institute)):
    """Get total outstanding dues per student across all months"""
    from app.services.db_service import database
    iid = institute["id"]
    try:
        rows = await database.fetch_all("""
            SELECT
                s.id as student_id, s.name as student_name, s.roll_no,
                b.id as batch_id, b.name as batch_name,
                s.admission_date,
                COALESCE(SUM(sfm.amount),0) as total_fees,
                COALESCE(SUM(sfm.paid),0) as total_paid,
                COALESCE(SUM(GREATEST(sfm.amount - sfm.paid, 0)),0) as total_due,
                COUNT(CASE WHEN sfm.status='pending' OR sfm.status='partial' THEN 1 END) as months_pending
            FROM students s
            LEFT JOIN batch_students bs ON bs.student_id = s.id
            LEFT JOIN batches b ON bs.batch_id = b.id
            LEFT JOIN student_fees_monthly sfm ON sfm.student_id = s.id
                AND (s.admission_date IS NULL OR TO_CHAR(s.admission_date,'YYYY-MM') <= sfm.month)
                AND sfm.month <= TO_CHAR(CURRENT_DATE,'YYYY-MM')
            WHERE s.institute_id = :iid
            GROUP BY s.id, s.name, s.roll_no, b.id, b.name, s.admission_date
            HAVING COALESCE(SUM(GREATEST(sfm.amount - sfm.paid, 0)),0) > 0
            ORDER BY total_due DESC
        """, values={"iid": iid})
        result = []
        for r in rows:
            d = {}
            for k in r._mapping.keys():
                v = r[k]
                d[k] = float(v) if type(v).__name__=='Decimal' else (str(v) if hasattr(v,'isoformat') else v)
            result.append(d)
        total = sum(r['total_due'] for r in result)
        return JSONResponse({"students": result, "total_due": total})
    except Exception as e:
        return JSONResponse({"students": [], "total_due": 0, "error": str(e)})
