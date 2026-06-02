"""
ExamGuru Phase 5 — Video Call Router (WebRTC + LiveKit)
Uses LiveKit for industrial-standard WebRTC.
Works behind all firewalls (port 443 WebSocket).

Endpoints:
  POST /call/room/create          — teacher creates a room
  GET  /call/room/{code}          — get room info (anyone with code)
  GET  /call/rooms/active         — list active rooms for institute
  GET  /call/rooms/batch/{bid}    — active group call for a batch
  GET  /call/rooms/student/{sid}  — active 1-to-1 call for student
  POST /call/room/{code}/end      — teacher ends the room
  POST /call/token                — get LiveKit join token
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import datetime, os, random, string
from decimal import Decimal

from app.services.db_service import database
from app.dependencies import get_current_institute, get_current_teacher

router = APIRouter(prefix="/call", tags=["Phase 5 — Video Calls"])

LIVEKIT_URL    = os.getenv("LIVEKIT_URL",    "ws://localhost:7880")
LIVEKIT_KEY    = os.getenv("LIVEKIT_API_KEY",    "devkey")
LIVEKIT_SECRET = os.getenv("LIVEKIT_API_SECRET", "devsecret")


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
    return out


def gen_room_code(length=8) -> str:
    """Generate a short uppercase alphanumeric room code."""
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))


def make_livekit_token(room_name: str, participant_name: str, is_host: bool = False) -> str:
    """
    Generate a LiveKit access token.
    Uses livekit-server-sdk if available, else returns a simple signed JWT.
    """
    try:
        from livekit import api as lkapi
        token = lkapi.AccessToken(LIVEKIT_KEY, LIVEKIT_SECRET)
        token.with_identity(participant_name)
        token.with_name(participant_name)
        grants = lkapi.VideoGrants(
            room_join=True,
            room=room_name,
            can_publish=True,
            can_subscribe=True,
            room_admin=is_host,
        )
        token.with_grants(grants)
        return token.to_jwt()
    except ImportError:
        # Fallback: generate token manually using jose
        import time
        from jose import jwt as josejwt
        now = int(time.time())
        payload = {
            "iss": LIVEKIT_KEY,
            "sub": participant_name,
            "iat": now,
            "exp": now + 3600 * 4,   # 4 hour token
            "name": participant_name,
            "video": {
                "roomJoin": True,
                "room": room_name,
                "canPublish": True,
                "canSubscribe": True,
                "roomAdmin": is_host,
            }
        }
        return josejwt.encode(payload, LIVEKIT_SECRET, algorithm="HS256")


# ── Models ────────────────────────────────────────────────────────────────────

class CreateRoomIn(BaseModel):
    room_type:  str              # "one_to_one" | "group"
    title:      Optional[str] = ""
    batch_id:   Optional[int] = None   # for group call
    student_id: Optional[int] = None   # for 1-to-1

class JoinTokenIn(BaseModel):
    room_code:        str
    participant_name: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/room/create")
async def create_room(
    body: CreateRoomIn,
    request: Request,
):
    """
    Teacher creates a call room.
    Accepts teacher JWT (role=teacher) or institute JWT (role=institute).
    """
    # Support both teacher and institute tokens
    teacher = await _get_caller(request)
    if not teacher:
        raise HTTPException(401, "Login required")

    if body.room_type not in ("one_to_one", "group"):
        raise HTTPException(400, "room_type must be 'one_to_one' or 'group'")
    if body.room_type == "group" and not body.batch_id:
        raise HTTPException(400, "batch_id required for group call")
    if body.room_type == "one_to_one" and not body.student_id:
        raise HTTPException(400, "student_id required for 1-to-1 call")

    # End any previous active room by this teacher for same target
    if body.room_type == "group" and body.batch_id:
        await database.execute(
            "UPDATE call_rooms SET active=FALSE, ended_at=NOW() WHERE host_id=:hid AND batch_id=:bid AND active=TRUE",
            values={"hid": teacher["id"], "bid": body.batch_id}
        )
    elif body.room_type == "one_to_one" and body.student_id:
        await database.execute(
            "UPDATE call_rooms SET active=FALSE, ended_at=NOW() WHERE host_id=:hid AND student_id=:sid AND active=TRUE",
            values={"hid": teacher["id"], "sid": body.student_id}
        )

    # Generate unique room code
    code = gen_room_code()
    while await database.fetch_one("SELECT id FROM call_rooms WHERE room_code=:c", values={"c": code}):
        code = gen_room_code()

    room_id = await database.execute(
        """
        INSERT INTO call_rooms
            (institute_id, room_code, room_type, host_id, host_name, batch_id, student_id, title, active)
        VALUES (:iid, :code, :rtype, :hid, :hname, :bid, :sid, :title, TRUE)
        RETURNING id
        """,
        values={
            "iid":   teacher["institute_id"],
            "code":  code,
            "rtype": body.room_type,
            "hid":   teacher["id"],
            "hname": teacher["name"],
            "bid":   body.batch_id,
            "sid":   body.student_id,
            "title": body.title or "",
        }
    )

    # Generate LiveKit host token
    lk_token = make_livekit_token(code, teacher["name"], is_host=True)

    return JSONResponse({
        "success":      True,
        "room_code":    code,
        "room_id":      room_id,
        "livekit_url":  LIVEKIT_URL,
        "livekit_token": lk_token,
        "join_url":     f"/call/join/{code}",
    })


@router.get("/room/{code}")
async def get_room(code: str):
    """Get room info by code — used by students to join."""
    row = await database.fetch_one(
        """
        SELECT cr.*,
               b.name  as batch_name,
               s.name  as student_name
        FROM call_rooms cr
        LEFT JOIN batches  b ON b.id = cr.batch_id
        LEFT JOIN students s ON s.id = cr.student_id
        WHERE cr.room_code = :code
        """,
        values={"code": code.upper()}
    )
    if not row:
        raise HTTPException(404, "Room not found")
    return JSONResponse({"room": safe(row)})


@router.get("/rooms/active")
async def list_active_rooms(request: Request):
    """List all active call rooms for this institute (teacher or admin)."""
    caller = await _get_caller(request)
    if not caller:
        raise HTTPException(401, "Login required")
    rows = await database.fetch_all(
        """
        SELECT cr.*,
               b.name as batch_name,
               s.name as student_name
        FROM call_rooms cr
        LEFT JOIN batches  b ON b.id = cr.batch_id
        LEFT JOIN students s ON s.id = cr.student_id
        WHERE cr.institute_id = :iid AND cr.active = TRUE
        ORDER BY cr.created_at DESC
        """,
        values={"iid": caller["institute_id"]}
    )
    return JSONResponse({"rooms": [safe(r) for r in rows]})


@router.get("/rooms/batch/{batch_id}")
async def active_room_for_batch(batch_id: int):
    """
    Student calls this to check if there's an active group call for their batch.
    Public endpoint — student only needs batch_id.
    """
    row = await database.fetch_one(
        """
        SELECT cr.*, b.name as batch_name
        FROM call_rooms cr
        LEFT JOIN batches b ON b.id = cr.batch_id
        WHERE cr.batch_id = :bid AND cr.active = TRUE AND cr.room_type = 'group'
        ORDER BY cr.created_at DESC LIMIT 1
        """,
        values={"bid": batch_id}
    )
    if not row:
        return JSONResponse({"room": None})
    return JSONResponse({"room": safe(row)})


@router.get("/rooms/student/{student_id}")
async def active_room_for_student(student_id: int):
    """
    Student calls this to check for an active 1-to-1 call directed at them.
    Public endpoint.
    """
    row = await database.fetch_one(
        """
        SELECT cr.*, s.name as student_name
        FROM call_rooms cr
        LEFT JOIN students s ON s.id = cr.student_id
        WHERE cr.student_id = :sid AND cr.active = TRUE AND cr.room_type = 'one_to_one'
        ORDER BY cr.created_at DESC LIMIT 1
        """,
        values={"sid": student_id}
    )
    if not row:
        return JSONResponse({"room": None})
    return JSONResponse({"room": safe(row)})


@router.post("/room/{code}/end")
async def end_room(code: str, request: Request):
    """Teacher ends/closes a call room."""
    caller = await _get_caller(request)
    if not caller:
        raise HTTPException(401, "Login required")
    row = await database.fetch_one(
        "SELECT id, host_id FROM call_rooms WHERE room_code=:code",
        values={"code": code.upper()}
    )
    if not row:
        raise HTTPException(404, "Room not found")
    if row["host_id"] != caller["id"]:
        raise HTTPException(403, "Only the host can end this room")
    await database.execute(
        "UPDATE call_rooms SET active=FALSE, ended_at=NOW() WHERE room_code=:code",
        values={"code": code.upper()}
    )
    return JSONResponse({"success": True})


@router.post("/token")
async def get_join_token(body: JoinTokenIn):
    """
    Anyone with a room code and their name can get a LiveKit join token.
    Students use this to join a room.
    """
    row = await database.fetch_one(
        "SELECT id, active FROM call_rooms WHERE room_code=:code",
        values={"code": body.room_code.upper()}
    )
    if not row:
        raise HTTPException(404, "Room not found")
    if not row["active"]:
        raise HTTPException(410, "This call has ended")

    token = make_livekit_token(
        body.room_code.upper(),
        body.participant_name,
        is_host=False
    )
    return JSONResponse({
        "success":       True,
        "livekit_url":   LIVEKIT_URL,
        "livekit_token": token,
        "room_code":     body.room_code.upper(),
    })


# ── Internal helper ────────────────────────────────────────────────────────────

async def _get_caller(request: Request) -> Optional[dict]:
    """
    Extracts caller info from JWT — supports both teacher and institute tokens.
    Returns normalized dict with id, name, institute_id, role.
    """
    from app.services.auth_service import decode_token
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    payload = decode_token(auth.split(" ", 1)[1])
    if not payload:
        return None

    role = payload.get("role", "institute")

    if role == "teacher":
        teacher_id = int(payload["sub"])
        row = await database.fetch_one(
            "SELECT id, name, institute_id, active FROM teachers WHERE id=:id",
            values={"id": teacher_id}
        )
        if not row or not row["active"]:
            return None
        return {
            "id":           row["id"],
            "name":         row["name"],
            "institute_id": row["institute_id"],
            "role":         "teacher",
        }
    else:
        # Institute admin acting as host
        institute_id = int(payload["sub"])
        row = await database.fetch_one(
            "SELECT id, name, active FROM institutes WHERE id=:id",
            values={"id": institute_id}
        )
        if not row or not row["active"]:
            return None
        return {
            "id":           row["id"],
            "name":         row["name"],
            "institute_id": row["id"],
            "role":         "institute",
        }
