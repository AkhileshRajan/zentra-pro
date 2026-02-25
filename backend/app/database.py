"""Database module - Supabase client and user/score operations."""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

if not url or not key:
    raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set")

supabase: Client = create_client(url, key)

# Constants
CREDITS_PER_PROMPT = 10
FREE_CREDITS_PER_MONTH = 50
PAID_CREDITS_PER_MONTH = 100
SUBSCRIPTION_AMOUNT_INR = 2000


def get_user_by_email(email: str) -> dict | None:
    """Get user by email from public.users (or auth.users + profiles)."""
    res = supabase.table("users").select("*").eq("email", email).execute()
    if res.data and len(res.data) > 0:
        return res.data[0]
    return None


def get_user_by_id(user_id: str) -> dict | None:
    """Get user by id."""
    res = supabase.table("users").select("*").eq("id", user_id).execute()
    if res.data and len(res.data) > 0:
        return res.data[0]
    return None


def create_user(user_id: str, email: str) -> dict:
    """Create new user with default credits and subscription_status."""
    data = {
        "id": user_id,
        "email": email,
        "credits": FREE_CREDITS_PER_MONTH,
        "subscription_status": "free",
        "credits_reset_at": _next_month_iso(),
    }
    res = supabase.table("users").insert(data).execute()
    return res.data[0]


def ensure_user(user_id: str, email: str) -> dict:
    """Get or create user."""
    user = get_user_by_id(user_id)
    if user:
        return user
    return create_user(user_id, email)


def deduct_credits(user_id: str, amount: int = CREDITS_PER_PROMPT) -> tuple[bool, str | None]:
    """
    Deduct credits from user. Returns (success, error_message).
    Caller should reset credits if new month (handled in auth or here).
    """
    user = get_user_by_id(user_id)
    if not user:
        return False, "User not found"
    current = int(user.get("credits", 0))
    if current < amount:
        return False, "Insufficient credits"
    new_credits = current - amount
    supabase.table("users").update({"credits": new_credits}).eq("id", user_id).execute()
    return True, None


def set_subscription_active(user_id: str) -> None:
    """Set subscription_status to active and refresh credits for paid tier."""
    supabase.table("users").update({
        "subscription_status": "active",
        "credits": PAID_CREDITS_PER_MONTH,
        "credits_reset_at": _next_month_iso(),
    }).eq("id", user_id).execute()


def set_subscription_cancelled(user_id: str) -> None:
    """Set subscription_status to cancelled."""
    supabase.table("users").update({"subscription_status": "cancelled"}).eq("id", user_id).execute()


def _next_month_iso() -> str:
    """Return first day of next month in ISO format for credits reset."""
    from datetime import date
    today = date.today()
    if today.month == 12:
        next_month = date(today.year + 1, 1, 1)
    else:
        next_month = date(today.year, today.month + 1, 1)
    return next_month.isoformat()


def reset_credits_if_needed(user: dict) -> dict | None:
    """
    If credits_reset_at has passed, reset credits based on subscription_status.
    Returns updated user dict or None if no update.
    """
    reset_at = user.get("credits_reset_at")
    if not reset_at:
        return None
    from datetime import date
    try:
        reset_date = date.fromisoformat(reset_at)
    except Exception:
        return None
    if date.today() < reset_date:
        return None
    user_id = user["id"]
    status = user.get("subscription_status", "free")
    credits = PAID_CREDITS_PER_MONTH if status == "active" else FREE_CREDITS_PER_MONTH
    supabase.table("users").update({
        "credits": credits,
        "credits_reset_at": _next_month_iso(),
    }).eq("id", user_id).execute()
    return get_user_by_id(user_id)


def save_zentra_score(user_id: str, income: float, expenses: float, savings: float, debt: float, score: float) -> dict:
    """Save Zentra score to database."""
    data = {
        "user_id": user_id,
        "income": income,
        "expenses": expenses,
        "savings": savings,
        "debt": debt,
        "score": score,
    }
    res = supabase.table("zentra_scores").insert(data).execute()
    return res.data[0]
