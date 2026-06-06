(function () {
  const diary = document.getElementById("diary");
  const analyzeBtn = document.getElementById("analyze");
  const voiceDiaryBtn = document.getElementById("voice-diary");
  const draftCount = document.getElementById("draft-count");
  const resultEl = document.getElementById("analysis-result");
  const errorEl = document.getElementById("analysis-error");
  const historyList = document.getElementById("history-list");
  const historySummary = document.getElementById("history-summary");
  const historySearch = document.getElementById("history-search");
  const historyScoreFilter = document.getElementById("history-score-filter");
  const moodCalendar = document.getElementById("mood-calendar");
  const moodWeather = document.getElementById("mood-weather");
  const moodMap = document.getElementById("mood-map");
  const weeklyReport = document.getElementById("weekly-report");
  const mailboxList = document.getElementById("mailbox-list");
  const clearMailboxBtn = document.getElementById("clear-mailbox");
  const ritualPanel = document.getElementById("ritual-panel");
  const ritualActions = document.getElementById("ritual-actions");
  const futureMessage = document.getElementById("future-message");
  const futureDays = document.getElementById("future-days");
  const saveFutureBtn = document.getElementById("save-future");
  const futureList = document.getElementById("future-list");
  const pinInput = document.getElementById("pin-input");
  const savePinBtn = document.getElementById("save-pin");
  const clearPinBtn = document.getElementById("clear-pin");
  const privacyStatus = document.getElementById("privacy-status");
  const offlineDrafts = document.getElementById("offline-drafts");
  const breathToggle = document.getElementById("breath-toggle");
  const breathOrb = document.getElementById("breath-orb");
  const breathLabel = document.getElementById("breath-label");
  const supportMessage = document.getElementById("support-message");
  const copySupportBtn = document.getElementById("copy-support");
  const copyStatus = document.getElementById("copy-status");
  const trendSummary = document.getElementById("trend-summary");
  const trendCanvas = document.getElementById("trend-chart");
  const hasAnalyzePage = !!(diary && analyzeBtn && resultEl && errorEl);
  const hasHistoryPage = !!historyList;
  const hasTrendPage = !!trendCanvas;
  const ACTIVE_ANALYSIS_KEY = "emotionDiary.activeAnalysis";
  const MOOD_MAILBOX_KEY = "emotionDiary.moodMailbox";
  const GENTLE_TASK_KEY = "emotionDiary.gentleTasks";
  const FUTURE_MESSAGES_KEY = "emotionDiary.futureMessages";
  const PIN_KEY = "emotionDiary.pin";
  const UNLOCKED_KEY = "emotionDiary.unlocked";
  const OFFLINE_DRAFTS_KEY = "emotionDiary.offlineDrafts";
  let cachedHistoryEntries = [];

  function getPersona() {
    return document.getElementById("persona").value;
  }
  function getLanguage() {
    return document.getElementById("language").value;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function saveActiveAnalysis(html) {
    try {
      sessionStorage.setItem(ACTIVE_ANALYSIS_KEY, JSON.stringify({
        html: html,
        savedAt: Date.now(),
      }));
    } catch (_e) {
      // Some embedded browsers can disable storage; the result still renders.
    }
  }

  function clearActiveAnalysis() {
    try {
      sessionStorage.removeItem(ACTIVE_ANALYSIS_KEY);
    } catch (_e) {}
    resultEl.innerHTML = "";
    resultEl.classList.add("hidden");
  }

  function restoreActiveAnalysis() {
    try {
      const raw = sessionStorage.getItem(ACTIVE_ANALYSIS_KEY);
      if (!raw) return;
      const stored = JSON.parse(raw);
      if (stored && stored.html) {
        showResult(stored.html, false);
      }
    } catch (_e) {
      try {
        sessionStorage.removeItem(ACTIVE_ANALYSIS_KEY);
      } catch (_ignored) {}
    }
  }

  function showResult(html, remember) {
    errorEl.classList.add("hidden");
    resultEl.classList.remove("hidden");
    resultEl.innerHTML = html;
    if (remember) saveActiveAnalysis(html);
  }
  function showError(msg) {
    resultEl.classList.add("hidden");
    errorEl.classList.remove("hidden");
    errorEl.textContent = msg;
  }

  function updateDraftCount() {
    if (!draftCount || !diary) return;
    const count = (diary.value || "").trim().length;
    draftCount.textContent = count + " 字";
  }

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function readStoredJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_e) {
      return fallback;
    }
  }

  function writeStoredJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_e) {}
  }

  function clampScore(value) {
    return Math.max(0, Math.min(100, Number(value) || 0));
  }

  function moodWeatherForScore(score) {
    if (score >= 80) {
      return { mark: "晴", name: "晴朗", detail: "能量比较舒展，适合把好状态轻轻延长一点。", className: "sunny" };
    }
    if (score >= 65) {
      return { mark: "云", name: "薄云", detail: "整体稳定，给自己留一点慢下来的空间会更舒服。", className: "cloudy" };
    }
    if (score >= 50) {
      return { mark: "雾", name: "微雾", detail: "感受有些混杂，先照顾当下最具体的一件小事。", className: "misty" };
    }
    if (score >= 25) {
      return { mark: "雨", name: "小雨", detail: "今天可能有些低落，适合降低要求，做一点温和的恢复。", className: "rainy" };
    }
    return { mark: "雷", name: "风暴", detail: "情绪负荷较重，请优先联系可信任的人，或者寻求专业支持。", className: "stormy" };
  }

  function pickFrom(items, seed) {
    return items[hashString(String(seed)) % items.length];
  }

  function makeGentleTask(score, emotion, summary) {
    const low = [
      "把手机放远一点，慢慢喝一杯水。",
      "给自己留出 5 分钟，只做深呼吸。",
      "把今天最累的一件事写成一句话，然后停下。",
    ];
    const mid = [
      "整理桌面上的一个小角落。",
      "出门或到窗边站 3 分钟，看看远处。",
      "给今天的自己写一句不评价的话。",
    ];
    const high = [
      "把此刻的好状态记录成一句话。",
      "做一件能让明天轻松一点的小事。",
      "给一个喜欢的人发一句轻松的问候。",
    ];
    const pool = score >= 80 ? high : score >= 50 ? mid : low;
    return pickFrom(pool, emotion + summary + todayKey());
  }

  function taskIsDone(text) {
    const tasks = readStoredJson(GENTLE_TASK_KEY, {});
    return !!tasks[todayKey() + ":" + text];
  }

  function setTaskDone(text, done) {
    const tasks = readStoredJson(GENTLE_TASK_KEY, {});
    tasks[todayKey() + ":" + text] = done;
    writeStoredJson(GENTLE_TASK_KEY, tasks);
  }

  function buildSelfLetter(data, score) {
    const emotion = data.emotion || "此刻的心情";
    const summary = data.summary || "你已经认真看见了自己的感受";
    if (score >= 80) {
      return "亲爱的自己，今天的你带着" + emotion + "往前走了一段。记得把这份轻盈保存下来，不必用力证明什么。";
    }
    if (score >= 50) {
      return "亲爱的自己，今天的情绪并不单一。你愿意停下来记录，已经是在给自己一个稳定的回应。";
    }
    return "亲爱的自己，今天可能不容易。" + summary + "。请先把要求放低一点，你值得被温柔地接住。";
  }

  function readMailbox() {
    const letters = readStoredJson(MOOD_MAILBOX_KEY, []);
    return Array.isArray(letters) ? letters : [];
  }

  function writeMailbox(letters) {
    writeStoredJson(MOOD_MAILBOX_KEY, letters.slice(0, 24));
  }

  function renderMailbox() {
    if (!mailboxList) return;
    const letters = readMailbox();
    if (!letters.length) {
      mailboxList.innerHTML = "<div class='mailbox-empty'>收藏分析里的那封小信后，它会出现在这里。</div>";
      if (clearMailboxBtn) clearMailboxBtn.classList.add("hidden");
      return;
    }
    if (clearMailboxBtn) clearMailboxBtn.classList.remove("hidden");
    mailboxList.innerHTML = letters.map(function (letter) {
      return (
        "<article class='mailbox-item'>" +
        "<span>" + escapeHtml(letter.date || "") + "</span>" +
        "<p>" + escapeHtml(letter.text || "") + "</p>" +
        "</article>"
      );
    }).join("");
  }

  function saveLetter(text) {
    const letters = readMailbox();
    const key = todayKey() + ":" + text;
    const withoutDuplicate = letters.filter(function (letter) {
      return letter.key !== key;
    });
    withoutDuplicate.unshift({ key: key, date: todayKey(), text: text });
    writeMailbox(withoutDuplicate);
    renderMailbox();
  }

  function addDaysIso(days) {
    const date = new Date();
    date.setDate(date.getDate() + Number(days || 0));
    return date.toISOString().slice(0, 10);
  }

  function renderFutureMessages() {
    if (!futureList) return;
    const messages = readStoredJson(FUTURE_MESSAGES_KEY, []);
    if (!Array.isArray(messages) || !messages.length) {
      futureList.innerHTML = "<div class='future-empty'>写给未来的提醒会保存在本机，到了日期会在这里亮起。</div>";
      return;
    }
    const today = todayKey();
    futureList.innerHTML = messages.map(function (item, index) {
      const due = item.due || today;
      const ready = due <= today;
      return (
        "<article class='future-item" + (ready ? " is-ready" : "") + "'>" +
        "<span>" + (ready ? "可以打开" : "等待 " + escapeHtml(due)) + "</span>" +
        "<p>" + escapeHtml(ready ? item.text : "这句话会在 " + due + " 之后显示。") + "</p>" +
        "<button type='button' class='ghost-button' data-delete-future='" + index + "'>删除</button>" +
        "</article>"
      );
    }).join("");
  }

  function saveFutureMessage() {
    if (!futureMessage || !futureDays) return;
    const text = (futureMessage.value || "").trim();
    if (!text) return;
    const messages = readStoredJson(FUTURE_MESSAGES_KEY, []);
    messages.unshift({
      text: text,
      created: todayKey(),
      due: addDaysIso(futureDays.value),
    });
    writeStoredJson(FUTURE_MESSAGES_KEY, messages.slice(0, 20));
    futureMessage.value = "";
    renderFutureMessages();
  }

  function pinHash(pin) {
    return String(hashString("emotion-diary-pin:" + pin));
  }

  function updatePrivacyStatus() {
    if (!privacyStatus) return;
    const hasPin = !!localStorage.getItem(PIN_KEY);
    privacyStatus.textContent = hasPin
      ? "私密锁已开启。重新打开 app 时需要输入 PIN。"
      : "尚未开启私密锁。PIN 只保存在当前设备。";
  }

  function createLockOverlay() {
    const overlay = document.createElement("div");
    overlay.className = "privacy-gate";
    overlay.innerHTML = (
      "<div class='privacy-gate-card'>" +
      "<p class='section-kicker'>Private</p>" +
      "<h2>输入私密锁 PIN</h2>" +
      "<input id='unlock-pin' type='password' inputmode='numeric' maxlength='4' placeholder='4 位 PIN'>" +
      "<button id='unlock-submit' class='secondary-button' type='button'>解锁</button>" +
      "<p id='unlock-error'></p>" +
      "</div>"
    );
    document.body.appendChild(overlay);
    const input = overlay.querySelector("#unlock-pin");
    const button = overlay.querySelector("#unlock-submit");
    const error = overlay.querySelector("#unlock-error");
    function unlock() {
      if (pinHash(input.value || "") === localStorage.getItem(PIN_KEY)) {
        sessionStorage.setItem(UNLOCKED_KEY, "1");
        overlay.remove();
      } else {
        error.textContent = "PIN 不正确";
      }
    }
    button.addEventListener("click", unlock);
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") unlock();
    });
    setTimeout(function () { input.focus(); }, 50);
  }

  function initPrivacyLock() {
    const storedPin = localStorage.getItem(PIN_KEY);
    if (storedPin && sessionStorage.getItem(UNLOCKED_KEY) !== "1") {
      createLockOverlay();
    }
    updatePrivacyStatus();
    if (savePinBtn && pinInput) {
      savePinBtn.addEventListener("click", function () {
        const pin = (pinInput.value || "").trim();
        if (!/^\d{4}$/.test(pin)) {
          if (privacyStatus) privacyStatus.textContent = "请输入 4 位数字 PIN。";
          return;
        }
        localStorage.setItem(PIN_KEY, pinHash(pin));
        sessionStorage.setItem(UNLOCKED_KEY, "1");
        pinInput.value = "";
        updatePrivacyStatus();
      });
    }
    if (clearPinBtn) {
      clearPinBtn.addEventListener("click", function () {
        localStorage.removeItem(PIN_KEY);
        sessionStorage.removeItem(UNLOCKED_KEY);
        updatePrivacyStatus();
      });
    }
  }

  function readOfflineDrafts() {
    const drafts = readStoredJson(OFFLINE_DRAFTS_KEY, []);
    return Array.isArray(drafts) ? drafts : [];
  }

  function writeOfflineDrafts(drafts) {
    writeStoredJson(OFFLINE_DRAFTS_KEY, drafts.slice(0, 12));
  }

  function saveOfflineDraft(content) {
    const drafts = readOfflineDrafts();
    drafts.unshift({ content: content, date: new Date().toLocaleString() });
    writeOfflineDrafts(drafts);
    renderOfflineDrafts();
  }

  function renderOfflineDrafts() {
    if (!offlineDrafts) return;
    const drafts = readOfflineDrafts();
    if (!drafts.length) {
      offlineDrafts.classList.add("hidden");
      offlineDrafts.innerHTML = "";
      return;
    }
    offlineDrafts.classList.remove("hidden");
    offlineDrafts.innerHTML = (
      "<strong>离线草稿</strong>" +
      drafts.map(function (draft, index) {
        return (
          "<div class='offline-draft-item'>" +
          "<span>" + escapeHtml(draft.date || "") + "</span>" +
          "<p>" + escapeHtml(draft.content.slice(0, 80)) + (draft.content.length > 80 ? "..." : "") + "</p>" +
          "<button type='button' class='ghost-button' data-use-draft='" + index + "'>继续分析</button>" +
          "</div>"
        );
      }).join("")
    );
  }

  function initServiceWorker() {
    if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
    navigator.serviceWorker.register("/service-worker.js").catch(function () {});
  }

  function initVoiceDiary() {
    if (!voiceDiaryBtn || !diary) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      voiceDiaryBtn.disabled = true;
      voiceDiaryBtn.textContent = "不支持语音";
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = getLanguage() === "en" ? "en-US" : "zh-CN";
    let listening = false;
    let voiceBaseText = "";
    let finalTranscript = "";

    function mergeVoiceText(baseText, spokenText) {
      const base = (baseText || "").trimEnd();
      const spoken = (spokenText || "").trim();
      if (!spoken) return base;
      return base ? base + "\n" + spoken : spoken;
    }

    recognition.onstart = function () {
      listening = true;
      voiceBaseText = diary.value || "";
      finalTranscript = "";
      voiceDiaryBtn.textContent = "正在听";
    };
    recognition.onend = function () {
      listening = false;
      voiceDiaryBtn.textContent = "语音输入";
    };
    recognition.onresult = function (event) {
      const finalParts = [];
      const interimParts = [];
      for (let i = 0; i < event.results.length; i += 1) {
        const text = event.results[i][0].transcript || "";
        if (event.results[i].isFinal) {
          finalParts.push(text);
        } else {
          interimParts.push(text);
        }
      }
      finalTranscript = finalParts.join(" ").trim();
      const interimTranscript = interimParts.join(" ").trim();
      const spokenText = (finalTranscript + " " + interimTranscript).trim();
      if (spokenText) {
        diary.value = mergeVoiceText(voiceBaseText, spokenText);
        updateDraftCount();
      }
    };
    recognition.onerror = function () {
      voiceDiaryBtn.textContent = "语音输入";
    };
    voiceDiaryBtn.addEventListener("click", function () {
      if (listening) recognition.stop();
      else {
        try {
          recognition.lang = getLanguage() === "en" ? "en-US" : "zh-CN";
          recognition.start();
        } catch (_e) {
          voiceDiaryBtn.textContent = "语音输入";
        }
      }
    });
  }

  function renderRituals(data) {
    if (!ritualPanel || !ritualActions) return;
    ritualPanel.classList.remove("hidden");
    const summary = data.summary || "今天已经被你认真看见";
    const letter = buildSelfLetter(data, clampScore(data.emotion_score));
    ritualActions.innerHTML = (
      "<button type='button' class='ritual-button' data-ritual='release'>把今天放下</button>" +
      "<button type='button' class='ritual-button' data-ritual='save' data-save-letter='" + escapeHtml(letter) + "'>保存这一刻</button>" +
      "<button type='button' class='ritual-button' data-ritual='tomorrow' data-future='" + escapeHtml(summary) + "'>给明天一点提醒</button>" +
      "<p id='ritual-status' class='ritual-status'></p>"
    );
  }

  async function fetchMusicCover(term) {
    const q = encodeURIComponent(term || "music");
    const url = "https://itunes.apple.com/search?media=music&entity=album&limit=1&term=" + q;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const payload = await res.json();
      const item = (payload.results || [])[0];
      if (!item || !item.artworkUrl100) return null;
      return item.artworkUrl100.replace("100x100bb", "300x300bb");
    } catch (_e) {
      return null;
    }
  }

  function foodImageUrl(term) {
    return mediaFallbackUrl(term || "饮食建议", "food");
  }

  function hashString(value) {
    let hash = 0;
    const text = String(value || "");
    for (let i = 0; i < text.length; i += 1) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }

  function mediaFallbackUrl(term, kind) {
    const palettes = [
      ["#fce7ef", "#f8a4bc", "#8f2444"],
      ["#e7f4ff", "#7fb2ff", "#27437a"],
      ["#e8f7f2", "#71d0b7", "#145c52"],
      ["#fff1d8", "#f4bd62", "#6d4612"],
    ];
    const palette = palettes[hashString(term + kind) % palettes.length];
    const label = escapeHtml(String(term || "").trim().slice(0, 16));
    const title = kind === "food" ? "饮食建议" : "音乐建议";
    const accentPath = kind === "food"
      ? "M355 155c72 18 125 82 125 157 0 92-74 166-166 166-86 0-158-65-166-149 57 16 120-1 162-43 37-36 51-84 45-131Z"
      : "M214 176h208v194c0 35-29 64-64 64s-64-29-64-64 29-64 64-64c14 0 28 5 39 13V223H239v147c0 35-29 64-64 64s-64-29-64-64 29-64 64-64c14 0 27 4 39 12V176Z";
    const svg = (
      "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 600'>" +
      "<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>" +
      "<stop offset='0' stop-color='" + palette[0] + "'/>" +
      "<stop offset='1' stop-color='" + palette[1] + "'/>" +
      "</linearGradient></defs>" +
      "<rect width='600' height='600' rx='42' fill='url(#g)'/>" +
      "<circle cx='478' cy='104' r='118' fill='rgba(255,255,255,0.34)'/>" +
      "<circle cx='118' cy='486' r='142' fill='rgba(255,255,255,0.24)'/>" +
      "<path d='" + accentPath + "' fill='rgba(255,255,255,0.55)'/>" +
      "<text x='42' y='86' font-family='Segoe UI, Microsoft YaHei, sans-serif' font-size='30' font-weight='700' fill='" + palette[2] + "'>" + title + "</text>" +
      "<text x='42' y='522' font-family='Segoe UI, Microsoft YaHei, sans-serif' font-size='42' font-weight='800' fill='" + palette[2] + "'>" + label + "</text>" +
      "</svg>"
    );
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  }

  async function buildMediaCards(items, kind) {
    const validItems = items.filter(function (x) { return !!x; }).slice(0, 4);
    if (!validItems.length) return "<p class='media-empty'>暂无推荐图片。</p>";

    if (kind === "music") {
      const covers = await Promise.all(validItems.map(fetchMusicCover));
      return validItems.map(function (name, idx) {
        const fallback = mediaFallbackUrl(name, "music");
        const src = covers[idx] || fallback;
        return (
          "<div class='media-card'>" +
          "<img loading='lazy' src=\"" + escapeHtml(src) + "\" data-fallback=\"" + escapeHtml(fallback) + "\" alt='音乐专辑封面'>" +
          "<p>" + escapeHtml(name) + "</p>" +
          "</div>"
        );
      }).join("");
    }

    return validItems.map(function (name) {
      const src = foodImageUrl(name);
      return (
        "<div class='media-card'>" +
        "<img loading='lazy' src=\"" + escapeHtml(src) + "\" alt=\"" + escapeHtml(name) + " 图片\">" +
        "<p>" + escapeHtml(name) + "</p>" +
        "</div>"
      );
    }).join("");
  }

  document.addEventListener("error", function (event) {
    const target = event.target;
    if (!target || target.tagName !== "IMG" || !target.dataset.fallback) return;
    if (target.src !== target.dataset.fallback) {
      target.src = target.dataset.fallback;
    }
  }, true);

  async function renderResultCard(data) {
    const emotion = data.emotion || "未知";
    const score = clampScore(data.emotion_score ?? 50);
    const summary = data.summary || "暂无总结。";
    const advice = data.advice || [];
    const music = data.music_suggestions || [];
    const food = data.food_suggestions || [];
    const tone = trendTone(score);
    const weather = moodWeatherForScore(score);
    const gentleTask = makeGentleTask(score, emotion, summary);
    const letter = buildSelfLetter(data, score);
    const taskDone = taskIsDone(gentleTask);

    const adviceHtml = advice.length
      ? advice.map(function (item) { return "<li>" + escapeHtml(item) + "</li>"; }).join("")
      : "<li>暂未生成建议</li>";
    const musicText = music.length ? music.map(escapeHtml).join("、") : "暂无";
    const foodText = food.length ? food.map(escapeHtml).join("、") : "暂无";
    const musicCards = await buildMediaCards(music, "music");
    const foodCards = await buildMediaCards(food, "food");

    return (
      "<div class='analysis-result-card' style='--analysis-color:" + tone.point + ";--analysis-soft:" + tone.soft + "'>" +
      "<div class='analysis-toolbar'>" +
      "<div class='analysis-header'>" +
      "<span class='emotion-chip'>" + escapeHtml(emotion) + "</span>" +
      "<span class='score-chip'>情绪分数 " + formatScore(score) + "/100</span>" +
      "</div>" +
      "<button type='button' class='ghost-button' data-clear-analysis>结束此次分析</button>" +
      "</div>" +
      "<div class='score-meter' aria-hidden='true'><span style='width:" + formatScore(score) + "%'></span></div>" +
      "<div class='mood-mini-weather " + weather.className + "'>" +
      "<span class='weather-mark'>" + weather.mark + "</span>" +
      "<div><strong>今日心情天气：" + weather.name + "</strong><p>" + weather.detail + "</p></div>" +
      "</div>" +
      "<div class='analysis-block analysis-summary'><h4>总结</h4><p>" + escapeHtml(summary) + "</p></div>" +
      "<div class='gentle-task-card'>" +
      "<label>" +
      "<input type='checkbox' data-gentle-task=\"" + escapeHtml(gentleTask) + "\"" + (taskDone ? " checked" : "") + ">" +
      "<span><strong>今日温柔任务</strong>" + escapeHtml(gentleTask) + "</span>" +
      "</label>" +
      "</div>" +
      "<div class='self-letter-card'>" +
      "<h4>写给今天的自己</h4>" +
      "<p>" + escapeHtml(letter) + "</p>" +
      "<button type='button' class='ghost-button' data-save-letter=\"" + escapeHtml(letter) + "\">收藏到心情信箱</button>" +
      "</div>" +
      "<div class='analysis-block'><h4>建议</h4><ul>" + adviceHtml + "</ul></div>" +
      "<div class='analysis-grid'>" +
      "<div><h4>音乐建议</h4><p>" + musicText + "</p></div>" +
      "<div><h4>饮食建议</h4><p>" + foodText + "</p></div>" +
      "</div>" +
      "<div class='analysis-media'>" +
      "<h4>音乐封面推荐</h4>" +
      "<div class='media-grid'>" + musicCards + "</div>" +
      "<h4>食物图片推荐</h4>" +
      "<div class='media-grid'>" + foodCards + "</div>" +
      "</div>" +
      "</div>"
    );
  }

  if (hasAnalyzePage) {
    restoreActiveAnalysis();
    renderMailbox();
    renderFutureMessages();
    renderOfflineDrafts();
    initVoiceDiary();
    updateDraftCount();
    diary.addEventListener("input", updateDraftCount);
    resultEl.addEventListener("click", function (event) {
      const clearButton = event.target.closest("[data-clear-analysis]");
      if (clearButton) clearActiveAnalysis();
      const saveButton = event.target.closest("[data-save-letter]");
      if (saveButton) {
        saveLetter(saveButton.dataset.saveLetter || "");
        saveButton.textContent = "已收藏";
      }
    });
    if (offlineDrafts) {
      offlineDrafts.addEventListener("click", function (event) {
        const draftButton = event.target.closest("[data-use-draft]");
        if (!draftButton) return;
        const drafts = readOfflineDrafts();
        const index = Number(draftButton.dataset.useDraft);
        const draft = drafts[index];
        if (!draft) return;
        diary.value = draft.content || "";
        drafts.splice(index, 1);
        writeOfflineDrafts(drafts);
        renderOfflineDrafts();
        updateDraftCount();
        diary.focus();
      });
    }
    if (saveFutureBtn) {
      saveFutureBtn.addEventListener("click", saveFutureMessage);
    }
    if (futureList) {
      futureList.addEventListener("click", function (event) {
        const deleteButton = event.target.closest("[data-delete-future]");
        if (!deleteButton) return;
        const messages = readStoredJson(FUTURE_MESSAGES_KEY, []);
        messages.splice(Number(deleteButton.dataset.deleteFuture), 1);
        writeStoredJson(FUTURE_MESSAGES_KEY, messages);
        renderFutureMessages();
      });
    }
    if (ritualActions) {
      ritualActions.addEventListener("click", function (event) {
        const ritualButton = event.target.closest("[data-ritual]");
        if (!ritualButton) return;
        const status = document.getElementById("ritual-status");
        if (ritualButton.dataset.saveLetter) {
          saveLetter(ritualButton.dataset.saveLetter);
          if (status) status.textContent = "这一刻已保存到心情信箱。";
        } else if (ritualButton.dataset.future) {
          const messages = readStoredJson(FUTURE_MESSAGES_KEY, []);
          messages.unshift({
            text: "明天提醒：" + ritualButton.dataset.future,
            created: todayKey(),
            due: addDaysIso(1),
          });
          writeStoredJson(FUTURE_MESSAGES_KEY, messages.slice(0, 20));
          renderFutureMessages();
          if (status) status.textContent = "已为明天留下提醒。";
        } else if (status) {
          status.textContent = "今天已经被你轻轻放下。";
        }
      });
    }
    resultEl.addEventListener("change", function (event) {
      const taskToggle = event.target.closest("[data-gentle-task]");
      if (taskToggle) {
        setTaskDone(taskToggle.dataset.gentleTask || "", taskToggle.checked);
      }
    });
    if (clearMailboxBtn) {
      clearMailboxBtn.addEventListener("click", function () {
        writeMailbox([]);
        renderMailbox();
      });
    }

    analyzeBtn.addEventListener("click", async function () {
    const content = (diary.value || "").trim();
    if (!content) {
      showError("请先写一点内容再分析。");
      return;
    }
    if (!navigator.onLine) {
      saveOfflineDraft(content);
      showError("当前离线，日记已保存为草稿。网络恢复后可继续分析。");
      return;
    }
    analyzeBtn.disabled = true;
    analyzeBtn.classList.add("is-loading");
    errorEl.classList.add("hidden");
    resultEl.classList.remove("hidden");
    resultEl.innerHTML = "<div class='analysis-loading'>分析中，请稍候...</div>";

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          persona_name: getPersona(),
          language: getLanguage(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showError(data.error || "分析失败，请稍后重试。");
        return;
      }
      const cardHtml = await renderResultCard(data);
      showResult(cardHtml, true);
      renderRituals(data);
      diary.value = "";
      updateDraftCount();
    } catch (e) {
      saveOfflineDraft(content);
      showError("网络异常，已保存为离线草稿：" + e.message);
    } finally {
      analyzeBtn.disabled = false;
      analyzeBtn.classList.remove("is-loading");
    }
    });
  }

  function formatHistoryDate(dateText) {
    const parts = String(dateText || "").split("-");
    if (parts.length === 3) {
      return Number(parts[1]) + "月" + Number(parts[2]) + "日";
    }
    return dateText || "";
  }

  function renderHistorySummary(entries) {
    if (!historySummary) return;
    const scores = entries
      .map(function (entry) { return Number(entry.emotion_score) || 0; })
      .filter(function (score) { return score > 0; });
    if (!scores.length) {
      historySummary.innerHTML = "";
      historySummary.classList.add("hidden");
      return;
    }
    historySummary.classList.remove("hidden");
    const average = scores.reduce(function (sum, score) { return sum + score; }, 0) / scores.length;
    const latest = scores[0];
    const high = Math.max.apply(null, scores);
    const items = [
      { label: "记录", value: entries.length + " 条", tone: trendTone(average) },
      { label: "最新", value: formatScore(latest), tone: trendTone(latest) },
      { label: "平均", value: formatScore(average), tone: trendTone(average) },
      { label: "最高", value: formatScore(high), tone: trendTone(high) },
    ];
    historySummary.innerHTML = items.map(function (item) {
      return (
        "<div class='history-stat' style='--stat-bg:" + item.tone.soft + ";--stat-color:" + item.tone.point + "'>" +
        "<span>" + item.label + "</span>" +
        "<strong>" + item.value + "</strong>" +
        "</div>"
      );
    }).join("");
  }

  function localIsoDate(year, monthIndex, day) {
    const month = String(monthIndex + 1).padStart(2, "0");
    const date = String(day).padStart(2, "0");
    return year + "-" + month + "-" + date;
  }

  function renderMoodCalendar(entries) {
    if (!moodCalendar) return;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = localIsoDate(year, month, now.getDate());
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const byDate = {};

    entries.forEach(function (entry) {
      const date = String(entry.date || "");
      const score = clampScore(entry.emotion_score);
      if (!date || score <= 0) return;
      if (!byDate[date]) byDate[date] = [];
      byDate[date].push(score);
    });

    const weekdayLabels = ["日", "一", "二", "三", "四", "五", "六"];
    let html = (
      "<div class='calendar-head'>" +
      "<div><p class='section-kicker'>Calendar</p><h3>情绪日历</h3></div>" +
      "<span>" + (month + 1) + "月</span>" +
      "</div>" +
      "<div class='calendar-grid calendar-weekdays'>" +
      weekdayLabels.map(function (label) { return "<span>" + label + "</span>"; }).join("") +
      "</div>" +
      "<div class='calendar-grid calendar-days'>"
    );

    for (let i = 0; i < firstWeekday; i += 1) {
      html += "<span class='calendar-day is-empty'></span>";
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const iso = localIsoDate(year, month, day);
      const scores = byDate[iso] || [];
      const average = scores.length
        ? scores.reduce(function (sum, score) { return sum + score; }, 0) / scores.length
        : 0;
      const tone = trendTone(average);
      html += (
        "<span class='calendar-day" + (iso === today ? " is-today" : "") + (scores.length ? " has-entry" : "") + "' " +
        "style='--day-color:" + tone.point + ";--day-bg:" + tone.soft + "' title='" + iso + "'>" +
        "<strong>" + day + "</strong>" +
        (scores.length ? "<em>" + formatScore(average) + "</em>" : "") +
        "</span>"
      );
    }
    html += "</div>";
    moodCalendar.innerHTML = html;
  }

  function renderHistoryItem(entry) {
    const score = Math.max(0, Math.min(100, Number(entry.emotion_score) || 0));
    const tone = trendTone(score);
    const summary = entry.summary || entry.content_preview || "暂无摘要";
    return (
      "<article class='history-item' style='--item-bg:" + tone.soft + ";--item-color:" + tone.point + "'>" +
      "<div class='history-item-head'>" +
      "<span class='date'>" + escapeHtml(formatHistoryDate(entry.date)) + "</span>" +
      "<span class='history-score'>" + formatScore(score) + "</span>" +
      "</div>" +
      "<div class='history-emotion-row'>" +
      "<span class='emotion-chip'>" + escapeHtml(entry.emotion || "未知") + "</span>" +
      "<span class='history-tone'>" + escapeHtml(tone.label) + "</span>" +
      "</div>" +
      "<div class='score-meter history-meter' aria-hidden='true'><span style='width:" + formatScore(score) + "%'></span></div>" +
      "<p class='summary'>" + escapeHtml(summary) + "</p>" +
      "</article>"
    );
  }

  function historyMatchesFilters(entry) {
    const q = (historySearch && historySearch.value || "").trim().toLowerCase();
    const scoreMode = historyScoreFilter ? historyScoreFilter.value : "all";
    const score = clampScore(entry.emotion_score);
    const text = [
      entry.date,
      entry.emotion,
      entry.summary,
      entry.content_preview,
      String(entry.emotion_score),
    ].join(" ").toLowerCase();

    if (q && text.indexOf(q) === -1) return false;
    if (scoreMode === "high" && score < 80) return false;
    if (scoreMode === "mid" && (score < 50 || score >= 80)) return false;
    if (scoreMode === "low" && score >= 50) return false;
    return true;
  }

  function applyHistoryFilters() {
    if (!historyList) return;
    const filtered = cachedHistoryEntries.filter(historyMatchesFilters);
    historyList.innerHTML = filtered.length === 0
      ? "<div class='history-empty'><strong>没有匹配记录</strong><span>换一个关键词或分数范围试试。</span></div>"
      : filtered.map(renderHistoryItem).join("");
  }

  async function loadHistory() {
    try {
      const res = await fetch("/api/entries");
      const entries = await res.json();
      cachedHistoryEntries = entries;
      renderHistorySummary(entries);
      renderMoodCalendar(entries);
      if (entries.length === 0) {
        historyList.innerHTML = "<div class='history-empty'><strong>还没有历史记录</strong><span>写下一次心情后，这里会自动生成时间线。</span></div>";
      } else {
        applyHistoryFilters();
      }
    } catch (e) {
      if (historySummary) {
        historySummary.innerHTML = "";
        historySummary.classList.add("hidden");
      }
      if (moodCalendar) moodCalendar.innerHTML = "";
      historyList.innerHTML = "<div class='history-empty'><strong>历史记录加载失败</strong><span>请稍后刷新页面再试。</span></div>";
    }
  }

  function formatTrendLabel(dateText) {
    const parts = String(dateText || "").split("-");
    if (parts.length === 3) {
      return Number(parts[1]) + "/" + Number(parts[2]);
    }
    return dateText || "";
  }

  function formatScore(value) {
    return Math.round(Number(value) || 0);
  }

  function trendTone(score) {
    if (score >= 80) return { point: "#15b79e", soft: "rgba(21, 183, 158, 0.15)", label: "状态舒展" };
    if (score >= 50) return { point: "#5b7cfa", soft: "rgba(91, 124, 250, 0.14)", label: "状态平稳" };
    return { point: "#f0627f", soft: "rgba(240, 98, 127, 0.16)", label: "需要照顾" };
  }

  function chartGradient(chart, alpha) {
    const area = chart.chartArea;
    if (!area) return "rgba(232, 90, 122, " + alpha + ")";
    const gradient = chart.ctx.createLinearGradient(area.left, area.top, area.right, area.bottom);
    gradient.addColorStop(0, "rgba(91, 124, 250, " + alpha + ")");
    gradient.addColorStop(0.48, "rgba(232, 90, 122, " + alpha + ")");
    gradient.addColorStop(1, "rgba(21, 183, 158, " + alpha + ")");
    return gradient;
  }

  function renderTrendSummary(labels, scores) {
    if (!trendSummary) return;
    const usable = scores.filter(function (score) { return Number(score) > 0; });
    if (!usable.length) {
      trendSummary.innerHTML = "<div class='trend-empty'>最近 7 天还没有可绘制的心情记录</div>";
      return;
    }

    const latest = usable[usable.length - 1];
    const average = usable.reduce(function (sum, score) { return sum + Number(score); }, 0) / usable.length;
    const high = Math.max.apply(null, usable);
    const low = Math.min.apply(null, usable);
    const latestTone = trendTone(latest);
    const items = [
      { label: "最新", value: formatScore(latest), tone: latestTone },
      { label: "平均", value: formatScore(average), tone: trendTone(average) },
      { label: "高点", value: formatScore(high), tone: trendTone(high) },
      { label: "低点", value: formatScore(low), tone: trendTone(low) },
    ];

    trendSummary.innerHTML = items.map(function (item) {
      return (
        "<div class='trend-pill' style='--pill-bg:" + item.tone.soft + ";--pill-color:" + item.tone.point + "'>" +
        "<span>" + item.label + "</span>" +
        "<strong>" + item.value + "</strong>" +
        "</div>"
      );
    }).join("");
  }

  function renderMoodWeather(scores) {
    if (!moodWeather) return;
    const usable = scores.filter(function (score) { return Number(score) > 0; });
    if (!usable.length) {
      moodWeather.innerHTML = (
        "<div class='weather-empty'>" +
        "<strong>还没有心情天气</strong>" +
        "<span>完成一次分析后，这里会根据最近记录生成天气。</span>" +
        "</div>"
      );
      return;
    }
    const latest = usable[usable.length - 1];
    const average = usable.reduce(function (sum, score) { return sum + Number(score); }, 0) / usable.length;
    const diff = Math.round(latest - average);
    const weather = moodWeatherForScore(latest);
    const diffText = diff === 0
      ? "和近 7 天平均值持平"
      : diff > 0
        ? "比近 7 天平均值高 " + diff + " 分"
        : "比近 7 天平均值低 " + Math.abs(diff) + " 分";

    moodWeather.innerHTML = (
      "<div class='weather-card " + weather.className + "'>" +
      "<div class='weather-mark'>" + weather.mark + "</div>" +
      "<div class='weather-copy'>" +
      "<span>今日 " + formatScore(latest) + "/100</span>" +
      "<strong>" + weather.name + "</strong>" +
      "<p>" + weather.detail + "</p>" +
      "</div>" +
      "<div class='weather-diff'>" + diffText + "</div>" +
      "</div>"
    );
  }

  function inferEnergy(entry) {
    const text = ((entry.emotion || "") + " " + (entry.summary || "")).toLowerCase();
    const highWords = ["焦虑", "兴奋", "愤怒", "紧张", "激动", "anxious", "angry", "excited", "stress"];
    const lowWords = ["疲惫", "难过", "低落", "平静", "calm", "sad", "tired", "depressed"];
    let energy = 52;
    highWords.forEach(function (word) {
      if (text.indexOf(word) !== -1) energy += 16;
    });
    lowWords.forEach(function (word) {
      if (text.indexOf(word) !== -1) energy -= 12;
    });
    energy += (clampScore(entry.emotion_score) - 50) * 0.28;
    return Math.max(8, Math.min(92, energy));
  }

  function renderMoodMap(entries) {
    if (!moodMap) return;
    const usable = entries.filter(function (entry) {
      return clampScore(entry.emotion_score) > 0;
    }).slice(0, 18);
    if (!usable.length) {
      moodMap.innerHTML = "<div class='trend-empty'>还没有足够记录生成情绪地图。</div>";
      return;
    }
    moodMap.innerHTML = (
      "<div class='mood-map-stage'>" +
      "<span class='map-axis map-axis-top'>能量高</span>" +
      "<span class='map-axis map-axis-bottom'>能量低</span>" +
      "<span class='map-axis map-axis-left'>不愉悦</span>" +
      "<span class='map-axis map-axis-right'>愉悦</span>" +
      usable.map(function (entry) {
        const score = clampScore(entry.emotion_score);
        const energy = inferEnergy(entry);
        const tone = trendTone(score);
        return (
          "<button class='mood-dot' type='button' " +
          "style='--x:" + score + "%;--y:" + (100 - energy) + "%;--dot-color:" + tone.point + "' " +
          "title='" + escapeHtml((entry.date || "") + " " + (entry.emotion || "") + " " + score) + "'>" +
          "<span>" + formatScore(score) + "</span>" +
          "</button>"
        );
      }).join("") +
      "</div>" +
      "<p class='map-note'>横向表示愉悦程度，纵向表示能量强弱；位置由情绪分数和文字线索轻量推断。</p>"
    );
  }

  function renderWeeklyReport(scores, entries) {
    if (!weeklyReport) return;
    const usable = scores.filter(function (score) { return Number(score) > 0; });
    if (!usable.length) {
      weeklyReport.innerHTML = "<div class='trend-empty'>完成几次分析后，这里会生成一张轻量周报。</div>";
      return;
    }
    const average = usable.reduce(function (sum, score) { return sum + Number(score); }, 0) / usable.length;
    const latest = usable[usable.length - 1];
    const high = Math.max.apply(null, usable);
    const low = Math.min.apply(null, usable);
    const tone = trendTone(average);
    const activeDays = usable.length;
    const direction = latest >= average ? "本周尾声比平均状态更轻一些。" : "本周尾声比平均状态更需要照顾。";
    const reminder = low < 35
      ? "本周出现过较低分数，建议把休息和求助放在更靠前的位置。"
      : high - low > 35
        ? "本周波动较明显，可以留意触发变化的场景。"
        : "本周整体波动不大，稳定感正在慢慢累积。";

    weeklyReport.innerHTML = (
      "<div class='weekly-report-grid'>" +
      "<div class='weekly-score' style='--weekly-color:" + tone.point + ";--weekly-bg:" + tone.soft + "'>" +
      "<span>平均心情</span><strong>" + formatScore(average) + "</strong>" +
      "</div>" +
      "<div><span>记录天数</span><strong>" + activeDays + " 天</strong></div>" +
      "<div><span>最高 / 最低</span><strong>" + formatScore(high) + " / " + formatScore(low) + "</strong></div>" +
      "</div>" +
      "<div class='weekly-copy'>" +
      "<p>" + direction + "</p>" +
      "<p>" + reminder + "</p>" +
      "<p>最近历史记录：" + entries.slice(0, 3).map(function (entry) {
        return escapeHtml(entry.emotion || "未知");
      }).join("、") + "</p>" +
      "</div>"
    );
  }

  const trendCanvasGlow = {
    id: "trendCanvasGlow",
    beforeDatasetsDraw: function (chart) {
      const area = chart.chartArea;
      if (!area) return;
      const ctx = chart.ctx;
      ctx.save();
      const glow = ctx.createLinearGradient(area.left, area.top, area.right, area.bottom);
      glow.addColorStop(0, "rgba(91, 124, 250, 0.08)");
      glow.addColorStop(0.52, "rgba(232, 90, 122, 0.09)");
      glow.addColorStop(1, "rgba(21, 183, 158, 0.08)");
      ctx.fillStyle = glow;
      ctx.fillRect(area.left, area.top, area.right - area.left, area.bottom - area.top);
      ctx.restore();
    },
  };

  let trendChart = null;
  async function loadTrend() {
    try {
      const res = await fetch("/api/trend");
      const entriesRes = await fetch("/api/entries").catch(function () { return null; });
      if (!res.ok) {
        throw new Error("Trend request failed");
      }
      const data = await res.json();
      const entries = entriesRes && entriesRes.ok ? await entriesRes.json() : [];
      const labels = data.trend.map(function (x) { return x.date; });
      const scores = data.trend.map(function (x) { return Number(x.score) || 0; });
      const plottedScores = scores.map(function (score) { return score > 0 ? score : null; });
      renderTrendSummary(labels, scores);
      renderMoodWeather(scores);
      renderMoodMap(entries);
      renderWeeklyReport(scores, entries);

      if (typeof Chart === "undefined") {
        if (trendSummary) {
          trendSummary.innerHTML = "<div class='trend-empty'>当前离线，趋势图表库未加载；其他本地洞察仍可查看。</div>";
        }
        return;
      }
      if (trendChart) trendChart.destroy();
      trendChart = new Chart(trendCanvas, {
        type: "line",
        data: {
          labels: labels,
          datasets: [{
            label: "情绪分数",
            data: plottedScores,
            borderColor: function (context) {
              return chartGradient(context.chart, 0.95);
            },
            backgroundColor: function (context) {
              return chartGradient(context.chart, 0.18);
            },
            pointBackgroundColor: function (context) {
              return trendTone(Number(context.raw) || 0).point;
            },
            pointBorderColor: "#fff",
            pointBorderWidth: 2.5,
            pointHoverBackgroundColor: "#fff",
            pointHoverBorderWidth: 3,
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 3,
            fill: true,
            tension: 0.42,
            cubicInterpolationMode: "monotone",
            spanGaps: true,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            intersect: false,
            mode: "index",
          },
          layout: {
            padding: {
              top: 12,
              right: 10,
              bottom: 2,
              left: 2,
            },
          },
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              backgroundColor: "rgba(42, 26, 31, 0.94)",
              borderColor: "rgba(255, 255, 255, 0.16)",
              borderWidth: 1,
              displayColors: false,
              padding: 11,
              cornerRadius: 10,
              titleFont: {
                size: 12,
                weight: "600",
              },
              bodyFont: {
                size: 13,
                weight: "600",
              },
              callbacks: {
                title: function (items) {
                  return items[0] ? items[0].label : "";
                },
                label: function (context) {
                  const score = Number(context.raw) || 0;
                  return "心情分数 " + formatScore(score) + "/100";
                },
                afterLabel: function (context) {
                  const score = Number(context.raw) || 0;
                  return trendTone(score).label;
                },
              },
            },
          },
          scales: {
            x: {
              border: {
                display: false,
              },
              grid: {
                display: false,
              },
              ticks: {
                color: "#7a6470",
                maxRotation: 0,
                autoSkip: false,
                padding: 8,
                font: {
                  size: 11,
                  weight: "600",
                },
                callback: function (value, index) {
                  return formatTrendLabel(labels[index]);
                },
              },
            },
            y: {
              min: 0,
              max: 100,
              border: {
                display: false,
              },
              grid: {
                color: function (context) {
                  return context.tick.value === 50
                    ? "rgba(91, 124, 250, 0.18)"
                    : "rgba(122, 100, 112, 0.11)";
                },
                drawTicks: false,
              },
              ticks: {
                stepSize: 25,
                color: "#8b7580",
                padding: 8,
                font: {
                  size: 11,
                  weight: "600",
                },
              },
            },
          },
        },
        plugins: [trendCanvasGlow],
      });
    } catch (e) {
      if (moodWeather) {
        moodWeather.innerHTML = "<div class='weather-empty'><strong>趋势数据加载失败</strong><span>请稍后刷新页面再试。</span></div>";
      }
      if (trendSummary) {
        trendSummary.innerHTML = "<div class='trend-empty'>趋势图暂时加载失败，请稍后再试</div>";
      }
      if (moodMap) {
        moodMap.innerHTML = "<div class='trend-empty'>情绪地图暂时加载失败。</div>";
      }
      if (weeklyReport) {
        weeklyReport.innerHTML = "<div class='trend-empty'>周报暂时加载失败。</div>";
      }
    }
  }

  function initEmergencyKit() {
    if (breathToggle && breathOrb && breathLabel) {
      let timer = null;
      let step = 0;
      const steps = [
        { label: "吸气", className: "inhale" },
        { label: "停留", className: "hold" },
        { label: "呼气", className: "exhale" },
      ];
      function renderBreathStep() {
        const current = steps[step % steps.length];
        breathOrb.textContent = current.label;
        breathOrb.className = "breath-orb " + current.className;
        breathLabel.textContent = current.label === "吸气"
          ? "慢慢吸气 4 秒。"
          : current.label === "停留"
            ? "轻轻停留 2 秒。"
            : "缓慢呼气 6 秒。";
        step += 1;
      }
      breathToggle.addEventListener("click", function () {
        if (timer) {
          clearInterval(timer);
          timer = null;
          breathToggle.textContent = "开始";
          breathOrb.className = "breath-orb";
          breathOrb.textContent = "吸气";
          breathLabel.textContent = "跟随圆形节奏，慢慢吸气、停留、呼气。";
          return;
        }
        step = 0;
        renderBreathStep();
        timer = setInterval(renderBreathStep, 4200);
        breathToggle.textContent = "暂停";
      });
    }
    if (copySupportBtn && supportMessage) {
      copySupportBtn.addEventListener("click", async function () {
        try {
          await navigator.clipboard.writeText(supportMessage.value || "");
          if (copyStatus) copyStatus.textContent = "已复制，可以发给可信任的人。";
        } catch (_e) {
          supportMessage.select();
          if (copyStatus) copyStatus.textContent = "已选中文本，请手动复制。";
        }
      });
    }
  }

  initPrivacyLock();
  initServiceWorker();
  initEmergencyKit();

  if (hasHistoryPage) {
    if (historySearch) historySearch.addEventListener("input", applyHistoryFilters);
    if (historyScoreFilter) historyScoreFilter.addEventListener("change", applyHistoryFilters);
    loadHistory();
  }
  if (hasTrendPage) {
    loadTrend();
  }
})();
