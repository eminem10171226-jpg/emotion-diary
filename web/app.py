# Web version of AI Emotion Diary - reuses ai_client and models from parent.
import sys
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from flask import Flask, render_template, request, jsonify, g

from ai_client import PERSONAS, analyze_diary
from models import (
    init_db,
    save_diary_entry,
    list_entries,
    get_recent_keywords,
    get_weekly_emotion_trend,
)

app = Flask(
    __name__,
    template_folder=str(Path(__file__).parent / "templates"),
    static_folder=str(Path(__file__).parent / "static"),
)

init_db()

COOKIE_SESSION = "diary_session"
COOKIE_MAX_AGE = 10 * 365 * 24 * 3600  # 10 年


@app.before_request
def ensure_session():
    g.session_id = request.cookies.get(COOKIE_SESSION) or str(uuid.uuid4())


@app.after_request
def set_session_cookie(response):
    if request.cookies.get(COOKIE_SESSION) != getattr(g, "session_id", None):
        # Render 等反向代理下用 HTTPS，Secure 有助于浏览器长期保留 Cookie
        secure = (
            request.headers.get("X-Forwarded-Proto", "").lower() == "https"
            or request.is_secure
        )
        response.set_cookie(
            COOKIE_SESSION,
            g.session_id,
            max_age=COOKIE_MAX_AGE,
            samesite="Lax",
            httponly=True,
            secure=secure,
        )
    return response


@app.route("/")
def index():
    return render_template("index.html", personas=[p.name for p in PERSONAS])


@app.route("/api/analyze", methods=["POST"])
def api_analyze():
    data = request.get_json() or {}
    content = (data.get("content") or "").strip()
    persona_name = data.get("persona_name") or PERSONAS[0].name
    language = data.get("language") or "auto"

    if not content:
        return jsonify({"error": "Please write something first."}), 400

    try:
        session_id = g.session_id
        recent_keywords = get_recent_keywords(session_id, days=14)
        analysis = analyze_diary(
            content,
            recent_keywords=recent_keywords,
            persona_name=persona_name,
            language=language,
        )
        save_diary_entry(content, analysis, persona_name, session_id)
        return jsonify(analysis)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/entries")
def api_entries():
    entries = list_entries(g.session_id, limit=100)
    out = []
    for e in entries:
        out.append({
            "id": e.id,
            "date": str(e.date),
            "emotion": e.emotion,
            "emotion_score": e.emotion_score,
            "summary": e.summary,
            "content_preview": e.content[:80] + ("..." if len(e.content) > 80 else ""),
        })
    return jsonify(out)


@app.route("/api/trend")
def api_trend():
    sid = g.session_id
    trend = get_weekly_emotion_trend(sid, days=7)
    kw = get_recent_keywords(sid, days=14)
    items = sorted(kw.items(), key=lambda x: x[1], reverse=True)[:20]
    return jsonify({
        "trend": [{"date": str(d), "score": s} for d, s in trend],
        "keywords": [{"word": k, "count": v} for k, v in items],
    })


if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() in ("1", "true", "yes")
    print("-" * 50)
    print("AI Emotion Diary - Web")
    print("Open in browser:  http://127.0.0.1:{}/".format(port))
    print("Or:               http://localhost:{}/".format(port))
    print("-" * 50)
    app.run(host="0.0.0.0", port=port, debug=debug)
