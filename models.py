import datetime as dt
import json
import os
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# 若设置 DATABASE_URL（如 Render 附加 PostgreSQL），使用云端数据库，数据不随容器重启丢失；
# 否则使用本地 SQLite（emotion_diary.db）。
DB_PATH = Path(os.getenv("EMOTION_DIARY_DB", "emotion_diary.db"))
_DATABASE_URL = os.getenv("DATABASE_URL", "").strip()


def _use_postgres() -> bool:
    return bool(_DATABASE_URL)


def _pg_url() -> str:
    url = _DATABASE_URL
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://") :]
    return url


def _get_conn() -> Any:
    if _use_postgres():
        import psycopg2
        from psycopg2.extras import RealDictCursor

        return psycopg2.connect(_pg_url(), cursor_factory=RealDictCursor)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _q(sql: str) -> str:
    if _use_postgres():
        return sql.replace("?", "%s")
    return sql


def _row_get(row: Any, key: str) -> Any:
    if isinstance(row, dict):
        return row.get(key)
    return row[key]


def init_db() -> None:
    if _use_postgres():
        conn = _get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS diary_entries (
                    id SERIAL PRIMARY KEY,
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
                    persona_name TEXT,
                    session_id TEXT
                )
                """
            )
            conn.commit()
            # 旧表缺列时补列
            cur.execute(
                """
                SELECT column_name FROM information_schema.columns
                WHERE table_name='diary_entries' AND column_name='session_id'
                """
            )
            if not cur.fetchone():
                cur.execute("ALTER TABLE diary_entries ADD COLUMN session_id TEXT")
                conn.commit()
        finally:
            conn.close()
        return

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
        try:
            conn.execute("ALTER TABLE diary_entries ADD COLUMN session_id TEXT")
            conn.commit()
        except sqlite3.OperationalError:
            pass
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
        if _use_postgres():
            cur = conn.cursor()
            cur.execute(
                _q(
                    """
                    INSERT INTO diary_entries (
                        created_at, date, content,
                        emotion, emotion_score, summary,
                        advice, music_suggestions, food_suggestions,
                        keywords, persona_name, session_id
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    RETURNING id
                    """
                ),
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
            row = cur.fetchone()
            conn.commit()
            return int(row["id"])
        cur = conn.execute(
            _q(
                """
                INSERT INTO diary_entries (
                    created_at, date, content,
                    emotion, emotion_score, summary,
                    advice, music_suggestions, food_suggestions,
                    keywords, persona_name, session_id
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """
            ),
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


def _entry_from_row(r: Any) -> DiaryEntry:
    return DiaryEntry(
        id=_row_get(r, "id"),
        created_at=dt.datetime.fromisoformat(str(_row_get(r, "created_at"))),
        date=dt.date.fromisoformat(str(_row_get(r, "date"))),
        content=str(_row_get(r, "content")),
        emotion=_row_get(r, "emotion") or "",
        emotion_score=int(_row_get(r, "emotion_score") or 50),
        summary=_row_get(r, "summary") or "",
        advice=json.loads(_row_get(r, "advice") or "[]"),
        music_suggestions=json.loads(_row_get(r, "music_suggestions") or "[]"),
        food_suggestions=json.loads(_row_get(r, "food_suggestions") or "[]"),
        keywords=json.loads(_row_get(r, "keywords") or "{}"),
        persona_name=_row_get(r, "persona_name") or "温暖知心导师",
    )


def list_entries(session_id: str, limit: int = 50) -> List[DiaryEntry]:
    conn = _get_conn()
    try:
        sql = _q(
            """
            SELECT * FROM diary_entries
            WHERE session_id = ?
            ORDER BY created_at DESC
            LIMIT ?
            """
        )
        if _use_postgres():
            cur = conn.cursor()
            cur.execute(sql, (session_id, limit))
            rows = cur.fetchall()
        else:
            cur = conn.execute(sql, (session_id, limit))
            rows = cur.fetchall()
    finally:
        conn.close()

    return [_entry_from_row(r) for r in rows]


def get_recent_keywords(session_id: str, days: int = 14) -> Dict[str, int]:
    since = (dt.date.today() - dt.timedelta(days=days)).isoformat()
    conn = _get_conn()
    try:
        sql = _q(
            "SELECT keywords FROM diary_entries WHERE session_id = ? AND date >= ?"
        )
        if _use_postgres():
            cur = conn.cursor()
            cur.execute(sql, (session_id, since))
            rows = cur.fetchall()
        else:
            cur = conn.execute(sql, (session_id, since))
            rows = cur.fetchall()
    finally:
        conn.close()

    agg: Dict[str, int] = {}
    for r in rows:
        kw_raw = _row_get(r, "keywords")
        if not kw_raw:
            continue
        try:
            kw = json.loads(kw_raw)
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
        sql = _q(
            """
            SELECT date, AVG(emotion_score) AS avg_score
            FROM diary_entries
            WHERE session_id = ? AND date >= ?
            GROUP BY date
            ORDER BY date ASC
            """
        )
        if _use_postgres():
            cur = conn.cursor()
            cur.execute(sql, (session_id, start.isoformat()))
            rows = cur.fetchall()
        else:
            cur = conn.execute(sql, (session_id, start.isoformat()))
            rows = cur.fetchall()
    finally:
        conn.close()

    by_date: Dict[str, float] = {}
    for r in rows:
        av = _row_get(r, "avg_score")
        if av is not None:
            by_date[str(_row_get(r, "date"))] = float(av)

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
