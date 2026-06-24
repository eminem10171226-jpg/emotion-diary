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
            _create_pet_table(conn)
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
        _create_pet_table(conn)
        conn.commit()
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


@dataclass
class PetState:
    name: str
    points: int
    streak_days: int
    last_checkin_date: Optional[str]
    level: int
    next_level_points: Optional[int]
    checked_in_today: bool
    mood: str


PET_DEFAULT_NAME = "小桃"
PET_LEVEL_THRESHOLDS = [0, 3, 7, 14, 30, 60]


def _create_pet_table(conn: Any) -> None:
    if _use_postgres():
        conn.cursor().execute(
            """
            CREATE TABLE IF NOT EXISTS pet_state (
                id SERIAL PRIMARY KEY,
                session_id TEXT UNIQUE NOT NULL,
                pet_name TEXT NOT NULL,
                points INTEGER NOT NULL,
                streak_days INTEGER NOT NULL,
                last_checkin_date TEXT,
                mood TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        return

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS pet_state (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT UNIQUE NOT NULL,
            pet_name TEXT NOT NULL,
            points INTEGER NOT NULL,
            streak_days INTEGER NOT NULL,
            last_checkin_date TEXT,
            mood TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )


def _parse_date(value: Any) -> Optional[dt.date]:
    if not value:
        return None
    try:
        return dt.date.fromisoformat(str(value))
    except ValueError:
        return None


def _pet_level(points: int) -> Tuple[int, Optional[int]]:
    level = 1
    next_points: Optional[int] = None
    for index, threshold in enumerate(PET_LEVEL_THRESHOLDS, start=1):
        if points >= threshold:
            level = index
        elif next_points is None:
            next_points = threshold
            break
    return level, next_points


def _pet_mood(checked_in_today: bool, streak_days: int) -> str:
    if checked_in_today and streak_days >= 7:
        return "spark"
    if checked_in_today:
        return "happy"
    if streak_days > 0:
        return "waiting"
    return "sleepy"


def _calculate_streak(dates: List[dt.date]) -> int:
    if not dates:
        return 0
    today = dt.date.today()
    unique_dates = set(dates)
    last_date = max(unique_dates)
    if last_date < today - dt.timedelta(days=1):
        return 0

    streak = 0
    cursor = last_date
    while cursor in unique_dates:
        streak += 1
        cursor -= dt.timedelta(days=1)
    return streak


def _pet_dict_from_row(row: Any) -> Dict[str, Any]:
    points = int(_row_get(row, "points") or 0)
    level, next_points = _pet_level(points)
    last_date = _parse_date(_row_get(row, "last_checkin_date"))
    checked_in_today = last_date == dt.date.today()
    streak_days = int(_row_get(row, "streak_days") or 0)
    if last_date and last_date < dt.date.today() - dt.timedelta(days=1):
        streak_days = 0
    mood = _pet_mood(checked_in_today, streak_days)
    return {
        "name": _row_get(row, "pet_name") or PET_DEFAULT_NAME,
        "points": points,
        "streak_days": streak_days,
        "last_checkin_date": str(last_date) if last_date else None,
        "level": level,
        "next_level_points": next_points,
        "checked_in_today": checked_in_today,
        "mood": mood,
    }


def _pet_state_from_entries(session_id: str) -> Dict[str, Any]:
    conn = _get_conn()
    try:
        sql = _q(
            """
            SELECT DISTINCT date
            FROM diary_entries
            WHERE session_id = ?
            """
        )
        if _use_postgres():
            cur = conn.cursor()
            cur.execute(sql, (session_id,))
            rows = cur.fetchall()
        else:
            rows = conn.execute(sql, (session_id,)).fetchall()
    finally:
        conn.close()

    dates = [
        parsed for parsed in (_parse_date(_row_get(row, "date")) for row in rows)
        if parsed is not None
    ]
    points = len(set(dates))
    streak_days = _calculate_streak(dates)
    last_date = max(dates) if dates else None
    checked_in_today = last_date == dt.date.today()
    level, next_points = _pet_level(points)
    return {
        "name": PET_DEFAULT_NAME,
        "points": points,
        "streak_days": streak_days,
        "last_checkin_date": str(last_date) if last_date else None,
        "level": level,
        "next_level_points": next_points,
        "checked_in_today": checked_in_today,
        "mood": _pet_mood(checked_in_today, streak_days),
    }


def _insert_pet_state(session_id: str, state: Dict[str, Any]) -> Dict[str, Any]:
    now = dt.datetime.now().isoformat(timespec="seconds")
    conn = _get_conn()
    try:
        sql = _q(
            """
            INSERT INTO pet_state (
                session_id, pet_name, points, streak_days,
                last_checkin_date, mood, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """
        )
        values = (
            session_id,
            state.get("name") or PET_DEFAULT_NAME,
            int(state.get("points") or 0),
            int(state.get("streak_days") or 0),
            state.get("last_checkin_date"),
            state.get("mood") or "waiting",
            now,
            now,
        )
        if _use_postgres():
            cur = conn.cursor()
            cur.execute(sql, values)
        else:
            conn.execute(sql, values)
        conn.commit()
    finally:
        conn.close()
    return get_pet_state(session_id)


def get_pet_state(session_id: str) -> Dict[str, Any]:
    conn = _get_conn()
    try:
        sql = _q("SELECT * FROM pet_state WHERE session_id = ?")
        if _use_postgres():
            cur = conn.cursor()
            cur.execute(sql, (session_id,))
            row = cur.fetchone()
        else:
            row = conn.execute(sql, (session_id,)).fetchone()
    finally:
        conn.close()

    if row:
        return _pet_dict_from_row(row)
    return _insert_pet_state(session_id, _pet_state_from_entries(session_id))


def update_pet_after_diary(session_id: str) -> Dict[str, Any]:
    today = dt.date.today()
    state = get_pet_state(session_id)
    last_date = _parse_date(state.get("last_checkin_date"))
    if last_date == today:
        return state

    streak_days = 1
    if last_date == today - dt.timedelta(days=1):
        streak_days = int(state.get("streak_days") or 0) + 1

    points = int(state.get("points") or 0) + 1
    mood = _pet_mood(True, streak_days)
    now = dt.datetime.now().isoformat(timespec="seconds")

    conn = _get_conn()
    try:
        sql = _q(
            """
            UPDATE pet_state
            SET points = ?, streak_days = ?, last_checkin_date = ?,
                mood = ?, updated_at = ?
            WHERE session_id = ?
            """
        )
        values = (points, streak_days, today.isoformat(), mood, now, session_id)
        if _use_postgres():
            cur = conn.cursor()
            cur.execute(sql, values)
        else:
            conn.execute(sql, values)
        conn.commit()
    finally:
        conn.close()
    return get_pet_state(session_id)


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
    "get_pet_state",
    "update_pet_after_diary",
    "DiaryEntry",
    "PetState",
]
