"""Auth module - Supabase JWT verification and magic link."""

import os
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, APIKeyHeader
from supabase import create_client
from dotenv import load_dotenv

from app.database import ensure_user, get_user_by_id, reset_credits_if_needed

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
# Use service role or anon key that can verify JWT; anon key works with JWT from Supabase Auth
supabase = create_client(url, key)

security = HTTPBearer(auto_error=False)


def verify_token(credentials: HTTPAuthorizationCredentials | None) -> dict:
    """
    Verify Supabase JWT and return user payload.
    Expects: Authorization: Bearer <access_token>
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header",
        )
    token = credentials.credentials
    try:
        # Supabase get_user checks the JWT
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )
        return user_response.user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict:
    """
    Dependency: verify JWT and return our app user (from public.users).
    Ensures user exists in public.users and returns refreshed credits if reset needed.
    """
    auth_user = verify_token(credentials)
    user_id = str(auth_user.id)
    email = auth_user.email or ""
    user = ensure_user(user_id, email)
    # Reset credits if new month
    updated = reset_credits_if_needed(user)
    if updated:
        user = updated
    return user
