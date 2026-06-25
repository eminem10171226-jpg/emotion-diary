# Web version of AI Emotion Diary - reuses ai_client and models from parent.
import sys
import uuid
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from flask import Flask, render_template, request, jsonify, g, send_from_directory

from ai_client import PERSONAS, analyze_diary
from models import (
    init_db,
    save_diary_entry,
    list_entries,
    get_recent_keywords,
    get_weekly_emotion_trend,
    get_pet_state,
    update_pet_after_diary,
    get_user_profile,
    save_user_profile,
    save_weather_context,
)

app = Flask(
    __name__,
    template_folder=str(Path(__file__).parent / "templates"),
    static_folder=str(Path(__file__).parent / "static"),
)

init_db()

COOKIE_SESSION = "diary_session"
COOKIE_MAX_AGE = 10 * 365 * 24 * 3600  # 10 年


WEATHER_LABELS = {
    0: "晴朗",
    1: "大致晴朗",
    2: "局部多云",
    3: "阴天",
    45: "雾",
    48: "霜雾",
    51: "小毛毛雨",
    53: "毛毛雨",
    55: "较强毛毛雨",
    56: "冻毛毛雨",
    57: "较强冻毛毛雨",
    61: "小雨",
    63: "中雨",
    65: "大雨",
    66: "冻雨",
    67: "较强冻雨",
    71: "小雪",
    73: "中雪",
    75: "大雪",
    77: "雪粒",
    80: "阵雨",
    81: "较强阵雨",
    82: "强阵雨",
    85: "小阵雪",
    86: "强阵雪",
    95: "雷雨",
    96: "雷雨伴冰雹",
    99: "强雷雨伴冰雹",
}


def _coerce_coordinate(value, min_value, max_value):
    try:
        coord = float(value)
    except (TypeError, ValueError):
        return None
    if coord < min_value or coord > max_value:
        return None
    return round(coord, 5)


def _weather_label(code):
    try:
        numeric = int(code)
    except (TypeError, ValueError):
        return "未知天气"
    return WEATHER_LABELS.get(numeric, "天气变化")


def _lookup_city(latitude, longitude):
    try:
        res = requests.get(
            "https://nominatim.openstreetmap.org/reverse",
            params={
                "format": "jsonv2",
                "lat": latitude,
                "lon": longitude,
                "zoom": 10,
                "addressdetails": 1,
            },
            headers={"User-Agent": "EmotionDiary/1.0"},
            timeout=8,
        )
        if not res.ok:
            return "", ""
        address = (res.json() or {}).get("address") or {}
        city = (
            address.get("city")
            or address.get("town")
            or address.get("village")
            or address.get("municipality")
            or address.get("county")
            or address.get("state")
            or ""
        )
        return city, address.get("country") or ""
    except Exception:
        return "", ""


def _fetch_weather(latitude, longitude):
    res = requests.get(
        "https://api.open-meteo.com/v1/forecast",
        params={
            "latitude": latitude,
            "longitude": longitude,
            "current": ",".join([
                "temperature_2m",
                "apparent_temperature",
                "relative_humidity_2m",
                "precipitation",
                "weather_code",
                "wind_speed_10m",
            ]),
            "timezone": "auto",
        },
        timeout=10,
    )
    res.raise_for_status()
    current = (res.json() or {}).get("current") or {}
    weather_code = current.get("weather_code")
    city, country = _lookup_city(latitude, longitude)
    return {
        "latitude": latitude,
        "longitude": longitude,
        "city": city,
        "country": country,
        "temperature": current.get("temperature_2m"),
        "apparent_temperature": current.get("apparent_temperature"),
        "humidity": current.get("relative_humidity_2m"),
        "precipitation": current.get("precipitation"),
        "wind_speed": current.get("wind_speed_10m"),
        "weather_code": weather_code,
        "weather_label": _weather_label(weather_code),
        "observed_at": current.get("time"),
    }


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


@app.route("/history")
def history_page():
    return render_template("history.html")


@app.route("/trends")
def trends_page():
    return render_template("trends.html")


@app.route("/kit")
def kit_page():
    return render_template("kit.html")


@app.route("/service-worker.js")
def service_worker():
    response = send_from_directory(app.static_folder, "service-worker.js")
    response.headers["Service-Worker-Allowed"] = "/"
    response.headers["Cache-Control"] = "no-cache"
    return response


@app.route("/api/analyze", methods=["POST"])
def api_analyze():
    data = request.get_json() or {}
    content = (data.get("content") or "").strip()
    persona_name = data.get("persona_name") or PERSONAS[0].name
    language = data.get("language") or "auto"

    if not content:
        return jsonify({"error": "请先输入日记内容。"}), 400

    try:
        session_id = g.session_id
        recent_keywords = get_recent_keywords(session_id, days=14)
        user_profile = get_user_profile(session_id)
        analysis = analyze_diary(
            content,
            recent_keywords=recent_keywords,
            persona_name=persona_name,
            language=language,
            user_profile=user_profile,
            weather_context=user_profile.get("weather"),
        )
        save_diary_entry(content, analysis, persona_name, session_id)
        analysis["pet"] = update_pet_after_diary(session_id)
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
    return jsonify({
        "trend": [{"date": str(d), "score": s} for d, s in trend],
    })


@app.route("/api/pet")
def api_pet():
    return jsonify(get_pet_state(g.session_id))


@app.route("/api/profile", methods=["GET", "POST"])
def api_profile():
    if request.method == "GET":
        return jsonify(get_user_profile(g.session_id))

    data = request.get_json() or {}
    profile = save_user_profile(g.session_id, data)
    return jsonify(profile)


@app.route("/api/weather", methods=["POST"])
def api_weather():
    data = request.get_json() or {}
    latitude = _coerce_coordinate(data.get("latitude"), -90, 90)
    longitude = _coerce_coordinate(data.get("longitude"), -180, 180)
    if latitude is None or longitude is None:
        return jsonify({"error": "定位坐标无效。"}), 400

    try:
        weather = _fetch_weather(latitude, longitude)
        save_weather_context(g.session_id, weather)
        return jsonify(weather)
    except Exception as exc:
        return jsonify({"error": f"天气信息获取失败：{exc}"}), 502


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
