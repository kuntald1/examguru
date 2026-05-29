"""
Vorpet Phase 2 — PostgreSQL Database Service
Uses asyncpg via 'databases' library for async FastAPI compatibility
"""

import os, random, string
from databases import Database

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://vorpeteducation:Education@123@187.127.150.252:5432/vorpeteducationdb"
)

database = Database(DATABASE_URL)


# ── Connection lifecycle ──────────────────────────────────────────────────────

async def connect_db():
    await database.connect()

async def disconnect_db():
    await database.disconnect()


# ── Access code generator ─────────────────────────────────────────────────────

def generate_access_code() -> str:
    """Generate unique student exam code like VORP-A3X9"""
    chars = string.ascii_uppercase + string.digits
    suffix = ''.join(random.choices(chars, k=6))
    return f"VORP-{suffix}"


# ── EXAMS ─────────────────────────────────────────────────────────────────────

async def create_exam(school_name: str, class_name: str, subject: str,
                      language: str, duration_minutes: int, total_marks: int,
                      institute_id: int = 1) -> int:
    query = """
        INSERT INTO exams (school_name, class_name, subject, language,
                           duration_minutes, total_marks, status, institute_id)
        VALUES (:school_name, :class_name, :subject, :language,
                :duration_minutes, :total_marks, 'draft', :institute_id)
        RETURNING id
    """
    result = await database.fetch_one(query, values={
        "school_name": school_name, "class_name": class_name,
        "subject": subject, "language": language,
        "duration_minutes": duration_minutes, "total_marks": total_marks,
        "institute_id": institute_id,
    })
    return result["id"]


async def get_exam(exam_id: int, institute_id: int = None):
    if institute_id:
        return await database.fetch_one(
            "SELECT * FROM exams WHERE id = :id AND institute_id = :iid",
            values={"id": exam_id, "iid": institute_id}
        )
    return await database.fetch_one("SELECT * FROM exams WHERE id = :id", values={"id": exam_id})


async def list_exams(institute_id: int = None):
    if institute_id:
        return await database.fetch_all(
            "SELECT * FROM exams WHERE institute_id = :iid ORDER BY created_at DESC",
            values={"iid": institute_id}
        )
    return await database.fetch_all("SELECT * FROM exams ORDER BY created_at DESC")


async def update_exam_status(exam_id: int, status: str):
    query = "UPDATE exams SET status = :status, updated_at = NOW() WHERE id = :id"
    await database.execute(query, values={"status": status, "id": exam_id})


# ── EXAM QUESTIONS (MCQ) ──────────────────────────────────────────────────────

async def add_question(exam_id: int, question_no: int, question_text: str,
                       option_a: str, option_b: str, option_c: str, option_d: str,
                       correct_answer: str, marks: int = 1,
                       negative_marks: float = 0.0) -> int:
    query = """
        INSERT INTO exam_questions
            (exam_id, question_no, question_text, option_a, option_b,
             option_c, option_d, correct_answer, marks, negative_marks)
        VALUES
            (:exam_id, :question_no, :question_text, :option_a, :option_b,
             :option_c, :option_d, :correct_answer, :marks, :negative_marks)
        RETURNING id
    """
    result = await database.fetch_one(query, values={
        "exam_id": exam_id, "question_no": question_no,
        "question_text": question_text, "option_a": option_a,
        "option_b": option_b, "option_c": option_c, "option_d": option_d,
        "correct_answer": correct_answer.upper(),
        "marks": marks, "negative_marks": negative_marks
    })
    return result["id"]


async def get_questions(exam_id: int):
    query = """
        SELECT * FROM exam_questions
        WHERE exam_id = :exam_id
        ORDER BY question_no
    """
    return await database.fetch_all(query, values={"exam_id": exam_id})


async def get_questions_for_student(exam_id: int):
    """Same as get_questions but WITHOUT correct_answer — safe for student"""
    query = """
        SELECT id, exam_id, question_no, question_text,
               option_a, option_b, option_c, option_d, marks
        FROM exam_questions
        WHERE exam_id = :exam_id
        ORDER BY question_no
    """
    return await database.fetch_all(query, values={"exam_id": exam_id})


# ── STUDENTS ──────────────────────────────────────────────────────────────────

async def create_student(name: str, roll_no: str = "", batch: str = "",
                         school_name: str = "", email: str = "",
                         phone: str = "", institute_id: int = 1) -> int:
    query = """
        INSERT INTO students (name, roll_no, batch, school_name, email, phone, institute_id)
        VALUES (:name, :roll_no, :batch, :school_name, :email, :phone, :institute_id)
        RETURNING id
    """
    result = await database.fetch_one(query, values={
        "name": name, "roll_no": roll_no, "batch": batch,
        "school_name": school_name, "email": email, "phone": phone,
        "institute_id": institute_id,
    })
    return result["id"]


async def get_student(student_id: int):
    return await database.fetch_one(
        "SELECT * FROM students WHERE id = :id", values={"id": student_id}
    )


async def list_students():
    return await database.fetch_all("SELECT * FROM students ORDER BY name")


# ── EXAM ACCESS (unique codes) ────────────────────────────────────────────────

async def create_exam_access(exam_id: int, student_id: int,
                              expires_at=None) -> str:
    """Generate a unique access code for a student-exam pair"""
    for _ in range(10):  # retry if collision
        code = generate_access_code()
        try:
            query = """
                INSERT INTO exam_access
                    (exam_id, student_id, access_code, expires_at)
                VALUES (:exam_id, :student_id, :access_code, :expires_at)
                RETURNING access_code
            """
            result = await database.fetch_one(query, values={
                "exam_id": exam_id, "student_id": student_id,
                "access_code": code, "expires_at": expires_at
            })
            return result["access_code"]
        except Exception:
            continue
    raise Exception("Could not generate unique access code after 10 attempts")


async def get_access_by_code(code: str):
    query = """
        SELECT ea.*, e.duration_minutes, e.status as exam_status,
               s.name as student_name, e.school_name, e.class_name,
               e.subject, e.language, e.total_marks
        FROM exam_access ea
        JOIN exams e ON e.id = ea.exam_id
        JOIN students s ON s.id = ea.student_id
        WHERE ea.access_code = :code
    """
    return await database.fetch_one(query, values={"code": code.upper()})


async def mark_access_used(access_id: int):
    query = """
        UPDATE exam_access
        SET used = TRUE, used_at = NOW()
        WHERE id = :id
    """
    await database.execute(query, values={"id": access_id})


async def list_access_for_exam(exam_id: int):
    query = """
        SELECT ea.*, s.name as student_name, s.roll_no, s.batch
        FROM exam_access ea
        JOIN students s ON s.id = ea.student_id
        WHERE ea.exam_id = :exam_id
        ORDER BY s.name
    """
    return await database.fetch_all(query, values={"exam_id": exam_id})


# ── STUDENT RESPONSES ─────────────────────────────────────────────────────────

async def save_response(exam_access_id: int, question_id: int,
                        selected_answer: str, correct_answer: str,
                        marks: int, negative_marks: float):
    is_correct = selected_answer.upper() == correct_answer.upper() if selected_answer else False
    if is_correct:
        marks_awarded = marks
    elif selected_answer and negative_marks > 0:
        marks_awarded = -negative_marks
    else:
        marks_awarded = 0.0

    query = """
        INSERT INTO student_responses
            (exam_access_id, question_id, selected_answer, is_correct, marks_awarded)
        VALUES (:access_id, :question_id, :answer, :is_correct, :marks_awarded)
        ON CONFLICT DO NOTHING
    """
    await database.execute(query, values={
        "access_id": exam_access_id, "question_id": question_id,
        "answer": selected_answer.upper() if selected_answer else None,
        "is_correct": is_correct, "marks_awarded": marks_awarded
    })
    return is_correct, marks_awarded


async def get_responses(exam_access_id: int):
    query = """
        SELECT sr.*, eq.question_text, eq.correct_answer,
               eq.option_a, eq.option_b, eq.option_c, eq.option_d, eq.marks
        FROM student_responses sr
        JOIN exam_questions eq ON eq.id = sr.question_id
        WHERE sr.exam_access_id = :access_id
        ORDER BY eq.question_no
    """
    return await database.fetch_all(query, values={"access_id": exam_access_id})


# ── EXAM RESULTS ──────────────────────────────────────────────────────────────

async def save_result(exam_access_id: int, total_attempted: int,
                      total_correct: int, total_wrong: int, total_skipped: int,
                      marks_obtained: float, total_marks: int,
                      auto_submitted: bool, time_taken_seconds: int) -> int:
    percentage = round((marks_obtained / total_marks * 100), 2) if total_marks > 0 else 0
    query = """
        INSERT INTO exam_results
            (exam_access_id, total_attempted, total_correct, total_wrong,
             total_skipped, marks_obtained, total_marks, percentage,
             auto_submitted, time_taken_seconds)
        VALUES
            (:access_id, :attempted, :correct, :wrong, :skipped,
             :marks, :total_marks, :percentage, :auto_submitted, :time_taken)
        ON CONFLICT DO NOTHING
        RETURNING id
    """
    result = await database.fetch_one(query, values={
        "access_id": exam_access_id, "attempted": total_attempted,
        "correct": total_correct, "wrong": total_wrong, "skipped": total_skipped,
        "marks": marks_obtained, "total_marks": total_marks,
        "percentage": percentage, "auto_submitted": auto_submitted,
        "time_taken": time_taken_seconds
    })
    return result["id"] if result else None


async def get_result(exam_access_id: int):
    query = """
        SELECT er.*, s.name as student_name, s.roll_no, s.batch,
               e.school_name, e.class_name, e.subject
        FROM exam_results er
        JOIN exam_access ea ON ea.id = er.exam_access_id
        JOIN students s ON s.id = ea.student_id
        JOIN exams e ON e.id = ea.exam_id
        WHERE er.exam_access_id = :access_id
    """
    return await database.fetch_one(query, values={"access_id": exam_access_id})


async def get_exam_results(exam_id: int):
    """All results for an exam — for admin dashboard"""
    query = """
        SELECT er.*, s.name as student_name, s.roll_no, s.batch,
               ea.access_code
        FROM exam_results er
        JOIN exam_access ea ON ea.id = er.exam_access_id
        JOIN students s ON s.id = ea.student_id
        WHERE ea.exam_id = :exam_id
        ORDER BY er.marks_obtained DESC
    """
    return await database.fetch_all(query, values={"exam_id": exam_id})


# ── SECURITY LOG ──────────────────────────────────────────────────────────────

async def log_security_event(exam_access_id: int, event_type: str):
    query = """
        INSERT INTO exam_security_log (exam_access_id, event_type)
        VALUES (:access_id, :event_type)
    """
    await database.execute(query, values={
        "access_id": exam_access_id, "event_type": event_type
    })


async def get_security_log(exam_access_id: int):
    query = """
        SELECT * FROM exam_security_log
        WHERE exam_access_id = :access_id
        ORDER BY event_at
    """
    return await database.fetch_all(query, values={"access_id": exam_access_id})

# ── BATCHES ───────────────────────────────────────────────────────────────────

async def create_batch(name: str, class_name: str, school_name: str, subject: str = "",
                       institute_id: int = 1) -> int:
    query = """
        INSERT INTO batches (name, class_name, school_name, subject, institute_id)
        VALUES (:name, :class_name, :school_name, :subject, :institute_id)
        RETURNING id
    """
    result = await database.fetch_one(query, values={
        "name": name, "class_name": class_name,
        "school_name": school_name, "subject": subject,
        "institute_id": institute_id,
    })
    return result["id"]


async def list_batches():
    query = """
        SELECT b.*, COUNT(bs.student_id) as student_count
        FROM batches b
        LEFT JOIN batch_students bs ON bs.batch_id = b.id
        GROUP BY b.id
        ORDER BY b.created_at DESC
    """
    return await database.fetch_all(query)


async def get_batch(batch_id: int):
    return await database.fetch_one(
        "SELECT * FROM batches WHERE id = :id", values={"id": batch_id}
    )


async def add_student_to_batch(batch_id: int, student_id: int):
    query = """
        INSERT INTO batch_students (batch_id, student_id)
        VALUES (:batch_id, :student_id)
        ON CONFLICT (batch_id, student_id) DO NOTHING
    """
    await database.execute(query, values={"batch_id": batch_id, "student_id": student_id})
    # Also update student's batch_id
    await database.execute(
        "UPDATE students SET batch_id = :batch_id WHERE id = :id",
        values={"batch_id": batch_id, "id": student_id}
    )


async def remove_student_from_batch(batch_id: int, student_id: int):
    await database.execute(
        "DELETE FROM batch_students WHERE batch_id = :batch_id AND student_id = :student_id",
        values={"batch_id": batch_id, "student_id": student_id}
    )


async def get_batch_students(batch_id: int):
    query = """
        SELECT s.* FROM students s
        JOIN batch_students bs ON bs.student_id = s.id
        WHERE bs.batch_id = :batch_id
        ORDER BY s.roll_no, s.name
    """
    return await database.fetch_all(query, values={"batch_id": batch_id})


# ── EXAM ↔ BATCH ASSIGNMENT ───────────────────────────────────────────────────

async def assign_exam_to_batch(exam_id: int, batch_id: int):
    query = """
        INSERT INTO exam_batches (exam_id, batch_id)
        VALUES (:exam_id, :batch_id)
        ON CONFLICT (exam_id, batch_id) DO NOTHING
    """
    await database.execute(query, values={"exam_id": exam_id, "batch_id": batch_id})
    # Auto-activate exam when published to batch
    await database.execute(
        "UPDATE exams SET status = 'active', updated_at = NOW() WHERE id = :id",
        values={"id": exam_id}
    )


async def get_exams_for_batch(batch_id: int):
    """Exams available for a batch — for student dashboard"""
    query = """
        SELECT e.*, eb.assigned_at,
               COUNT(er.id) as submission_count
        FROM exams e
        JOIN exam_batches eb ON eb.exam_id = e.id
        LEFT JOIN exam_access ea ON ea.exam_id = e.id
        LEFT JOIN exam_results er ON er.exam_access_id = ea.id
        WHERE eb.batch_id = :batch_id AND e.status = 'active'
        GROUP BY e.id, eb.assigned_at
        ORDER BY eb.assigned_at DESC
    """
    return await database.fetch_all(query, values={"batch_id": batch_id})


async def get_batches_for_exam(exam_id: int):
    query = """
        SELECT b.* FROM batches b
        JOIN exam_batches eb ON eb.batch_id = b.id
        WHERE eb.exam_id = :exam_id
    """
    return await database.fetch_all(query, values={"exam_id": exam_id})


# ── STUDENT LOGIN (Roll No + Batch) ──────────────────────────────────────────

async def student_login(roll_no: str, batch_id: int, password: str):
    query = """
        SELECT s.* FROM students s
        JOIN batch_students bs ON bs.student_id = s.id
        JOIN batches b ON b.id = bs.batch_id
        WHERE s.roll_no = :roll_no
          AND bs.batch_id = :batch_id
          AND s.password = :password
          AND s.institute_id = b.institute_id
    """
    return await database.fetch_one(query, values={
        "roll_no": roll_no, "batch_id": batch_id, "password": password
    })


async def set_student_password(student_id: int, password: str):
    await database.execute(
        "UPDATE students SET password = :password WHERE id = :id",
        values={"password": password, "id": student_id}
    )


# ── STUDENT EXAM SESSION (batch-based, no individual codes) ──────────────────

async def get_or_create_exam_session(exam_id: int, student_id: int) -> dict:
    """Get existing session or create new one for student-exam pair"""
    # Check existing
    query = """
        SELECT ea.*, er.id as result_id
        FROM exam_access ea
        LEFT JOIN exam_results er ON er.exam_access_id = ea.id
        WHERE ea.exam_id = :exam_id AND ea.student_id = :student_id
    """
    existing = await database.fetch_one(query, values={"exam_id": exam_id, "student_id": student_id})
    if existing:
        return dict(existing)

    # Create new session with auto-generated code
    code = generate_access_code()
    insert = """
        INSERT INTO exam_access (exam_id, student_id, access_code)
        VALUES (:exam_id, :student_id, :code)
        RETURNING id, access_code
    """
    result = await database.fetch_one(insert, values={
        "exam_id": exam_id, "student_id": student_id, "code": code
    })
    return {"id": result["id"], "access_code": result["access_code"], "used": False, "result_id": None}


async def get_batch_results(batch_id: int, exam_id: int = None, institute_id: int = None):
    """All results for a batch, optionally filtered by exam and institute"""
    base = """
        SELECT er.*, s.name as student_name, s.roll_no,
               e.subject, e.class_name, ea.exam_id,
               e.school_name
        FROM exam_results er
        JOIN exam_access ea ON ea.id = er.exam_access_id
        JOIN students s ON s.id = ea.student_id
        JOIN exams e ON e.id = ea.exam_id
        JOIN batch_students bs ON bs.student_id = s.id
        WHERE bs.batch_id = :batch_id
    """
    if institute_id:
        base += " AND s.institute_id = :institute_id"
    if exam_id:
        base += " AND ea.exam_id = :exam_id ORDER BY er.marks_obtained DESC"
        vals = {"batch_id": batch_id, "exam_id": exam_id}
        if institute_id: vals["institute_id"] = institute_id
        return await database.fetch_all(base, values=vals)
    else:
        base += " ORDER BY er.submitted_at DESC"
        vals = {"batch_id": batch_id}
        if institute_id: vals["institute_id"] = institute_id
        return await database.fetch_all(base, values=vals)
