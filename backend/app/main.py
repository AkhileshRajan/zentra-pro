"""FastAPI application - Zentra API."""

import os
from pathlib import Path
from dotenv import load_dotenv

# 🔥 Load .env BEFORE importing anything from app
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# Optional safety check
if not os.getenv("SUPABASE_URL") or not os.getenv("SUPABASE_KEY"):
    raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set")

import io
import pandas as pd
from PyPDF2 import PdfReader

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# 🔥 Import app modules AFTER dotenv is loaded
from app.auth import get_current_user
from app.database import (
    deduct_credits,
    CREDITS_PER_PROMPT,
    save_zentra_score,
)
from app.ai import chat_completion, summarize_file_text

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
from PyPDF2 import PdfReader
from dotenv import load_dotenv

from app.auth import get_current_user
from app.database import (
    deduct_credits,
    CREDITS_PER_PROMPT,
    save_zentra_score,
)
from app.ai import chat_completion, summarize_file_text

load_dotenv()

app = FastAPI(title="Zentra API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("FRONTEND_URL", "http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Request/Response models ---

class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


class ZentraScoreRequest(BaseModel):
    income: float
    expenses: float
    savings: float
    debt: float


# --- Routes ---

@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/me")
def me(user: dict = Depends(get_current_user)):
    """Current user profile with credits and subscription."""
    return {
        "id": user["id"],
        "email": user["email"],
        "credits": user["credits"],
        "subscription_status": user.get("subscription_status", "free"),
        "created_at": user.get("created_at"),
    }


@app.post("/chat")
def chat(req: ChatRequest, user: dict = Depends(get_current_user)):
    """AI chat: deduct 10 credits and return OpenAI response."""
    success, err = deduct_credits(user["id"], CREDITS_PER_PROMPT)
    if not success:
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail=err or "Insufficient credits")
    messages = [{"role": m.role, "content": m.content} for m in req.messages]
    reply = chat_completion(messages)
    return {"message": {"role": "assistant", "content": reply}, "credits_used": CREDITS_PER_PROMPT}


@app.post("/zentra-score")
def zentra_score(req: ZentraScoreRequest, user: dict = Depends(get_current_user)):
    """
    Calculate Zentra score from income, expenses, savings, debt.
    Formula: weighted score 0-100, higher savings and lower debt = better.
    """
    income = max(0, req.income)
    expenses = max(0, req.expenses)
    savings = max(0, req.savings)
    debt = max(0, req.debt)
    # Simple formula: savings rate positive, debt negative
    if income > 0:
        savings_rate = savings / income
        expense_rate = expenses / income
    else:
        savings_rate = 0
        expense_rate = 0
    # Score 0-100: base 50 + savings bonus - debt penalty
    score = 50 + min(30, savings_rate * 60) - min(40, (debt / max(income, 1)) * 40) - min(20, expense_rate * 20)
    score = max(0, min(100, round(score, 1)))
    row = save_zentra_score(user["id"], income, expenses, savings, debt, score)
    return {"score": score, "record": row}


@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """Upload PDF or Excel; parse and return AI summary. Deducts 10 credits."""
    success, err = deduct_credits(user["id"], CREDITS_PER_PROMPT)
    if not success:
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail=err or "Insufficient credits")
    content = await file.read()
    filename = (file.filename or "").lower()
    text = ""
    if filename.endswith(".pdf"):
        try:
            reader = PdfReader(io.BytesIO(content))
            for page in reader.pages:
                text += page.extract_text() or ""
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid PDF: {e}")
        file_type = "PDF"
    elif filename.endswith(".xlsx") or filename.endswith(".xls"):
        try:
            df = pd.read_excel(io.BytesIO(content), sheet_name=None)
            parts = []
            for name, sheet in df.items():
                parts.append(f"Sheet: {name}\n{sheet.to_string()}")
            text = "\n\n".join(parts)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid Excel: {e}")
        file_type = "Excel"
    else:
        raise HTTPException(status_code=400, detail="Only PDF and Excel files are allowed")
    if not text.strip():
        raise HTTPException(status_code=400, detail="No text could be extracted from the file")
    summary = summarize_file_text(text, file_type)
    return {"summary": summary, "credits_used": CREDITS_PER_PROMPT}

