"""
Vorpet Phase 4 — Billing Router
QR-based payment flow:
  Institute → sees QR + amount → pays via PhonePe/UPI → submits Transaction ID
  Superadmin → sees pending payments → approves → plan activates + quota resets
"""

import datetime
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from decimal import Decimal

from app.services.db_service import database
from app.dependencies import get_current_institute, get_superadmin
from app.services.quota_service import reset_usage

router = APIRouter(prefix="/billing", tags=["Phase 4 — Billing"])

# ── Plan config ───────────────────────────────────────────────────────────────

PLAN_PRICES = {
    "starter":  299,
    "basic":    699,
    "premium":  1499,
    "school":   3999,
}

PLAN_LABELS = {
    "starter":  "Starter (80 Q/month)",
    "basic":    "Basic (200 Q/month)",
    "premium":  "Premium (500 Q/month)",
    "school":   "School (1500 Q/month)",
}


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


# ── DB setup ──────────────────────────────────────────────────────────────────

async def ensure_billing_tables():
    await database.execute("""
        CREATE TABLE IF NOT EXISTS billing_payments (
            id              SERIAL PRIMARY KEY,
            institute_id    INTEGER NOT NULL,
            plan            VARCHAR(20) NOT NULL,
            amount          NUMERIC(10,2) NOT NULL,
            transaction_id  VARCHAR(100) NOT NULL,
            upi_app         VARCHAR(50) DEFAULT 'UPI',
            month           VARCHAR(7) NOT NULL,
            status          VARCHAR(20) DEFAULT 'pending',
            notes           TEXT DEFAULT '',
            submitted_at    TIMESTAMP DEFAULT NOW(),
            approved_at     TIMESTAMP,
            approved_by     INTEGER,
            UNIQUE(institute_id, transaction_id)
        )
    """)


# ── Models ────────────────────────────────────────────────────────────────────

class PaymentSubmitIn(BaseModel):
    plan: str
    transaction_id: str
    upi_app: str = "PhonePe"
    notes: str = ""

class PaymentApproveIn(BaseModel):
    notes: str = ""

class PaymentRejectIn(BaseModel):
    notes: str = ""


# ── Institute endpoints ───────────────────────────────────────────────────────

@router.get("/plans")
async def get_plans(institute: dict = Depends(get_current_institute)):
    """Return plan options with prices and current plan"""
    plans = []
    for key, price in PLAN_PRICES.items():
        plans.append({
            "key":      key,
            "label":    PLAN_LABELS[key],
            "price":    price,
            "current":  institute["plan"] == key,
        })
    return JSONResponse({
        "plans":        plans,
        "current_plan": institute["plan"],
        "qr_image_1":   "/static/qr/qr1.jpg",
        "qr_image_2":   "/static/qr/qr2.jpg",
        "upi_name":     "Kuntal Das",
        "upi_note":     "Send exact amount. Add your institute name in UPI remarks.",
    })


@router.post("/submit")
async def submit_payment(
    payload: PaymentSubmitIn,
    institute: dict = Depends(get_current_institute),
):
    """Institute submits transaction ID after paying"""
    await ensure_billing_tables()

    if payload.plan not in PLAN_PRICES:
        raise HTTPException(400, f"Invalid plan: {payload.plan}")

    if not payload.transaction_id.strip():
        raise HTTPException(400, "Transaction ID is required")

    amount = PLAN_PRICES[payload.plan]
    month  = datetime.date.today().strftime("%Y-%m")

    # Check for duplicate transaction ID
    existing = await database.fetch_one(
        "SELECT id FROM billing_payments WHERE transaction_id = :tid",
        values={"tid": payload.transaction_id.strip()}
    )
    if existing:
        raise HTTPException(400, "This transaction ID has already been submitted")

    # Check if already has pending payment for same month+plan
    pending = await database.fetch_one("""
        SELECT id FROM billing_payments
        WHERE institute_id = :iid AND month = :month AND status = 'pending'
    """, values={"iid": institute["id"], "month": month})
    if pending:
        raise HTTPException(400, "You already have a pending payment for this month. Please wait for approval.")

    result = await database.fetch_one("""
        INSERT INTO billing_payments
            (institute_id, plan, amount, transaction_id, upi_app, month, notes, status)
        VALUES (:iid, :plan, :amount, :tid, :app, :month, :notes, 'pending')
        RETURNING id
    """, values={
        "iid":    institute["id"],
        "plan":   payload.plan,
        "amount": amount,
        "tid":    payload.transaction_id.strip().upper(),
        "app":    payload.upi_app,
        "month":  month,
        "notes":  payload.notes,
    })

    # Send email notification to superadmin (fetch email from DB)
    try:
        from app.services.email_service import send_payment_notification
        superadmin = await database.fetch_one(
            "SELECT email FROM institutes WHERE plan = 'superadmin' LIMIT 1"
        )
        if superadmin:
            await send_payment_notification(
                institute, payload.plan, amount,
                payload.transaction_id, superadmin["email"]
            )
    except Exception as e:
        print(f"[Email] Payment notification failed: {e}")

    return JSONResponse({
        "success": True,
        "payment_id": result["id"],
        "message": f"Payment submitted! Superadmin will approve within 24 hours. Your plan will activate to {payload.plan.title()} after approval.",
    })


@router.get("/history")
async def payment_history(institute: dict = Depends(get_current_institute)):
    """Institute sees their own payment history"""
    await ensure_billing_tables()
    rows = await database.fetch_all("""
        SELECT id, plan, amount, transaction_id, upi_app, month,
               status, notes, submitted_at, approved_at
        FROM billing_payments
        WHERE institute_id = :iid
        ORDER BY submitted_at DESC
    """, values={"iid": institute["id"]})
    return JSONResponse({"payments": [safe_dict(r) for r in rows]})


@router.get("/status")
async def billing_status(institute: dict = Depends(get_current_institute)):
    """Current billing status — pending payment, active plan, next renewal"""
    await ensure_billing_tables()
    month = datetime.date.today().strftime("%Y-%m")

    pending = await database.fetch_one("""
        SELECT * FROM billing_payments
        WHERE institute_id = :iid AND status = 'pending'
        ORDER BY submitted_at DESC LIMIT 1
    """, values={"iid": institute["id"]})

    last_approved = await database.fetch_one("""
        SELECT * FROM billing_payments
        WHERE institute_id = :iid AND status = 'approved'
        ORDER BY approved_at DESC LIMIT 1
    """, values={"iid": institute["id"]})

    return JSONResponse({
        "current_plan":   institute["plan"],
        "pending_payment": safe_dict(pending) if pending else None,
        "last_payment":    safe_dict(last_approved) if last_approved else None,
        "month":           month,
    })


# ── Superadmin endpoints ──────────────────────────────────────────────────────

@router.get("/admin/pending")
async def admin_pending_payments(admin=Depends(get_superadmin)):
    """Superadmin sees all pending payments"""
    await ensure_billing_tables()
    rows = await database.fetch_all("""
        SELECT bp.*, i.name as institute_name, i.email as institute_email, i.plan as current_plan
        FROM billing_payments bp
        JOIN institutes i ON i.id = bp.institute_id
        WHERE bp.status = 'pending'
        ORDER BY bp.submitted_at ASC
    """)
    return JSONResponse({"payments": [safe_dict(r) for r in rows]})


@router.get("/admin/all")
async def admin_all_payments(admin=Depends(get_superadmin)):
    """Superadmin sees full payment history across all institutes"""
    await ensure_billing_tables()
    rows = await database.fetch_all("""
        SELECT bp.*, i.name as institute_name, i.email as institute_email, i.plan as current_plan
        FROM billing_payments bp
        JOIN institutes i ON i.id = bp.institute_id
        ORDER BY bp.submitted_at DESC
        LIMIT 200
    """)
    total = await database.fetch_one("""
        SELECT COALESCE(SUM(amount),0) as total
        FROM billing_payments WHERE status = 'approved'
    """)
    return JSONResponse({
        "payments": [safe_dict(r) for r in rows],
        "total_collected": float(total["total"]) if total else 0,
    })


@router.post("/admin/approve/{payment_id}")
async def approve_payment(
    payment_id: int,
    payload: PaymentApproveIn,
    admin=Depends(get_superadmin),
):
    """Superadmin approves a payment — activates plan + resets quota"""
    await ensure_billing_tables()

    payment = await database.fetch_one(
        "SELECT * FROM billing_payments WHERE id = :id",
        values={"id": payment_id}
    )
    if not payment:
        raise HTTPException(404, "Payment not found")
    if payment["status"] != "pending":
        raise HTTPException(400, f"Payment is already {payment['status']}")

    # Approve the payment
    await database.execute("""
        UPDATE billing_payments
        SET status = 'approved', approved_at = NOW(), approved_by = :admin_id,
            notes = CASE WHEN :notes != '' THEN :notes ELSE notes END
        WHERE id = :id
    """, values={"id": payment_id, "admin_id": admin["id"], "notes": payload.notes})

    # Upgrade institute plan
    await database.execute(
        "UPDATE institutes SET plan = :plan WHERE id = :iid",
        values={"plan": payment["plan"], "iid": payment["institute_id"]}
    )

    # Reset quota for the new month
    await reset_usage(payment["institute_id"])

    # Fetch institute fresh from DB (gets real name + email)
    inst = await database.fetch_one(
        "SELECT id, name, email, plan FROM institutes WHERE id = :id",
        values={"id": payment["institute_id"]}
    )

    # Send approval email to institute's actual email address
    try:
        from app.services.email_service import send_approval_email, send_payment_notification
        if inst:
            await send_approval_email(dict(inst), payment["plan"])
    except Exception as e:
        print(f"[Email] Approval email failed: {e}")

    return JSONResponse({
        "success": True,
        "message": f"Payment approved. {inst['name'] if inst else 'Institute'} upgraded to {payment['plan'].title()} plan.",
        "institute_email": inst["email"] if inst else None,
    })


@router.post("/admin/reject/{payment_id}")
async def reject_payment(
    payment_id: int,
    payload: PaymentRejectIn,
    admin=Depends(get_superadmin),
):
    """Superadmin rejects a payment (wrong amount, duplicate, fraud)"""
    await ensure_billing_tables()

    payment = await database.fetch_one(
        "SELECT * FROM billing_payments WHERE id = :id",
        values={"id": payment_id}
    )
    if not payment:
        raise HTTPException(404, "Payment not found")

    await database.execute("""
        UPDATE billing_payments
        SET status = 'rejected', approved_at = NOW(), approved_by = :admin_id,
            notes = :notes
        WHERE id = :id
    """, values={"id": payment_id, "admin_id": admin["id"],
                 "notes": payload.notes or "Rejected by admin"})

    return JSONResponse({"success": True, "message": "Payment rejected."})
