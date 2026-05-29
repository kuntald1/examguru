"""
Vorpet Phase 3 — Auth Router
POST /auth/login  → returns JWT token
GET  /auth/me     → returns current institute info (requires token)
"""

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.services.db_service import database
from app.services.auth_service import verify_password, create_access_token
from app.dependencies import get_current_institute

router = APIRouter(prefix="/auth", tags=["Phase 3 — Auth"])


# ── Request / Response models ─────────────────────────────────────────────────

class LoginIn(BaseModel):
    email: str
    password: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/login")
async def login(body: LoginIn):
    """
    Institute (or superadmin) login.
    Returns a JWT Bearer token valid for 12 hours.
    """
    row = await database.fetch_one(
        "SELECT id, name, email, plan, active, password_hash FROM institutes WHERE email = :email",
        values={"email": body.email.strip().lower()},
    )

    if not row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Invalid email or password")

    if not verify_password(body.password, row["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Invalid email or password")

    if not row["active"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Account suspended. Contact support.")

    token = create_access_token({"sub": str(row["id"])})

    return JSONResponse({
        "success": True,
        "access_token": token,
        "token_type": "bearer",
        "institute": {
            "id":   row["id"],
            "name": row["name"],
            "email": row["email"],
            "plan": row["plan"],
        }
    })


@router.get("/me")
async def me(institute: dict = Depends(get_current_institute)):
    """Returns current authenticated institute's profile"""
    return JSONResponse({
        "success": True,
        "institute": {
            "id":    institute["id"],
            "name":  institute["name"],
            "email": institute["email"],
            "plan":  institute["plan"],
        }
    })


@router.post("/logout")
async def logout():
    """
    Stateless JWT — logout is handled client-side by deleting the token.
    This endpoint exists so the frontend has a consistent API to call.
    """
    return JSONResponse({"success": True, "message": "Logged out. Delete token on client."})
