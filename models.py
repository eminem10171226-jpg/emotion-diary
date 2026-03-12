import datetime as dt
import json
import os
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple


DB_PATH = Path(os.getenv("EMOTION_DIARY_DB", "emotion_diary.db"))


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = _get_conn()
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS diary_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL,
                date TEXT NOT NULL,
                content TEXT NOT NULL,
                emotion TEXT,
                emotion_score INTEGER,
                summary TEXT,
                advice TEXT,
                music_suggestions TEXT,
                food_suggestions TEXT,
                keywords TEXT,
                persona_name TEXT
            )
            """
        )
        conn.commit()
        # 为「按访客隔离」增加 session_id 列（已有表则迁移一次）
        try:
            conn.execute("ALTER TABLE diary_entries ADD COLUMN session_id TEXT")
            conn.commit()
        except sqlite3.OperationalError:
            pass  # 列已存在
    finally:
        conn.close()


@dataclass
class DiaryEntry:
    id: Optional[int]
    created_at: dt.datetime
    date: dt.date
    content: str
    emotion: str
    emotion_score: int
    summary: str
    advice: List[str]
    music_suggestions: List[str]
    food_suggestions: List[str]
    keywords: Dict[str, int]
    persona_name: str


def save_diary_entry(
    content: str,
    analysis: Dict,
    persona_name: str,
    session_id: str,
) -> int:
    now = dt.datetime.now()
    created_at = now.isoformat(timespec="seconds")
    date_str = now.date().isoformat()

    advice_text = json.dumps(analysis.get("advice", []), ensure_ascii=False)
    music_text = json.dumps(analysis.get("music_suggestions", []), ensure_ascii=False)
    food_text = json.dumps(analysis.get("food_suggestions", []), ensure_ascii=False)
    keywords_text = json.dumps(analysis.get("keywords", {}), ensure_ascii=False)

    conn = _get_conn()
    try:
        cur = conn.execute(
            """
            INSERT INTO diary_entries (
                created_at, date, content,
                emotion, emotion_score, summary,
                advice, music_suggestions, food_suggestions,
                keywords, persona_name, session_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                created_at,
                date_str,
                content,
                analysis.get("emotion"),
                int(analysis.get("emotion_score", 50)),
                analysis.get("summary", ""),
                advice_text,
                music_text,
                food_text,
                keywords_text,
                persona_name,
                session_id,
            ),
        )
        conn.commit()
        return int(cur.lastrowid)
    finally:
        conn.close()


def list_entries(session_id: str, limit: int = 50) -> List[DiaryEntry]:
    conn = _get_conn()
    try:
        cur = conn.execute(
            """
            SELECT * FROM diary_entries
            WHERE session_id = ?
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (session_id, limit),
        )
        rows = cur.fetchall()
    finally:
        conn.close()

    result: List[DiaryEntry] = []
    for r in rows:
        result.append(
            DiaryEntry(
                id=r["id"],
                created_at=dt.datetime.fromisoformat(r["created_at"]),
                date=dt.date.fromisoformat(r["date"]),
                content=r["content"],
                emotion=r["emotion"] or "",
                emotion_score=int(r["emotion_score"] or 50),
                summary=r["summary"] or "",
                advice=json.loads(r["advice"] or "[]"),
                music_suggestions=json.loads(r["music_suggestions"] or "[]"),
                food_suggestions=json.loads(r["food_suggestions"] or "[]"),
                keywords=json.loads(r["keywords"] or "{}"),
                persona_name=r["persona_name"] or "温暖知心导师",
            )
        )
    return result


def get_recent_keywords(session_id: str, days: int = 14) -> Dict[str, int]:
    since = (dt.date.today() - dt.timedelta(days=days)).isoformat()
    conn = _get_conn()
    try:
        cur = conn.execute(
            "SELECT keywords FROM diary_entries WHERE session_id = ? AND date >= ?",
            (session_id, since),
        )
        rows = cur.fetchall()
    finally:
        conn.close()

    agg: Dict[str, int] = {}
    for r in rows:
        if not r["keywords"]:
            continue
        try:
            kw = json.loads(r["keywords"])
        except json.JSONDecodeError:
            continue
        for k, v in kw.items():
            agg[k] = agg.get(k, 0) + int(v)
    return agg


def get_weekly_emotion_trend(session_id: str, days: int = 7) -> List[Tuple[dt.date, float]]:
    today = dt.date.today()
    start = today - dt.timedelta(days=days - 1)
    conn = _get_conn()
    try:
        cur = conn.execute(
            """
            SELECT date, AVG(emotion_score) AS avg_score
            FROM diary_entries
            WHERE session_id = ? AND date >= ?
            GROUP BY date
            ORDER BY date ASC
            """,
            (session_id, start.isoformat()),
        )
        rows = cur.fetchall()
    finally:
        conn.close()

    by_date: Dict[str, float] = {}
    for r in rows:
        if r["avg_score"] is not None:
            by_date[r["date"]] = float(r["avg_score"])

    result: List[Tuple[dt.date, float]] = []
    for i in range(days):
        d = start + dt.timedelta(days=i)
        score = by_date.get(d.isoformat(), 0.0)
        result.append((d, score))
    return result


__all__ = [
    "init_db",
    "save_diary_entry",
    "list_entries",
    "get_recent_keywords",
    "get_weekly_emotion_trend",
    "DiaryEntry",
]

