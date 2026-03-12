import os
from typing import Any, Dict, List

import requests
from dotenv import load_dotenv


load_dotenv()


ARK_API_KEY = os.getenv("ARK_API_KEY", "cac93c9b-7e90-4b8c-808d-e0d528421a39")
ARK_API_BASE = os.getenv(
    "ARK_API_BASE",
    "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
)
ARK_MODEL = os.getenv("ARK_MODEL", "doubao-seed-code-preview-251028")


class Persona:
    def __init__(self, code: str, name: str, system_prompt: str):
        self.code = code
        self.name = name
        self.system_prompt = system_prompt


PERSONAS: List[Persona] = [
    Persona(
        "warm_mentor",
        "Warm Mentor",
        "You are a warm, highly empathetic psychological mentor. "
        "Use simple, friendly language and basic principles from psychology "
        "and cognitive behavioral therapy to give specific, practical advice and emotional support.",
    ),
    Persona(
        "rational_coach",
        "Rational Coach",
        "You are a rational and structured growth coach. "
        "Help users break down problems and design step-by-step action plans.",
    ),
    Persona(
        "fun_friend",
        "Fun Friend",
        "You are a relaxed and slightly humorous good friend. "
        "Encourage users in a sincere but not over-sugary way.",
    ),
]


def get_persona_by_name(name: str) -> Persona:
    for p in PERSONAS:
        if p.name == name:
            return p
    return PERSONAS[0]


def analyze_diary(
    content: str,
    recent_keywords: Dict[str, int],
    persona_name: str,
    language: str = "auto",  # "auto" | "zh" | "en"
) -> Dict[str, Any]:
    """Call Volcengine Ark API to analyze diary emotion and return structured result."""
    persona = get_persona_by_name(persona_name)

    if not ARK_API_KEY:
        raise RuntimeError("Please configure ARK_API_KEY (Volcengine Ark API key).")

    # 语言控制：根据 language 参数决定回答语言
    if language == "zh":
        lang_instruction = (
            "You must answer in Simplified Chinese (简体中文). "
            "JSON keys must stay in English, but values (summary, advice, etc.) should be Chinese. "
        )
    elif language == "en":
        lang_instruction = (
            "You must answer in English only. "
            "JSON keys and values should be English. "
        )
    else:
        lang_instruction = (
            "You may answer in the same language as the diary content "
            "(Chinese or English), but keep JSON keys in English. "
        )

    system_text = (
        persona.system_prompt
        + "You are an AI assistant for an emotion diary app. "
        "The user will provide one diary entry (may contain emoji). "
        "Please: "
        "1) Identify the main emotion (e.g. happy, sad, depressed, anxious, angry, calm, mixed, etc.); "
        "2) Give an emotion intensity score from 0-100; "
        "3) Summarize the current psychological state in 1-3 short sentences; "
        "4) Provide 2-4 concrete, actionable suggestions for daily life or mental health; "
        "5) Recommend 2-4 suitable music styles; "
        "6) Recommend 2-4 suitable food types; "
        "7) Considering the high-frequency keywords from recent days, give 0-3 long-term reminders (things the user should pay attention to over time). "
        + lang_instruction
        + "Also, avoid emoji in the JSON values. "
        "You MUST respond with pure JSON only, with this exact schema: "
        '{"emotion": "...", "emotion_score": 80, "summary": "...", '
        '"advice": ["...", "..."], '
        '"music_suggestions": ["...", "..."], '
        '"food_suggestions": ["...", "..."], '
        '"keywords": {"keyword": count}, '
        '"notifications": ["...", "..."]}'
    )

    user_text = (
        "Here is the user diary content for today:\n"
        f"{content}\n\n"
        f"High-frequency keywords and counts in the last 14 days: {recent_keywords}\n"
        "Please analyze this in detail."
    )

    payload = {
        "model": ARK_MODEL,
        "messages": [
            {
                "role": "system",
                "content": [{"type": "text", "text": system_text}],
            },
            {
                "role": "user",
                "content": [{"type": "text", "text": user_text}],
            },
        ],
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {ARK_API_KEY}",
    }

    resp = requests.post(ARK_API_BASE, headers=headers, json=payload, timeout=30)
    #print("ARK status:", resp.status_code)
    #print("ARK raw text:", resp.text)
    resp.raise_for_status()

    data = resp.json()
    #print("ARK json:", data)

    # Ark 当前模型返回：choices[0].message.content 是一个 JSON 字符串
    # 但也兼容未来可能返回 content 为列表的情况。
    try:
        message = data["choices"][0]["message"]
        content_field = message.get("content")
        if isinstance(content_field, str):
            text = content_field.strip()
        elif isinstance(content_field, list):
            text = "".join(
                c.get("text", "") for c in content_field if c.get("type") == "text"
            ).strip()
        else:
            raise ValueError(f"Unsupported content type: {type(content_field)}")
    except Exception as exc:  # noqa: BLE001
        # Short message only; detailed error already printed above.
        raise RuntimeError("Failed to parse response from AI service.") from exc

    import json

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        # Fallback if model did not return strict JSON
        parsed = {
            "emotion": "unknown",
            "emotion_score": 50,
            "summary": text[:200],
            "advice": [text],
            "music_suggestions": [],
            "food_suggestions": [],
            "keywords": {},
            "notifications": [],
        }

    # Ensure all expected fields exist
    parsed.setdefault("emotion", "unknown")
    parsed.setdefault("emotion_score", 50)
    parsed.setdefault("summary", "")
    parsed.setdefault("advice", [])
    parsed.setdefault("music_suggestions", [])
    parsed.setdefault("food_suggestions", [])
    parsed.setdefault("keywords", {})
    parsed.setdefault("notifications", [])

    return parsed


__all__ = ["PERSONAS", "analyze_diary"]

