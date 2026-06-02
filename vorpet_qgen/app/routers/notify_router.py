"""
ExamGuru Phase 6 — Push Notifications + Call History + Attendance
"""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import datetime, os, json
from decimal import Decimal
from app.services.db_service import database

router = APIRouter(tags=["Phase 6 — Notifications & History"])

VAPID_PUBLIC_KEY  = os.getenv("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "")
VAPID_EMAIL       = os.getenv("VAPID_EMAIL", "mailto:info@vorpet.com")


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
    return out


class PushSubscribeIn(BaseModel):
    student_id:   int
    institute_id: int
    endpoint:     str
    p256dh:       str
    auth:         str

class JoinLogIn(BaseModel):
    room_code:        str
    participant_name: str
    role:             str = "student"
    student_id:       Optional[int] = None


@router.get("/notify/vapid-public-key")
async def get_vapid_public_key():
    return JSONResponse({"public_key": VAPID_PUBLIC_KEY})


@router.post("/notify/subscribe")
async def subscribe_push(body: PushSubscribeIn):
    await database.execute(
        """
        INSERT INTO push_subscriptions (student_id, institute_id, endpoint, p256dh, auth)
        VALUES (:sid, :iid, :ep, :p256dh, :auth)
        ON CONFLICT (endpoint) DO UPDATE SET p256dh=:p256dh, auth=:auth
        """,
        values={"sid":body.student_id,"iid":body.institute_id,"ep":body.endpoint,"p256dh":body.p256dh,"auth":body.auth}
    )
    return JSONResponse({"success": True})


async def _send_push(endpoint, p256dh, auth, title, body_text, data=None):
    from pywebpush import webpush, WebPushException
    import asyncio
    payload = json.dumps({"title":title,"body":body_text,"icon":"/favicon.svg","data":data or {}})
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, lambda: webpush(
        subscription_info={"endpoint":endpoint,"keys":{"p256dh":p256dh,"auth":auth}},
        data=payload,
        vapid_private_key=VAPID_PRIVATE_KEY,
        vapid_claims={"sub":VAPID_EMAIL},
        content_encoding="aes128gcm",
    ))


@router.post("/notify/send/{batch_id}")
async def send_push_to_batch(batch_id: int, request: Request):
    from app.services.auth_service import decode_token
    auth = request.headers.get("Authorization","")
    if not auth.startswith("Bearer "):
        raise HTTPException(401,"Login required")
    body = await request.json()
    room_code    = body.get("room_code","")
    teacher_name = body.get("teacher_name","Your teacher")
    title        = body.get("title", f"📹 {teacher_name} started a group call!")
    message      = body.get("message", f"Join with code: {room_code}")

    subs = await database.fetch_all(
        """SELECT ps.* FROM push_subscriptions ps
           JOIN batch_students bs ON bs.student_id=ps.student_id
           WHERE bs.batch_id=:bid""",
        values={"bid":batch_id}
    )
    sent=0; failed=0
    for sub in subs:
        try:
            await _send_push(sub["endpoint"],sub["p256dh"],sub["auth"],title,message,{"room_code":room_code})
            sent+=1
        except Exception as e:
            print(f"Push failed: {e}"); failed+=1
    return JSONResponse({"success":True,"sent":sent,"failed":failed})


@router.post("/notify/send-student/{student_id}")
async def send_push_to_student(student_id: int, request: Request):
    body         = await request.json()
    room_code    = body.get("room_code","")
    teacher_name = body.get("teacher_name","Your teacher")
    subs = await database.fetch_all(
        "SELECT * FROM push_subscriptions WHERE student_id=:sid",
        values={"sid":student_id}
    )
    sent=0
    for sub in subs:
        try:
            await _send_push(sub["endpoint"],sub["p256dh"],sub["auth"],
                f"📞 {teacher_name} is calling you!",
                f"Join with code: {room_code}",
                {"room_code":room_code})
            sent+=1
        except Exception as e:
            print(f"Push failed: {e}")
    return JSONResponse({"success":True,"sent":sent})


@router.post("/call/join-log")
async def log_join(body: JoinLogIn):
    room = await database.fetch_one(
        "SELECT id, institute_id FROM call_rooms WHERE room_code=:code",
        values={"code":body.room_code.upper()}
    )
    if not room:
        return JSONResponse({"success":False,"error":"Room not found"})
    existing = await database.fetch_one(
        "SELECT id FROM call_participants WHERE room_id=:rid AND participant_name=:name",
        values={"rid":room["id"],"name":body.participant_name}
    )
    if existing:
        return JSONResponse({"success":True,"already_logged":True})
    await database.execute(
        """INSERT INTO call_participants
           (room_id,room_code,student_id,participant_name,role,institute_id)
           VALUES (:rid,:code,:sid,:name,:role,:iid)""",
        values={"rid":room["id"],"code":body.room_code.upper(),"sid":body.student_id,
                "name":body.participant_name,"role":body.role,"iid":room["institute_id"]}
    )
    await database.execute(
        "UPDATE call_rooms SET participant_count=(SELECT COUNT(*) FROM call_participants WHERE room_id=:rid) WHERE id=:rid",
        values={"rid":room["id"]}
    )
    return JSONResponse({"success":True})


@router.post("/call/leave-log")
async def log_leave(body: JoinLogIn):
    await database.execute(
        "UPDATE call_participants SET left_at=NOW() WHERE room_code=:code AND participant_name=:name AND left_at IS NULL",
        values={"code":body.room_code.upper(),"name":body.participant_name}
    )
    return JSONResponse({"success":True})


@router.get("/call/history")
async def call_history(request: Request):
    from app.services.auth_service import decode_token
    auth = request.headers.get("Authorization","")
    if not auth.startswith("Bearer "):
        raise HTTPException(401,"Login required")
    payload = decode_token(auth.split(" ",1)[1])
    if not payload:
        raise HTTPException(401,"Invalid token")
    role = payload.get("role","institute")
    if role == "teacher":
        row = await database.fetch_one("SELECT institute_id FROM teachers WHERE id=:id",values={"id":int(payload["sub"])})
        iid = row["institute_id"] if row else 0
    else:
        iid = int(payload["sub"])
    rooms = await database.fetch_all(
        """SELECT cr.*,
               COUNT(cp.id) as participant_count,
               EXTRACT(EPOCH FROM (COALESCE(cr.ended_at,NOW())-cr.created_at))::int as duration_seconds
           FROM call_rooms cr
           LEFT JOIN call_participants cp ON cp.room_id=cr.id
           WHERE cr.institute_id=:iid
           GROUP BY cr.id
           ORDER BY cr.created_at DESC LIMIT 100""",
        values={"iid":iid}
    )
    return JSONResponse({"history":[safe(r) for r in rooms]})


@router.get("/call/attendance/{room_code}")
async def call_attendance(room_code: str):
    rows = await database.fetch_all(
        """SELECT cp.*,
               EXTRACT(EPOCH FROM (COALESCE(cp.left_at,NOW())-cp.joined_at))::int as duration_seconds
           FROM call_participants cp WHERE cp.room_code=:code ORDER BY cp.joined_at""",
        values={"code":room_code.upper()}
    )
    return JSONResponse({"attendance":[safe(r) for r in rows]})


@router.get("/call/history/student/{student_id}")
async def student_call_history(student_id: int):
    rows = await database.fetch_all(
        """SELECT cp.*,cr.title,cr.room_type,cr.host_name,
               EXTRACT(EPOCH FROM (COALESCE(cp.left_at,NOW())-cp.joined_at))::int as duration_seconds
           FROM call_participants cp
           JOIN call_rooms cr ON cr.room_code=cp.room_code
           WHERE cp.student_id=:sid ORDER BY cp.joined_at DESC LIMIT 50""",
        values={"sid":student_id}
    )
    return JSONResponse({"history":[safe(r) for r in rows]})
