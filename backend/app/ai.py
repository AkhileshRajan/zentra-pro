"""AI module - OpenAI chat and file summary."""

import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def chat_completion(messages: list[dict], user_context: str = "") -> str:
    """
    Send messages to OpenAI and return assistant reply.
    user_context can include file summary or score context.
    """
    system = (
        "You are Zentra, an AI financial copilot for India. "
        "You help users with budgeting, savings, taxes (Indian context), and financial decisions. "
        "Be concise, practical, and use INR when mentioning money."
    )
    if user_context:
        system += f"\n\nRelevant context:\n{user_context}"
    full_messages = [{"role": "system", "content": system}] + messages
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=full_messages,
        max_tokens=1024,
    )
    return response.choices[0].message.content or ""


def summarize_file_text(text: str, file_type: str) -> str:
    """Summarize extracted text from PDF/Excel for AI context."""
    prompt = (
        f"Summarize the following {file_type} content in a structured way for a financial copilot. "
        "Include: key numbers, dates, categories, and any financial metrics. "
        "Keep it under 800 words."
    )
    return chat_completion([{"role": "user", "content": f"{prompt}\n\n{text[:12000]}"}])
