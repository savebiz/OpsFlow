"""
ArchiveOps Authentication & Role-Based Access Control (RBAC)
DataGuard Document Management Limited
"""
import sys
import os
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import time
import json
import hmac
import hashlib
import base64
from typing import Optional, Dict, Any
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

SECRET_KEY = os.getenv("ARCHIVEOPS_SECRET_KEY", "dataguard-archiveops-jwt-secret-key-2026")
ALGORITHM = "HS256"

security = HTTPBearer(auto_error=False)


def _base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')


def _base64url_decode(data_str: str) -> bytes:
    padding = '=' * (4 - (len(data_str) % 4))
    return base64.urlsafe_b64decode(data_str + padding)


def create_token(user_id: str, name: str, role: str, expires_in_seconds: int = 86400) -> str:
    """Generate a JWT token for a user."""
    header = {"alg": ALGORITHM, "typ": "JWT"}
    payload = {
        "sub": user_id,
        "name": name,
        "role": role,
        "iat": int(time.time()),
        "exp": int(time.time()) + expires_in_seconds,
    }

    header_b64 = _base64url_encode(json.dumps(header).encode('utf-8'))
    payload_b64 = _base64url_encode(json.dumps(payload).encode('utf-8'))

    signature_input = f"{header_b64}.{payload_b64}".encode('utf-8')
    signature = hmac.new(SECRET_KEY.encode('utf-8'), signature_input, hashlib.sha256).digest()
    signature_b64 = _base64url_encode(signature)

    return f"{header_b64}.{payload_b64}.{signature_b64}"


def verify_token(token: str) -> Dict[str, Any]:
    """Verify a JWT token and return the payload."""
    try:
        parts = token.split('.')
        if len(parts) != 3:
            raise HTTPException(status_code=401, detail="Invalid token format")

        header_b64, payload_b64, signature_b64 = parts
        signature_input = f"{header_b64}.{payload_b64}".encode('utf-8')
        expected_sig = hmac.new(SECRET_KEY.encode('utf-8'), signature_input, hashlib.sha256).digest()
        actual_sig = _base64url_decode(signature_b64)

        if not hmac.compare_digest(expected_sig, actual_sig):
            raise HTTPException(status_code=401, detail="Invalid token signature")

        payload = json.loads(_base64url_decode(payload_b64).decode('utf-8'))
        if payload.get("exp", 0) < time.time():
            raise HTTPException(status_code=401, detail="Token has expired")

        return payload
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")


def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Security(security)) -> Dict[str, Any]:
    """FastAPI Dependency: Extract user payload from Authorization Bearer token."""
    if not credentials:
        # Default mock fallback for demo mode
        return {"sub": "u1", "name": "Adebayo Okonkwo", "role": "Team Lead"}
    return verify_token(credentials.credentials)


def require_role(allowed_roles: list[str]):
    """FastAPI Dependency: Enforce role-based access control."""
    def role_checker(user: Dict[str, Any] = Depends(get_current_user)):
        user_role = user.get("role", "")
        if user_role not in allowed_roles and "ADMIN" not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Requires one of roles: {allowed_roles}. Current role: {user_role}"
            )
        return user
    return role_checker
