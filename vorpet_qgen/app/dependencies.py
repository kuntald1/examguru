"""
Vorpet Phase 3 — FastAPI Dependencies
Provides get_current_institute dependency that:
  1. Reads Bearer token from Authorization header
  2. Verifies JWT
  3. Returns institute info dict with id, email, plan, name

Usage in any router endpoint:
    @router.get("/something")
    async def my_endpoint(institute = Depends(get_current_institute)):
        iid = institute["id"]   # always the correct institute_id
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.services.auth_service import decode_token
from app.services.db_service import database

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_institute(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """
    Dependency — injects authenticated institute into every protected endpoint.
    Raises 401 if token is missing, invalid, or the institute is suspended.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated. Please login at /auth/login",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not credentials:
        raise credentials_exception

    payload = decode_token(credentials.credentials)
    if not payload:
        raise credentials_exception

    institute_id = payload.get("sub")
    if not institute_id:
        raise credentials_exception

    # Fetch fresh from DB so suspension takes effect immediately
    row = await database.fetch_one(
        "SELECT id, name, email, plan, active FROM institutes WHERE id = :id",
        values={"id": int(institute_id)},
    )
    if not row:
        raise credentials_exception

    if not row["active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been suspended. Contact support.",
        )

    return dict(row)


# ── Superadmin-only guard ─────────────────────────────────────────────────────

async def get_superadmin(
    institute: dict = Depends(get_current_institute),
) -> dict:
    """Only allows superadmin plan through"""
    if institute.get("plan") != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superadmin access required",
        )
    return institute


# ── Teacher guard ─────────────────────────────────────────────────────────────

async def get_current_teacher(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """
    Dependency — injects authenticated teacher into protected endpoints.
    Reads JWT with role=teacher.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Teacher login required",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not credentials:
        raise credentials_exception

    payload = decode_token(credentials.credentials)
    if not payload or payload.get("role") != "teacher":
        raise credentials_exception

    teacher_id = payload.get("sub")
    if not teacher_id:
        raise credentials_exception

    row = await database.fetch_one(
        "SELECT id, name, email, subject, phone, institute_id, active FROM teachers WHERE id = :id",
        values={"id": int(teacher_id)},
    )
    if not row:
        raise credentials_exception
    if not row["active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your teacher account has been suspended.",
        )
    return dict(row)
