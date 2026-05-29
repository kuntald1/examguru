"""
Vorpet Phase 3 — Superadmin Router
Only accessible with plan = 'superadmin'
Manages all institutes: create, list, suspend, assign plans
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import datetime
from decimal import Decimal

from app.services.db_service import database
from app.services.auth_service import hash_password
from app.dependencies import get_superadmin

router = APIRouter(prefix="/superadmin", tags=["Phase 3 — Superadmin"])


def safe_dict(row) -> dict:
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


# ── Models ────────────────────────────────────────────────────────────────────

class InstituteCreateIn(BaseModel):
    name: str
    email: str
    password: str
    plan: str = "starter"   # starter | basic | premium | school

class PlanUpdateIn(BaseModel):
    plan: str

class SuspendIn(BaseModel):
    active: bool


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/institutes")
async def list_institutes(admin=Depends(get_superadmin)):
    """List all institutes with student/exam counts"""
    rows = await database.fetch_all("""
        SELECT i.id, i.name, i.email, i.plan, i.active, i.created_at,
               COUNT(DISTINCT s.id)  as student_count,
               COUNT(DISTINCT e.id)  as exam_count,
               COUNT(DISTINCT b.id)  as batch_count
        FROM institutes i
        LEFT JOIN students s ON s.institute_id = i.id
        LEFT JOIN exams    e ON e.institute_id  = i.id
        LEFT JOIN batches  b ON b.institute_id  = i.id
        GROUP BY i.id
        ORDER BY i.created_at DESC
    """)
    return JSONResponse({"institutes": [safe_dict(r) for r in rows]})


@router.post("/institutes")
async def create_institute(payload: InstituteCreateIn, admin=Depends(get_superadmin)):
    """Create a new institute account"""
    valid_plans = ("starter", "basic", "premium", "school", "superadmin")
    if payload.plan not in valid_plans:
        raise HTTPException(400, f"plan must be one of: {', '.join(valid_plans)}")

    # Check email uniqueness
    existing = await database.fetch_one(
        "SELECT id FROM institutes WHERE email = :email",
        values={"email": payload.email.strip().lower()}
    )
    if existing:
        raise HTTPException(400, "Email already registered")

    pw_hash = hash_password(payload.password)
    result = await database.fetch_one("""
        INSERT INTO institutes (name, email, password_hash, plan, active)
        VALUES (:name, :email, :pw, :plan, TRUE)
        RETURNING id
    """, values={
        "name":  payload.name.strip(),
        "email": payload.email.strip().lower(),
        "pw":    pw_hash,
        "plan":  payload.plan,
    })
    return JSONResponse({"success": True, "institute_id": result["id"],
                         "message": f"Institute '{payload.name}' created"})


@router.put("/institutes/{institute_id}/plan")
async def update_plan(institute_id: int, payload: PlanUpdateIn, admin=Depends(get_superadmin)):
    """Change an institute's subscription plan"""
    valid_plans = ("starter", "basic", "premium", "school", "superadmin")
    if payload.plan not in valid_plans:
        raise HTTPException(400, f"plan must be one of: {', '.join(valid_plans)}")

    await database.execute(
        "UPDATE institutes SET plan = :plan WHERE id = :id",
        values={"plan": payload.plan, "id": institute_id}
    )
    return JSONResponse({"success": True})


@router.put("/institutes/{institute_id}/suspend")
async def suspend_institute(institute_id: int, payload: SuspendIn, admin=Depends(get_superadmin)):
    """Suspend or reactivate an institute"""
    # Prevent superadmin from suspending themselves
    if institute_id == admin["id"]:
        raise HTTPException(400, "Cannot suspend your own account")

    await database.execute(
        "UPDATE institutes SET active = :active WHERE id = :id",
        values={"active": payload.active, "id": institute_id}
    )
    action = "reactivated" if payload.active else "suspended"
    return JSONResponse({"success": True, "message": f"Institute {action}"})


@router.delete("/institutes/{institute_id}")
async def delete_institute(institute_id: int, admin=Depends(get_superadmin)):
    """Permanently delete an institute and ALL its data"""
    if institute_id == admin["id"]:
        raise HTTPException(400, "Cannot delete your own account")
    if institute_id == 1:
        raise HTTPException(400, "Cannot delete the root superadmin account")

    # Cascade delete in correct order
    await database.execute("""
        DELETE FROM student_fees_monthly WHERE student_id IN
            (SELECT id FROM students WHERE institute_id = :iid)
    """, values={"iid": institute_id})
    await database.execute("""
        DELETE FROM exam_results WHERE exam_access_id IN (
            SELECT ea.id FROM exam_access ea
            JOIN exams e ON ea.exam_id = e.id
            WHERE e.institute_id = :iid)
    """, values={"iid": institute_id})
    await database.execute("""
        DELETE FROM exam_access WHERE exam_id IN
            (SELECT id FROM exams WHERE institute_id = :iid)
    """, values={"iid": institute_id})
    await database.execute("""
        DELETE FROM exam_questions WHERE exam_id IN
            (SELECT id FROM exams WHERE institute_id = :iid)
    """, values={"iid": institute_id})
    await database.execute(
        "DELETE FROM exams WHERE institute_id = :iid", values={"iid": institute_id})
    await database.execute("""
        DELETE FROM batch_students WHERE student_id IN
            (SELECT id FROM students WHERE institute_id = :iid)
    """, values={"iid": institute_id})
    await database.execute(
        "DELETE FROM students WHERE institute_id = :iid", values={"iid": institute_id})
    await database.execute(
        "DELETE FROM batches WHERE institute_id = :iid", values={"iid": institute_id})
    await database.execute(
        "DELETE FROM institutes WHERE id = :iid", values={"iid": institute_id})

    return JSONResponse({"success": True, "message": "Institute and all data deleted"})


@router.get("/stats")
async def global_stats(admin=Depends(get_superadmin)):
    """Platform-wide statistics for superadmin dashboard"""
    row = await database.fetch_one("""
        SELECT
            COUNT(DISTINCT i.id) FILTER (WHERE i.plan != 'superadmin') as total_institutes,
            COUNT(DISTINCT i.id) FILTER (WHERE i.active AND i.plan != 'superadmin') as active_institutes,
            COUNT(DISTINCT s.id) as total_students,
            COUNT(DISTINCT e.id) as total_exams
        FROM institutes i
        LEFT JOIN students s ON s.institute_id = i.id
        LEFT JOIN exams    e ON e.institute_id  = i.id
    """)
    plan_rows = await database.fetch_all("""
        SELECT plan, COUNT(*) as count
        FROM institutes
        WHERE plan != 'superadmin'
        GROUP BY plan
    """)
    return JSONResponse({
        "total_institutes": row["total_institutes"],
        "active_institutes": row["active_institutes"],
        "total_students": row["total_students"],
        "total_exams": row["total_exams"],
        "by_plan": {r["plan"]: r["count"] for r in plan_rows},
    })


@router.post("/institutes/{institute_id}/reset-usage")
async def reset_institute_usage(institute_id: int, admin=Depends(get_superadmin)):
    """Superadmin resets an institute's current month question usage"""
    from app.services.quota_service import reset_usage
    await reset_usage(institute_id)
    return JSONResponse({"success": True, "message": "Usage reset to 0"})


@router.get("/institutes/{institute_id}/usage")
async def get_institute_usage(institute_id: int, admin=Depends(get_superadmin)):
    """Superadmin views an institute's current month usage"""
    from app.services.quota_service import get_current_usage
    usage = await get_current_usage(institute_id)
    return JSONResponse(usage)
