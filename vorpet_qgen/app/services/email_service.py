"""
Vorpet Phase 4 — Email Service
Gmail SMTP via aiosmtplib
Configure in .env:
  EMAIL_HOST=smtp.gmail.com
  EMAIL_PORT=587
  EMAIL_USER=support@vorpet.com
  EMAIL_PASS=<Gmail App Password>
  EMAIL_FROM=Vorpet <support@vorpet.com>
"""

import os
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USER = os.getenv("EMAIL_USER", "support@vorpet.com")
EMAIL_PASS = os.getenv("EMAIL_PASS", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", "Vorpet <support@vorpet.com>")


async def _send(to: str, subject: str, html: str):
    """Core send function — supports both STARTTLS (587) and SSL (465)"""
    if not EMAIL_PASS:
        print(f"[Email] No password set — skipping email to {to}: {subject}")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = EMAIL_FROM
    msg["To"]      = to
    msg.attach(MIMEText(html, "html"))

    try:
        if EMAIL_PORT == 465:
            # SSL mode (Hostinger, some others)
            await aiosmtplib.send(
                msg,
                hostname=EMAIL_HOST,
                port=EMAIL_PORT,
                username=EMAIL_USER,
                password=EMAIL_PASS,
                use_tls=True,
            )
        else:
            # STARTTLS mode (Gmail port 587)
            await aiosmtplib.send(
                msg,
                hostname=EMAIL_HOST,
                port=EMAIL_PORT,
                username=EMAIL_USER,
                password=EMAIL_PASS,
                start_tls=True,
            )
        print(f"[Email] ✅ Sent to {to}: {subject}")
    except Exception as e:
        print(f"[Email] ❌ Failed to {to}: {e}")


def _base_template(title: str, body: str) -> str:
    return f"""
    <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e0e0e0;">
      <div style="background:#2E7D32;padding:24px 32px;">
        <div style="font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.5px;">
          Vor<span style="color:#A5D6A7;">pet</span>
        </div>
        <div style="font-size:12px;color:#A5D6A7;margin-top:2px;">OMR · Question Management System</div>
      </div>
      <div style="padding:28px 32px;">
        <h2 style="font-size:18px;font-weight:700;margin:0 0 16px;color:#1A2E1A;">{title}</h2>
        {body}
      </div>
      <div style="background:#F5F5F5;padding:16px 32px;font-size:11px;color:#888;border-top:1px solid #e0e0e0;">
        Vorpet Education Technology · support@vorpet.com
      </div>
    </div>
    """


# ── Payment submitted — notify superadmin ────────────────────────────────────

async def send_payment_notification(institute: dict, plan: str, amount: int, txn_id: str, to_email: str = None):
    """Notify superadmin — sends to `to_email` (fetched from DB) or falls back to EMAIL_USER"""
    recipient = to_email or EMAIL_USER
    html = _base_template(
        "💳 New Payment Received",
        f"""
        <p style="color:#555;line-height:1.6;">A new payment has been submitted and is awaiting your approval.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr style="background:#F1F8E9;"><td style="padding:10px 14px;font-weight:600;color:#2E7D32;width:40%;">Institute</td><td style="padding:10px 14px;">{institute.get('name','')}</td></tr>
          <tr><td style="padding:10px 14px;font-weight:600;color:#555;">Email</td><td style="padding:10px 14px;">{institute.get('email','')}</td></tr>
          <tr style="background:#F1F8E9;"><td style="padding:10px 14px;font-weight:600;color:#2E7D32;">Plan</td><td style="padding:10px 14px;">{plan.title()}</td></tr>
          <tr><td style="padding:10px 14px;font-weight:600;color:#555;">Amount</td><td style="padding:10px 14px;font-weight:700;color:#2E7D32;">₹{amount}</td></tr>
          <tr style="background:#F1F8E9;"><td style="padding:10px 14px;font-weight:600;color:#2E7D32;">Transaction ID</td><td style="padding:10px 14px;font-family:monospace;">{txn_id}</td></tr>
        </table>
        <p style="color:#555;">Login to the superadmin panel to approve or reject this payment.</p>
        <a href="http://localhost:3030" style="display:inline-block;background:#2E7D32;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px;">Open Admin Panel →</a>
        """
    )
    await _send(recipient, f"[Vorpet] Payment from {institute.get('name','')} — ₹{amount}", html)


# ── Payment approved — notify institute ──────────────────────────────────────

async def send_approval_email(institute: dict, plan: str):
    PLAN_LIMITS = {"starter": 80, "basic": 200, "premium": 500, "school": 1500}
    limit = PLAN_LIMITS.get(plan, 80)
    html = _base_template(
        "✅ Payment Approved — Plan Activated",
        f"""
        <p style="color:#555;line-height:1.6;">Great news! Your payment has been verified and your plan has been upgraded.</p>
        <div style="background:#E8F5E9;border:1.5px solid #C8E6C9;border-radius:10px;padding:20px;margin:16px 0;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#2E7D32;margin-bottom:4px;">{plan.title()} Plan</div>
          <div style="font-size:14px;color:#555;">{limit} questions/month · Active now</div>
        </div>
        <p style="color:#555;line-height:1.6;">Your question quota has been reset to {limit} for this month. Login to start generating question papers.</p>
        <a href="http://localhost:3030" style="display:inline-block;background:#2E7D32;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px;">Start Generating →</a>
        """
    )
    await _send(institute.get("email", ""), f"[Vorpet] Your {plan.title()} plan is now active!", html)


# ── Quota warning ─────────────────────────────────────────────────────────────

async def send_quota_warning(institute: dict, used: int, limit: int, percent: float):
    remaining = limit - used
    level = "100%" if remaining == 0 else "80%"
    html = _base_template(
        f"⚠ Question Quota {level} Used",
        f"""
        <p style="color:#555;line-height:1.6;">Your question generation quota for this month is running low.</p>
        <div style="background:#FFF8E1;border:1.5px solid #FFE082;border-radius:10px;padding:20px;margin:16px 0;">
          <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
            <span style="font-weight:600;color:#555;">Used</span>
            <span style="font-weight:700;color:#F9A825;">{used} / {limit}</span>
          </div>
          <div style="height:8px;background:#FFF3E0;border-radius:4px;overflow:hidden;">
            <div style="height:100%;width:{min(percent,100):.0f}%;background:{'#E53935' if remaining==0 else '#FB8C00'};border-radius:4px;"></div>
          </div>
          <div style="margin-top:8px;font-size:13px;color:#555;">
            {'<b style="color:#E53935;">Monthly limit reached.</b> Upgrade your plan to continue.' if remaining==0 else f'<b>{remaining} questions remaining</b> this month.'}
          </div>
        </div>
        <a href="http://localhost:3030" style="display:inline-block;background:#2E7D32;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px;">Upgrade Plan →</a>
        """
    )
    subject = f"[Vorpet] Question quota limit reached" if remaining == 0 else f"[Vorpet] 80% of your question quota used"
    await _send(institute.get("email", ""), subject, html)
