"""
Vorpet Phase 3 — Quota Service
Tracks monthly question generation usage per institute.
Enforces limits based on subscription plan.
"""

import datetime
from app.services.db_service import database

# ── Plan limits ───────────────────────────────────────────────────────────────

PLAN_LIMITS = {
    "starter":    80,
    "basic":      200,
    "premium":    500,
    "school":     1500,
    "superadmin": 999999,  # unlimited
}

FILES_PER_SESSION = {
    "starter":    3,
    "basic":      5,
    "premium":    10,
    "school":     999,
    "superadmin": 999,
}


async def ensure_usage_table():
    """Create usage table if it doesn't exist"""
    await database.execute("""
        CREATE TABLE IF NOT EXISTS institute_usage (
            id           SERIAL PRIMARY KEY,
            institute_id INTEGER NOT NULL,
            month        VARCHAR(7) NOT NULL,  -- YYYY-MM
            questions_used INTEGER DEFAULT 0,
            updated_at   TIMESTAMP DEFAULT NOW(),
            UNIQUE(institute_id, month)
        )
    """)


async def get_current_usage(institute_id: int) -> dict:
    """Returns current month usage and limit for an institute"""
    await ensure_usage_table()

    month = datetime.date.today().strftime("%Y-%m")

    # Get institute plan
    inst = await database.fetch_one(
        "SELECT plan FROM institutes WHERE id = :id",
        values={"id": institute_id}
    )
    plan = inst["plan"] if inst else "starter"
    limit = PLAN_LIMITS.get(plan, 80)

    # Get usage
    row = await database.fetch_one(
        "SELECT questions_used FROM institute_usage WHERE institute_id = :iid AND month = :month",
        values={"iid": institute_id, "month": month}
    )
    used = row["questions_used"] if row else 0

    return {
        "plan":       plan,
        "month":      month,
        "used":       used,
        "limit":      limit,
        "remaining":  max(0, limit - used),
        "percent":    round(used / limit * 100, 1) if limit > 0 else 0,
        "files_per_session": FILES_PER_SESSION.get(plan, 3),
    }


async def check_quota(institute_id: int, requested: int) -> tuple[bool, dict]:
    """
    Check if institute can generate `requested` more questions this month.
    Returns (allowed: bool, usage: dict)
    """
    usage = await get_current_usage(institute_id)
    allowed = usage["remaining"] >= requested
    return allowed, usage


async def record_usage(institute_id: int, questions_count: int):
    """Add to this month's usage count and send warning emails at 80% and 100%"""
    await ensure_usage_table()
    month = datetime.date.today().strftime("%Y-%m")

    await database.execute("""
        INSERT INTO institute_usage (institute_id, month, questions_used, updated_at)
        VALUES (:iid, :month, :count, NOW())
        ON CONFLICT (institute_id, month)
        DO UPDATE SET
            questions_used = institute_usage.questions_used + :count,
            updated_at = NOW()
    """, values={"iid": institute_id, "month": month, "count": questions_count})

    # Check if we should send a warning email
    usage = await get_current_usage(institute_id)
    pct   = usage["percent"]
    used  = usage["used"]
    limit = usage["limit"]

    # Send at exactly 80% threshold or 100%
    prev_pct = (used - questions_count) / limit * 100 if limit > 0 else 0
    try:
        if (prev_pct < 100 <= pct) or (prev_pct < 80 <= pct):
            inst = await database.fetch_one(
                "SELECT * FROM institutes WHERE id = :id",
                values={"id": institute_id}
            )
            if inst:
                from app.services.email_service import send_quota_warning
                await send_quota_warning(dict(inst), used, limit, pct)
    except Exception as e:
        print(f"[Quota] Email warning failed: {e}")


async def reset_usage(institute_id: int):
    """Reset current month usage (superadmin only)"""
    month = datetime.date.today().strftime("%Y-%m")
    await database.execute(
        "UPDATE institute_usage SET questions_used = 0 WHERE institute_id = :iid AND month = :month",
        values={"iid": institute_id, "month": month}
    )
