"""
backend/auth.py
===============
JWT authentication utilities for Bhustack3D.

Uses:
  - python-jose  for JWT (HS256)
  - passlib[bcrypt] for password hashing

Security note (pre-existing tech debt — intentionally out of scope for this task):
  SECRET_KEY is hardcoded here for prototype/hackathon convenience.
  In production this MUST be loaded from an environment variable or secrets manager.
  Do NOT change this without updating the existing token docs; see §6 of the NFR list.
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from database import get_db

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

# Pre-existing tech debt: hardcoded secret — do not "fix" as side effect of this task.
SECRET_KEY = os.environ.get("BHUSTACK_SECRET_KEY", "bhustack3d-sih26011-secret-key-prototype-only")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

import bcrypt

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)


# ─────────────────────────────────────────────────────────────────────────────
# Password Utilities
# ─────────────────────────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    """Hash a plain-text password using bcrypt (direct bcrypt to avoid passlib 4.x bug)."""
    pw_bytes = plain.encode("utf-8")[:72]
    return bcrypt.hashpw(pw_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plain-text password against its bcrypt hash."""
    try:
        pw_bytes = plain.encode("utf-8")[:72]
        hash_bytes = hashed.encode("utf-8")
        return bcrypt.checkpw(pw_bytes, hash_bytes)
    except Exception:
        return False


# ─────────────────────────────────────────────────────────────────────────────
# Token Utilities
# ─────────────────────────────────────────────────────────────────────────────

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a signed JWT access token.

    Args:
        data: Claims to embed (should include 'sub', 'email', 'role').
        expires_delta: Optional custom expiry. Defaults to ACCESS_TOKEN_EXPIRE_MINUTES.

    Returns:
        Signed JWT string (HS256).
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode["exp"] = expire
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    """
    Decode and verify a JWT access token.

    Raises:
        HTTPException 401 if the token is invalid or expired.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ─────────────────────────────────────────────────────────────────────────────
# FastAPI Dependency: get_current_user
# ─────────────────────────────────────────────────────────────────────────────

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    """
    FastAPI dependency: extract, verify, and return the authenticated user.

    Raises:
        HTTPException 401 if no token or invalid token.
        HTTPException 401 if the user_id from the token is not in the DB.
    """
    from models import User  # Local import to avoid circular dependency

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please include a Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(credentials.credentials)
    user_id: Optional[str] = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload: missing subject claim.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        uid = int(user_id)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload: subject is not a valid user ID.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == uid).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found. Token may be for a deleted account.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user
