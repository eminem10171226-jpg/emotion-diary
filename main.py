import datetime as dt
import os
from pathlib import Path
from typing import List

# 使用项目自带的中文字体（simsunb.ttf），支持中英双语显示
BASE_DIR = Path(__file__).resolve().parent
FONT_PATH = BASE_DIR / "fonts" / "simsunb.ttf"
os.environ.setdefault("KIVY_DEFAULT_FONT", str(FONT_PATH))

from kivy.app import App
from kivy.clock import Clock
from kivy.core.window import Window
from kivy.lang import Builder
from kivy.properties import ListProperty, StringProperty
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.popup import Popup
from kivy.uix.screenmanager import Screen, ScreenManager
from kivy.utils import platform
from plyer import notification

from ai_client import PERSONAS, analyze_diary
from models import (
    DiaryEntry,
    get_recent_keywords,
    get_weekly_emotion_trend,
    init_db,
    list_entries,
    save_diary_entry,
)

# 桌面版单用户，用固定 session，数据都算同一人
SESSION_LOCAL = "kivy-local"


def _sanitize_for_display(text: str) -> str:
    """Return text as-is; placeholder kept for future filtering if needed."""
    return text


KV = r"""
<DiaryScreen>:
    name: "diary"
    BoxLayout:
        orientation: "vertical"
        padding: "12dp"
        spacing: "10dp"
        canvas.before:
            Color:
                rgba: 1, 0.96, 0.98, 1  # soft pink background
            Rectangle:
                pos: self.pos
                size: self.size

        BoxLayout:
            size_hint_y: None
            height: "44dp"
            padding: "0dp"
            spacing: "8dp"
            canvas.before:
                Color:
                    rgba: 0.95, 0.70, 0.80, 1  # deeper pink top bar
                Rectangle:
                    pos: self.pos
                    size: self.size

            Spinner:
                id: persona_spinner
                text: root.persona_name
                values: root.persona_names
                color: 0.25, 0.1, 0.15, 1
                background_normal: ''
                background_color: 1, 0.88, 0.93, 1
                bold: True
                size_hint_x: 0.25

            Spinner:
                id: lang_spinner
                text: root.language_label
                values: root.language_options
                size_hint_x: 0.25
                background_normal: ''
                background_color: 1, 0.92, 0.96, 1
                color: 0.25, 0.1, 0.15, 1
                on_text: root.on_language_selected(self.text)

            Button:
                text: "History"
                size_hint_x: 0.25
                background_normal: ''
                background_color: 1, 0.88, 0.93, 1
                color: 0.25, 0.1, 0.15, 1
                on_release: app.root.current = "history"

            Button:
                text: "Trends"
                size_hint_x: 0.25
                background_normal: ''
                background_color: 1, 0.88, 0.93, 1
                color: 0.25, 0.1, 0.15, 1
                on_release: app.root.current = "stats"

        TextInput:
            id: diary_input
            text: root.diary_text
            hint_text: "Write your feelings today (emoji is supported)."
            multiline: True
            size_hint_y: 0.4
            background_normal: ''
            background_active: ''
            background_color: 1, 0.98, 0.99, 1
            foreground_color: 0.25, 0.1, 0.15, 1
            cursor_color: 0.9, 0.4, 0.6, 1

        Button:
            text: "Analyze my emotion"
            size_hint_y: None
            height: "48dp"
            background_normal: ''
            background_color: 0.96, 0.55, 0.72, 1
            color: 1, 1, 1, 1
            bold: True
            on_release: root.on_analyze()

        ScrollView:
            size_hint_y: 0.4
            do_scroll_x: False
            canvas.before:
                Color:
                    rgba: 1, 0.98, 0.99, 1
                Rectangle:
                    pos: self.pos
                    size: self.size
            Label:
                text: root.analysis_text
                text_size: self.width - 16, None
                halign: "left"
                valign: "top"
                color: 0.25, 0.1, 0.15, 1
                size_hint_y: None
                height: self.texture_size[1]

<HistoryItem@BoxLayout>:
    entry: None
    orientation: "vertical"
    size_hint_y: None
    height: self.minimum_height
    padding: "8dp"
    spacing: "4dp"

    Label:
        text: f"[b]{root.entry.date}[/b]  {root.entry.emotion} ({root.entry.emotion_score})"
        markup: True
        size_hint_y: None
        height: "22dp"
        halign: "left"
        valign: "middle"
        text_size: self.width, None

    Label:
        text: root.entry.summary or root.entry.content[:60] + ("..." if len(root.entry.content) > 60 else "") 
        size_hint_y: None
        height: self.texture_size[1]
        halign: "left"
        valign: "top"
        text_size: self.width, None

<HistoryScreen>:
    name: "history"
    BoxLayout:
        orientation: "vertical"
        padding: "12dp"
        spacing: "10dp"
        canvas.before:
            Color:
                rgba: 1, 0.96, 0.98, 1
            Rectangle:
                pos: self.pos
                size: self.size

        Label:
            text: "History"
            size_hint_y: None
            height: "30dp"
            color: 0.4, 0.15, 0.25, 1

        ScrollView:
            do_scroll_x: False
            GridLayout:
                id: history_list
                cols: 1
                size_hint_y: None
                height: self.minimum_height
                spacing: "6dp"

        BoxLayout:
            size_hint_y: None
            height: "48dp"
            spacing: "8dp"

            Button:
                text: "Back"
                background_normal: ''
                background_color: 0.96, 0.55, 0.72, 1
                color: 1, 1, 1, 1
                on_release: app.root.current = "diary"

            Button:
                text: "Trends"
                background_normal: ''
                background_color: 1, 0.88, 0.93, 1
                color: 0.25, 0.1, 0.15, 1
                on_release: app.root.current = "stats"

<StatsScreen>:
    name: "stats"
    BoxLayout:
        orientation: "vertical"
        padding: "12dp"
        spacing: "10dp"
        canvas.before:
            Color:
                rgba: 1, 0.96, 0.98, 1
            Rectangle:
                pos: self.pos
                size: self.size

        Label:
            text: "Emotion trends (last 7 days)"
            size_hint_y: None
            height: "30dp"
            color: 0.4, 0.15, 0.25, 1

        EmotionChart:
            id: chart

        Label:
            text: "Top keywords in last 14 days:"
            size_hint_y: None
            height: "24dp"
            color: 0.4, 0.15, 0.25, 1

        Label:
            text: root.keywords_text
            text_size: self.width - 16, None
            halign: "left"
            valign: "top"
            color: 0.25, 0.1, 0.15, 1

        Button:
            size_hint_y: None
            height: "48dp"
            text: "Back"
            background_normal: ''
            background_color: 0.96, 0.55, 0.72, 1
            color: 1, 1, 1, 1
            on_release: app.root.current = "diary"

<EmotionChart@BoxLayout>:
    source: ""
    Image:
        source: root.source
        allow_stretch: True
        keep_ratio: True

ScreenManager:
    DiaryScreen:
        id: diary_screen
    HistoryScreen:
        id: history_screen
    StatsScreen:
        id: stats_screen
"""


class DiaryScreen(Screen):
    diary_text = StringProperty("")
    analysis_text = StringProperty("Write something and click 'Analyze my emotion'.")
    persona_name = StringProperty("Warm Mentor")
    persona_names = ListProperty([p.name for p in PERSONAS])
    language_label = StringProperty("Lang: Auto")
    language_code = StringProperty("auto")  # "auto" | "zh" | "en"
    language_options = ListProperty(["Auto", "中文", "English"])

    def on_persona_selected(self, name: str) -> None:
        self.persona_name = name

    def on_language_selected(self, label: str) -> None:
        if label == "中文":
            self.language_code = "zh"
            self.language_label = "Lang: 中文"
        elif label == "English":
            self.language_code = "en"
            self.language_label = "Lang: EN"
        else:
            self.language_code = "auto"
            self.language_label = "Lang: Auto"

    def on_analyze(self) -> None:
        text_input = self.ids.get("diary_input")
        content = (text_input.text or "").strip()
        if not content:
            self._show_popup("Tip", "Please write something first.")
            return

        self.analysis_text = "正在分析，请稍候..."
        Clock.schedule_once(lambda *_: self._analyze_background(content), 0.1)

    def _analyze_background(self, content: str) -> None:
        try:
            recent_keywords = get_recent_keywords(SESSION_LOCAL, days=14)
            analysis = analyze_diary(
                content,
                recent_keywords=recent_keywords,
                persona_name=self.persona_name,
                language=self.language_code,
            )
            save_diary_entry(content, analysis, self.persona_name, SESSION_LOCAL)

            emotion = analysis.get("emotion", "unknown")
            score = int(analysis.get("emotion_score", 50))
            summary = analysis.get("summary", "")
            advice = analysis.get("advice", [])
            music = analysis.get("music_suggestions", [])
            food = analysis.get("food_suggestions", [])
            notifications = analysis.get("notifications", [])

            text_lines: List[str] = []
            text_lines.append(f"Emotion: {emotion} ({score} / 100)")
            if summary:
                text_lines.append(f"Summary: {summary}")
            if advice:
                text_lines.append("Advice:")
                for a in advice:
                    text_lines.append(f"- {a}")
            if music:
                text_lines.append("Music suggestions: " + ", ".join(music))
            if food:
                text_lines.append("Food suggestions: " + ", ".join(food))

            result_text = _sanitize_for_display("\n".join(text_lines))
            self.analysis_text = result_text

            # 同时用弹窗直接展示结果，避免用户没有注意到下方区域
            self._show_popup("Emotion analysis", result_text)

            if notifications:
                notification.notify(
                    title="AI Emotion Diary - Reminder",
                    message=notifications[0][:120],
                    app_name="AI Emotion Diary",
                    timeout=5,
                )

            self.ids.diary_input.text = ""
        except Exception as exc:  # noqa: BLE001
            # 在界面上只展示简短错误信息，详细错误输出到控制台
            print("Emotion analysis error:", exc)
            self.analysis_text = "Analysis failed. Please check your network or try again later."
            self._show_popup("Error", "Emotion analysis failed. Please try again later.")

    @staticmethod
    def _show_popup(title: str, message: str) -> None:
        from kivy.uix.label import Label
        from kivy.uix.button import Button

        box = BoxLayout(orientation="vertical", padding="12dp", spacing="8dp")
        lbl = Label(text=message, halign="center", valign="middle")
        lbl.text_size = (400, None)
        btn = Button(text="OK", size_hint_y=None, height="40dp")
        box.add_widget(lbl)
        box.add_widget(btn)
        popup = Popup(title=title, content=box, size_hint=(0.8, 0.4), auto_dismiss=False)
        btn.bind(on_release=popup.dismiss)
        popup.open()


class HistoryScreen(Screen):
    def on_pre_enter(self, *args):  # noqa: ANN002, D401
        """进入页面时刷新列表。"""
        super().on_pre_enter(*args)
        # 延迟到下一帧再刷新，确保布局尺寸已经计算完成
        from kivy.clock import Clock

        Clock.schedule_once(lambda *_: self.refresh(), 0)

    def refresh(self) -> None:
        from kivy.uix.label import Label

        history_list = self.ids.get("history_list")
        if not history_list:
            return
        history_list.clear_widgets()

        entries = list_entries(SESSION_LOCAL, limit=100)
        if not entries:
            history_list.add_widget(
                Label(
                    text="No history yet. Write your first diary!",
                    size_hint_y=None,
                    height="40dp",
                )
            )
            return

        for entry in entries:
            # 这里只展示纯英文的信息，避免中文在当前字体下变成方块
            text = f"{entry.date}  |  Emotion: {entry.emotion} ({entry.emotion_score})"
            lbl = Label(
                text=text,
                size_hint_y=None,
                height="32dp",
                halign="left",
                valign="middle",
                color=(0, 0, 0, 1),  # black text on white background
            )
            # 单行文本，宽度自适应列表宽度
            lbl.text_size = (history_list.width - 20, None)
            history_list.add_widget(lbl)


class StatsScreen(Screen):
    keywords_text = StringProperty("No data yet. Please write some diaries first.")

    def on_pre_enter(self, *args):  # noqa: ANN002, D401
        """进入页面时刷新图表和关键词。"""
        super().on_pre_enter(*args)
        self.refresh()

    def refresh(self) -> None:
        trend = get_weekly_emotion_trend(SESSION_LOCAL, days=7)
        chart_widget = self.ids.get("chart")
        if chart_widget:
            chart_widget.source = generate_trend_chart(trend)

        kw = get_recent_keywords(SESSION_LOCAL, days=14)
        if not kw:
            self.keywords_text = "No obvious high-frequency keywords yet."
        else:
            items = sorted(kw.items(), key=lambda x: x[1], reverse=True)[:20]
            self.keywords_text = ", ".join(f"{k} ({v} times)" for k, v in items)


def generate_trend_chart(data):
    """生成最近 7 天情绪分数折线图，返回图片路径。"""
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    dates = [d for d, _ in data]
    scores = [s for _, s in data]

    fig, ax = plt.subplots(figsize=(4, 2))
    ax.plot(dates, scores, marker="o")
    ax.set_ylim(0, 100)
    ax.set_ylabel("情绪分数")
    ax.set_xlabel("日期")
    ax.grid(True, alpha=0.3)
    fig.autofmt_xdate()

    cache_dir = Path(".cache")
    cache_dir.mkdir(exist_ok=True)
    filename = cache_dir / f"trend_{dt.datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
    fig.savefig(filename, dpi=160, bbox_inches="tight")
    plt.close(fig)
    return str(filename)


class EmotionDiaryApp(App):
    def build(self):
        # 典型手机纵向比例预览：在电脑上用 360x720 模拟手机竖屏
        if platform != "android":
            Window.size = (360, 720)
        # light pink window background behind all layouts
        Window.clearcolor = (1, 0.96, 0.98, 1)
        init_db()
        return Builder.load_string(KV)


if __name__ == "__main__":
    EmotionDiaryApp().run()

