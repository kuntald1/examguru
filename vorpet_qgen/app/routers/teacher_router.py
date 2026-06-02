"""
ExamGuru Phase 5 — Teacher Router
Teachers belong to an institute. Institute admin registers them.
Teacher login returns JWT with role=teacher + institute_id.

Endpoints:
  POST /teacher/register      (institute admin only)
  POST /teacher/login
  GET  /teacher/me
  GET  /teacher/list          (institute admin only)
  PUT  /teacher/{id}/active   (institute admin only)
  DELETE /teacher/{id}        (institute admin only)
"""

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import datetime
from decimal import Decimal

from app.services.db_service import database
from app.services.auth_service import hash_password, verify_password, create_access_token
from app.dependencies import get_current_institute, get_current_teacher

router = APIRouter(prefix="/teacher", tags=["Phase 5 — Teachers"])


# ── helpers ──────────────────────────────────────────────────────────────────

def safe(row) -> dict:
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
    out.pop("password_hash", None)   # never expose hash
    return out


# ── Models ────────────────────────────────────────────────────────────────────

class TeacherRegisterIn(BaseModel):
    name:     str
    email:    str
    password: str
    subject:  Optional[str] = ""
    phone:    Optional[str] = ""

class TeacherLoginIn(BaseModel):
    email:    str
    password: str

class TeacherActiveIn(BaseModel):
    active: bool


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/register")
async def register_teacher(
    body: TeacherRegisterIn,
    institute: dict = Depends(get_current_institute),
):
    """Institute admin registers a new teacher under their institute."""
    iid = institute["id"]

    # Check email uniqueness across teachers
    existing = await database.fetch_one(
        "SELECT id FROM teachers WHERE email = :email",
        values={"email": body.email.strip().lower()}
    )
    if existing:
        raise HTTPException(400, "A teacher with this email already exists.")

    teacher_id = await database.execute(
        """
        INSERT INTO teachers (institute_id, name, email, password_hash, subject, phone)
        VALUES (:iid, :name, :email, :pw, :subject, :phone)
        RETURNING id
        """,
        values={
            "iid":     iid,
            "name":    body.name.strip(),
            "email":   body.email.strip().lower(),
            "pw":      hash_password(body.password),
            "subject": body.subject or "",
            "phone":   body.phone or "",
        }
    )
    row = await database.fetch_one(
        "SELECT id, name, email, subject, phone, active, created_at FROM teachers WHERE id = :id",
        values={"id": teacher_id}
    )
    return JSONResponse({"success": True, "teacher": safe(row)})


@router.post("/login")
async def teacher_login(body: TeacherLoginIn):
    """Teacher login — returns JWT with role=teacher."""
    row = await database.fetch_one(
        """
        SELECT t.*, i.name as institute_name, i.plan as institute_plan
        FROM teachers t
        JOIN institutes i ON i.id = t.institute_id
        WHERE t.email = :email
        """,
        values={"email": body.email.strip().lower()}
    )
    if not row:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    if not verify_password(body.password, row["password_hash"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    if not row["active"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account suspended. Contact your institute admin.")

    token = create_access_token({
        "sub":          str(row["id"]),
        "role":         "teacher",
        "institute_id": str(row["institute_id"]),
    })
    return JSONResponse({
        "success":     True,
        "access_token": token,
        "token_type":  "bearer",
        "teacher": {
            "id":             row["id"],
            "name":           row["name"],
            "email":          row["email"],
            "subject":        row["subject"],
            "institute_id":   row["institute_id"],
            "institute_name": row["institute_name"],
            "institute_plan": row["institute_plan"],
        }
    })


@router.get("/me")
async def teacher_me(teacher: dict = Depends(get_current_teacher)):
    """Returns current teacher's profile."""
    return JSONResponse({"success": True, "teacher": teacher})


@router.get("/list")
async def list_teachers(institute: dict = Depends(get_current_institute)):
    """List all teachers under this institute (admin only)."""
    rows = await database.fetch_all(
        """
        SELECT id, name, email, subject, phone, active, created_at
        FROM teachers
        WHERE institute_id = :iid
        ORDER BY name
        """,
        values={"iid": institute["id"]}
    )
    return JSONResponse({"teachers": [safe(r) for r in rows]})


@router.put("/{teacher_id}/active")
async def toggle_teacher_active(
    teacher_id: int,
    body: TeacherActiveIn,
    institute: dict = Depends(get_current_institute),
):
    """Suspend or activate a teacher (admin only)."""
    row = await database.fetch_one(
        "SELECT id FROM teachers WHERE id = :id AND institute_id = :iid",
        values={"id": teacher_id, "iid": institute["id"]}
    )
    if not row:
        raise HTTPException(404, "Teacher not found")
    await database.execute(
        "UPDATE teachers SET active = :active WHERE id = :id",
        values={"active": body.active, "id": teacher_id}
    )
    return JSONResponse({"success": True})


@router.delete("/{teacher_id}")
async def delete_teacher(
    teacher_id: int,
    institute: dict = Depends(get_current_institute),
):
    """Delete a teacher (admin only)."""
    row = await database.fetch_one(
        "SELECT id FROM teachers WHERE id = :id AND institute_id = :iid",
        values={"id": teacher_id, "iid": institute["id"]}
    )
    if not row:
        raise HTTPException(404, "Teacher not found")
    await database.execute(
        "DELETE FROM teachers WHERE id = :id",
        values={"id": teacher_id}
    )
    return JSONResponse({"success": True})
