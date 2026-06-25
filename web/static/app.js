(function () {
  const diary = document.getElementById("diary");
  const analyzeBtn = document.getElementById("analyze");
  const voiceDiaryBtn = document.getElementById("voice-diary");
  const draftCount = document.getElementById("draft-count");
  const resultEl = document.getElementById("analysis-result");
  const errorEl = document.getElementById("analysis-error");
  const petCard = document.getElementById("pet-card");
  const historyList = document.getElementById("history-list");
  const historySummary = document.getElementById("history-summary");
  const historySearch = document.getElementById("history-search");
  const historyScoreFilter = document.getElementById("history-score-filter");
  const moodCalendar = document.getElementById("mood-calendar");
  const moodWeather = document.getElementById("mood-weather");
  const moodMap = document.getElementById("mood-map");
  const weeklyReport = document.getElementById("weekly-report");
  const ritualPanel = document.getElementById("ritual-panel");
  const ritualActions = document.getElementById("ritual-actions");
  const pinInput = document.getElementById("pin-input");
  const savePinBtn = document.getElementById("save-pin");
  const clearPinBtn = document.getElementById("clear-pin");
  const privacyStatus = document.getElementById("privacy-status");
  const offlineDrafts = document.getElementById("offline-drafts");
  const profileModal = document.getElementById("profile-modal");
  const profileForm = document.getElementById("profile-form");
  const profileEditBtn = document.getElementById("profile-edit");
  const profileSkipBtn = document.getElementById("profile-skip");
  const profileLocateBtn = document.getElementById("profile-locate");
  const profileLocationStatus = document.getElementById("profile-location-status");
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
  const APP_CLIENT_VERSION = "streamlined-home-v1";
  const ACTIVE_ANALYSIS_KEY = "emotionDiary.activeAnalysis";
  const UI_LANGUAGE_KEY = "emotionDiary.uiLanguage";
  const GENTLE_TASK_KEY = "emotionDiary.gentleTasks";
  const PIN_KEY = "emotionDiary.pin";
  const UNLOCKED_KEY = "emotionDiary.unlocked";
  const OFFLINE_DRAFTS_KEY = "emotionDiary.offlineDrafts";
  const MAX_RECOMMENDATION_ITEMS = 2;
  const MAX_MEDIA_CARDS = 1;
  let cachedHistoryEntries = [];
  let cachedPetState = null;
  let cachedUserProfile = null;
  let pendingWeatherContext = null;

  const FOOD_IMAGE_SOURCES = [
    {
      keys: ["水果", "fruit", "莓", "苹果", "香蕉", "橙"],
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Fruktsallad_%28Fruit_salad%29.jpg/500px-Fruktsallad_%28Fruit_salad%29.jpg",
    },
    {
      keys: ["燕麦", "粥", "oat", "porridge", "牛奶", "早餐"],
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Oatmeal_with_Berries.jpg/500px-Oatmeal_with_Berries.jpg",
    },
    {
      keys: ["鱼", "清蒸鱼", "fish"],
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Fish_stuffed_with_Thai_herbs.jpg/500px-Fish_stuffed_with_Thai_herbs.jpg",
    },
    {
      keys: ["蔬菜", "清蒸", "vegetable", "greens"],
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Steamed_vegetables_CM.jpg/500px-Steamed_vegetables_CM.jpg",
    },
    {
      keys: ["沙拉", "salad"],
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Vegetable_Salad_%28Unsplash%29.jpg/500px-Vegetable_Salad_%28Unsplash%29.jpg",
    },
    {
      keys: ["坚果", "核桃", "杏仁", "nuts", "almond"],
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Beer_Nuts_%28cropped%29.jpg/500px-Beer_Nuts_%28cropped%29.jpg",
    },
    {
      keys: ["汤", "soup"],
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/-2022-02-01_Bowl_of_spring_vegetable_soup%2C_Trimingham%2C_Norfolk.JPG/500px--2022-02-01_Bowl_of_spring_vegetable_soup%2C_Trimingham%2C_Norfolk.JPG",
    },
    {
      keys: ["热饮", "茶", "tea", "warm"],
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Hot_Lemon_Tea.jpg/500px-Hot_Lemon_Tea.jpg",
    },
    {
      keys: ["酸奶", "yogurt", "优格"],
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Liat_Portal_for_Foodie_Disorder_-_Yogurt_Bowl_with_Figs%2C_Nuts%2C_Chia_Seeds%2C_and_Seaweed.jpg/500px-Liat_Portal_for_Foodie_Disorder_-_Yogurt_Bowl_with_Figs%2C_Nuts%2C_Chia_Seeds%2C_and_Seaweed.jpg",
    },
  ];

  const DEFAULT_FOOD_IMAGES = [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Vegetable_Salad_%28Unsplash%29.jpg/500px-Vegetable_Salad_%28Unsplash%29.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Fruktsallad_%28Fruit_salad%29.jpg/500px-Fruktsallad_%28Fruit_salad%29.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Oatmeal_with_Berries.jpg/500px-Oatmeal_with_Berries.jpg",
  ];

  const I18N = {
    zh: {
      appTitle: "AI 情绪日记",
      homeSubtitle: "记录当下，温柔看见自己的情绪变化",
      historySubtitle: "回看每一次记录，看到自己的变化轨迹",
      trendsSubtitle: "从心情天气和趋势曲线看见情绪的长期变化",
      kitSubtitle: "在情绪很重的时候，先把自己稳稳接住",
      personaLabel: "人格风格",
      uiLanguageLabel: "界面语言",
      languageChinese: "中文",
      languageEnglish: "English",
      composeTitle: "记录今日感受",
      diaryPlaceholder: "写下你今天的心情（支持 emoji）。",
      privacyNote: "仅保存在你的当前会话",
      voiceInput: "语音输入",
      voiceListening: "正在听",
      voiceUnsupported: "不支持语音",
      startAnalysis: "开始分析",
      ritualTitle: "情绪仪式",
      save: "保存",
      privacyLockTitle: "私密锁",
      pinPlaceholder: "设置 4 位 PIN",
      setPin: "设置",
      closePin: "关闭",
      clear: "清空",
      footerNote: "AI 结果仅供参考，不替代专业心理咨询或医疗建议。",
      navAnalyze: "分析",
      navHistory: "历史记录",
      navTrends: "趋势分析",
      navKit: "急救包",
      historyTitle: "历史记录",
      historySearchPlaceholder: "搜索情绪、摘要、日期或分数",
      scoreAll: "全部分数",
      scoreHigh: "80 分以上",
      scoreMid: "50-79 分",
      scoreLow: "低于 50 分",
      moodWeatherTitle: "心情天气",
      trendTitle: "情绪趋势（近 7 天）",
      trendChartLabel: "最近 7 天情绪分数折线图",
      moodMapTitle: "情绪地图",
      weeklyReportTitle: "情绪复盘周报",
      kitTitle: "心情急救包",
      kitIntro: "如果你现在很难受，先不用解决整个人生。只完成下面一个很小的步骤。",
      breathingTitle: "呼吸练习",
      start: "开始",
      pause: "暂停",
      inhale: "吸气",
      hold: "停留",
      exhale: "呼气",
      breathGuide: "跟随圆形节奏，慢慢吸气、停留、呼气。",
      inhaleGuide: "慢慢吸气 4 秒。",
      holdGuide: "轻轻停留 2 秒。",
      exhaleGuide: "缓慢呼气 6 秒。",
      groundingTitle: "5-4-3-2-1 接地练习",
      grounding5: "说出你看见的 5 个东西",
      grounding4: "触摸你能感到的 4 个东西",
      grounding3: "听见周围的 3 种声音",
      grounding2: "闻到 2 种气味",
      grounding1: "感受 1 个身体正在支撑你的地方",
      supportTitle: "给可信任的人发一句话",
      supportMessage: "我现在状态不太好，可能不需要你马上解决什么，但我想让你陪我说几句话。",
      copySupport: "复制这句话",
      copySuccess: "已复制，可以发给可信任的人。",
      copyManual: "已选中文本，请手动复制。",
      safetyTitle: "安全提醒",
      safetyText: "如果你有伤害自己或他人的冲动，请立刻联系身边可信任的人、当地紧急服务，或前往最近的医院急诊。你不需要一个人撑过去。",
      charUnit: "字",
      writeContentFirst: "请先写一点内容再分析。",
      offlineDraftSaved: "当前离线，日记已保存为草稿。网络恢复后可继续分析。",
      analyzing: "分析中，请稍候...",
      analysisFailed: "分析失败，请稍后重试。",
      networkDraftSaved: "网络异常，已保存为离线草稿：",
      emotionScore: "情绪分数",
      endAnalysis: "结束此次分析",
      todayMoodWeather: "今日心情天气：",
      summaryTitle: "总结",
      gentleTaskTitle: "今日温柔任务",
      selfLetterTitle: "写给今天的自己",
      adviceTitle: "建议",
      musicTitle: "音乐建议",
      foodTitle: "饮食建议",
      musicCoverTitle: "音乐推荐",
      foodImageTitle: "食物推荐",
      noAdvice: "暂未生成建议",
      noneText: "暂无",
      noMedia: "暂无推荐图片。",
      petKicker: "Pet",
      petTitle: "陪伴小桃",
      petLoading: "小桃正在醒来...",
      petReady: "今日已续火，明天再来看看它。",
      petWaiting: "今天写一篇日记，就能给小桃续火 +1。",
      petSleepy: "小桃在等你重新开始陪伴。",
      petPoints: "亲密值",
      petStreak: "连续陪伴",
      petLevel: "等级",
      petDays: "天",
      petNextLevel: "距离下一级还差 ",
      petMaxLevel: "已经是满级陪伴",
      profileEdit: "个性偏好",
      profileTitle: "先认识你一点点",
      profileIntro: "选择你喜欢的事物，之后的分析建议会更贴近你的生活。",
      profileSkip: "稍后",
      profileSports: "运动",
      profileGames: "游戏 / 电竞",
      profileHobbies: "日常爱好",
      profileMusic: "音乐类型",
      profileMbti: "MBTI",
      profileMbtiEmpty: "不确定 / 暂不选择",
      profileMovie: "喜欢的电影类型",
      profileMoviePlaceholder: "例如：科幻、悬疑、治愈片",
      profileNotes: "其他想让 AI 记住的偏好",
      profileNotesPlaceholder: "例如：不喜欢太鸡汤，希望建议更具体",
      profileLocate: "获取城市天气",
      profileLocationIdle: "可选：授权后会按当日天气给建议。",
      profileLocating: "正在获取城市和天气...",
      profileLocationDenied: "未获取定位，也可以继续保存偏好。",
      profileLocationSaved: "已记录天气：",
      profileSave: "保存并开始",
      profileSaved: "已保存，之后会按你的偏好给建议。",
      profileSaveFailed: "保存失败，请稍后再试。",
    },
    en: {
      appTitle: "AI Emotion Diary",
      homeSubtitle: "Record this moment and gently notice how your emotions move",
      historySubtitle: "Review each entry and see your emotional path over time",
      trendsSubtitle: "Use mood weather and trend lines to understand longer changes",
      kitSubtitle: "When emotions feel heavy, steady yourself one small step at a time",
      personaLabel: "Persona style",
      uiLanguageLabel: "Interface language",
      languageChinese: "中文",
      languageEnglish: "English",
      composeTitle: "Record today's feelings",
      diaryPlaceholder: "Write down how you feel today. Emoji are welcome.",
      privacyNote: "Saved only in your current session",
      voiceInput: "Voice input",
      voiceListening: "Listening",
      voiceUnsupported: "Voice unavailable",
      startAnalysis: "Start analysis",
      ritualTitle: "Emotion ritual",
      save: "Save",
      privacyLockTitle: "Private lock",
      pinPlaceholder: "Set a 4-digit PIN",
      setPin: "Set",
      closePin: "Turn off",
      clear: "Clear",
      footerNote: "AI results are for reference only and do not replace professional counseling or medical advice.",
      navAnalyze: "Analyze",
      navHistory: "History",
      navTrends: "Trends",
      navKit: "First aid",
      historyTitle: "History",
      historySearchPlaceholder: "Search emotion, summary, date, or score",
      scoreAll: "All scores",
      scoreHigh: "80 and above",
      scoreMid: "50-79",
      scoreLow: "Below 50",
      moodWeatherTitle: "Mood weather",
      trendTitle: "Emotion trend (7 days)",
      trendChartLabel: "Line chart of emotion scores from the last 7 days",
      moodMapTitle: "Emotion map",
      weeklyReportTitle: "Weekly emotion review",
      kitTitle: "Mood first-aid kit",
      kitIntro: "If you feel awful right now, you do not need to solve your whole life. Just complete one tiny step below.",
      breathingTitle: "Breathing exercise",
      start: "Start",
      pause: "Pause",
      inhale: "Inhale",
      hold: "Hold",
      exhale: "Exhale",
      breathGuide: "Follow the circle: inhale, hold, and exhale slowly.",
      inhaleGuide: "Inhale slowly for 4 seconds.",
      holdGuide: "Hold gently for 2 seconds.",
      exhaleGuide: "Exhale slowly for 6 seconds.",
      groundingTitle: "5-4-3-2-1 grounding",
      grounding5: "Name 5 things you can see",
      grounding4: "Touch 4 things you can feel",
      grounding3: "Notice 3 sounds around you",
      grounding2: "Notice 2 smells",
      grounding1: "Feel 1 place where your body is supported",
      supportTitle: "Send one sentence to someone you trust",
      supportMessage: "I'm not doing very well right now. I may not need you to fix anything, but I would like you to stay with me and talk for a bit.",
      copySupport: "Copy this sentence",
      copySuccess: "Copied. You can send it to someone you trust.",
      copyManual: "Text selected. Please copy it manually.",
      safetyTitle: "Safety reminder",
      safetyText: "If you feel an urge to hurt yourself or someone else, contact someone you trust, local emergency services, or the nearest hospital emergency department immediately. You do not have to get through this alone.",
      charUnit: "chars",
      writeContentFirst: "Write a little first, then start the analysis.",
      offlineDraftSaved: "You are offline. This diary entry has been saved as a draft.",
      analyzing: "Analyzing, please wait...",
      analysisFailed: "Analysis failed. Please try again later.",
      networkDraftSaved: "Network error. Saved as an offline draft: ",
      emotionScore: "Emotion score",
      endAnalysis: "End this analysis",
      todayMoodWeather: "Today's mood weather: ",
      summaryTitle: "Summary",
      gentleTaskTitle: "Gentle task today",
      selfLetterTitle: "A note to today's self",
      adviceTitle: "Suggestions",
      musicTitle: "Music",
      foodTitle: "Food",
      musicCoverTitle: "Music recommendation",
      foodImageTitle: "Food recommendation",
      noAdvice: "No suggestions yet",
      noneText: "None",
      noMedia: "No recommendation images yet.",
      petKicker: "Pet",
      petTitle: "Companion Momo",
      petLoading: "Momo is waking up...",
      petReady: "Spark renewed today. Come back tomorrow.",
      petWaiting: "Write one diary entry today to renew the spark +1.",
      petSleepy: "Momo is waiting for you to begin again.",
      petPoints: "Bond",
      petStreak: "Streak",
      petLevel: "Level",
      petDays: "days",
      petNextLevel: "Next level in ",
      petMaxLevel: "Max companion level",
      profileEdit: "Preferences",
      profileTitle: "A little about you",
      profileIntro: "Choose what you like so future suggestions can fit your life better.",
      profileSkip: "Later",
      profileSports: "Sports",
      profileGames: "Games / esports",
      profileHobbies: "Hobbies",
      profileMusic: "Music genres",
      profileMbti: "MBTI",
      profileMbtiEmpty: "Not sure / skip",
      profileMovie: "Favorite movie types",
      profileMoviePlaceholder: "e.g. sci-fi, mystery, comfort films",
      profileNotes: "Other preferences for AI",
      profileNotesPlaceholder: "e.g. less generic comfort, more concrete advice",
      profileLocate: "Get city weather",
      profileLocationIdle: "Optional: with permission, advice can consider today's weather.",
      profileLocating: "Getting city and weather...",
      profileLocationDenied: "Location was not added. You can still save preferences.",
      profileLocationSaved: "Weather saved: ",
      profileSave: "Save and start",
      profileSaved: "Saved. Future suggestions will use your preferences.",
      profileSaveFailed: "Could not save. Please try again later.",
    },
  };

  function getPersona() {
    const persona = document.getElementById("persona");
    return persona ? persona.value : "";
  }
  function getLanguage() {
    const language = document.getElementById("language");
    return language ? language.value : getStoredUiLanguage();
  }

  function getStoredUiLanguage() {
    try {
      const saved = localStorage.getItem(UI_LANGUAGE_KEY);
      return saved === "en" ? "en" : "zh";
    } catch (_e) {
      return "zh";
    }
  }

  function t(key) {
    const lang = getStoredUiLanguage();
    return (I18N[lang] && I18N[lang][key]) || I18N.zh[key] || key;
  }

  function applyInterfaceLanguage(lang) {
    const normalized = lang === "en" ? "en" : "zh";
    try {
      localStorage.setItem(UI_LANGUAGE_KEY, normalized);
    } catch (_e) {}
    document.documentElement.lang = normalized === "en" ? "en" : "zh-CN";

    const languageSelect = document.getElementById("language");
    if (languageSelect) languageSelect.value = normalized;

    document.querySelectorAll("[data-i18n]").forEach(function (node) {
      node.textContent = t(node.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (node) {
      node.setAttribute("placeholder", t(node.dataset.i18nPlaceholder));
    });
    document.querySelectorAll("[data-i18n-aria-label]").forEach(function (node) {
      node.setAttribute("aria-label", t(node.dataset.i18nAriaLabel));
    });
    document.querySelectorAll("[data-i18n-value]").forEach(function (node) {
      if (node.value === "" || node.defaultValue === node.value) {
        node.value = t(node.dataset.i18nValue);
        node.defaultValue = node.value;
      }
    });
    updateDraftCount();
    if (cachedPetState) renderPet(cachedPetState);
  }

  function initInterfaceLanguage() {
    applyInterfaceLanguage(getStoredUiLanguage());
    const languageSelect = document.getElementById("language");
    if (languageSelect) {
      languageSelect.addEventListener("change", function () {
        applyInterfaceLanguage(languageSelect.value);
      });
    }
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
        version: APP_CLIENT_VERSION,
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
      if (stored && stored.version !== APP_CLIENT_VERSION) {
        sessionStorage.removeItem(ACTIVE_ANALYSIS_KEY);
        return;
      }
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
    draftCount.textContent = count + " " + t("charUnit");
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

  function profileValues(name) {
    if (!profileForm) return [];
    return Array.from(profileForm.querySelectorAll("input[name='" + name + "']:checked"))
      .map(function (input) { return input.value; });
  }

  function setProfileValues(name, values) {
    if (!profileForm) return;
    const selected = new Set(Array.isArray(values) ? values : []);
    profileForm.querySelectorAll("input[name='" + name + "']").forEach(function (input) {
      input.checked = selected.has(input.value);
    });
  }

  function setProfileModalVisible(visible) {
    if (!profileModal) return;
    profileModal.classList.toggle("hidden", !visible);
    document.body.classList.toggle("profile-modal-open", visible);
  }

  function weatherLine(weather) {
    if (!weather) return "";
    const place = weather.city || weather.country || "";
    const label = weather.weather_label || "";
    const temp = weather.temperature !== undefined && weather.temperature !== null
      ? Math.round(Number(weather.temperature)) + "°C"
      : "";
    return [place, label, temp].filter(Boolean).join(" · ");
  }

  function renderProfileWeatherStatus(profile) {
    if (!profileLocationStatus) return;
    const weather = pendingWeatherContext || (profile && profile.weather);
    const line = weatherLine(weather);
    profileLocationStatus.textContent = line
      ? t("profileLocationSaved") + line
      : t("profileLocationIdle");
  }

  function fillProfileForm(profile) {
    if (!profileForm) return;
    const data = profile || {};
    setProfileValues("sports", data.sports);
    setProfileValues("games", data.games);
    setProfileValues("hobbies", data.hobbies);
    setProfileValues("music_genres", data.music_genres);
    const mbti = document.getElementById("profile-mbti");
    const movie = document.getElementById("profile-movie");
    const notes = document.getElementById("profile-notes");
    if (mbti) mbti.value = data.mbti || "";
    if (movie) movie.value = data.movie_preference || "";
    if (notes) notes.value = data.notes || "";
    pendingWeatherContext = data.weather || null;
    renderProfileWeatherStatus(data);
  }

  function collectProfileForm(completed) {
    const mbti = document.getElementById("profile-mbti");
    const movie = document.getElementById("profile-movie");
    const notes = document.getElementById("profile-notes");
    const current = cachedUserProfile || {};
    return {
      completed: completed,
      sports: profileValues("sports"),
      games: profileValues("games"),
      hobbies: profileValues("hobbies"),
      music_genres: profileValues("music_genres"),
      mbti: mbti ? mbti.value : "",
      movie_preference: movie ? movie.value : "",
      notes: notes ? notes.value : "",
      location_consent: !!(pendingWeatherContext || current.location_consent),
      city: pendingWeatherContext ? pendingWeatherContext.city : current.city,
      country: pendingWeatherContext ? pendingWeatherContext.country : current.country,
      latitude: pendingWeatherContext ? pendingWeatherContext.latitude : current.latitude,
      longitude: pendingWeatherContext ? pendingWeatherContext.longitude : current.longitude,
      weather: pendingWeatherContext || current.weather || null,
    };
  }

  async function saveProfile(completed) {
    if (!profileForm) return;
    const payload = collectProfileForm(completed);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const profile = await res.json();
      if (!res.ok) throw new Error(profile.error || t("profileSaveFailed"));
      cachedUserProfile = profile;
      fillProfileForm(profile);
      setProfileModalVisible(false);
      if (profileLocationStatus) profileLocationStatus.textContent = t("profileSaved");
    } catch (_e) {
      if (profileLocationStatus) profileLocationStatus.textContent = t("profileSaveFailed");
    }
  }

  async function locateForWeather() {
    if (!profileLocationStatus) return;
    if (!navigator.geolocation) {
      profileLocationStatus.textContent = t("profileLocationDenied");
      return;
    }
    profileLocationStatus.textContent = t("profileLocating");
    navigator.geolocation.getCurrentPosition(async function (position) {
      try {
        const coords = position.coords || {};
        const res = await fetch("/api/weather", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latitude: coords.latitude,
            longitude: coords.longitude,
          }),
        });
        const weather = await res.json();
        if (!res.ok) throw new Error(weather.error || t("profileLocationDenied"));
        pendingWeatherContext = weather;
        renderProfileWeatherStatus({ weather: weather });
      } catch (_e) {
        profileLocationStatus.textContent = t("profileLocationDenied");
      }
    }, function () {
      profileLocationStatus.textContent = t("profileLocationDenied");
    }, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 30 * 60 * 1000,
    });
  }

  async function initProfile() {
    if (!profileForm) return;
    try {
      const res = await fetch("/api/profile");
      if (!res.ok) return;
      cachedUserProfile = await res.json();
      fillProfileForm(cachedUserProfile);
      if (!cachedUserProfile.completed) setProfileModalVisible(true);
    } catch (_e) {}

    if (profileEditBtn) {
      profileEditBtn.addEventListener("click", function () {
        fillProfileForm(cachedUserProfile);
        setProfileModalVisible(true);
      });
    }
    if (profileSkipBtn) {
      profileSkipBtn.addEventListener("click", function () {
        saveProfile(true);
      });
    }
    if (profileLocateBtn) {
      profileLocateBtn.addEventListener("click", locateForWeather);
    }
    profileForm.addEventListener("submit", function (event) {
      event.preventDefault();
      saveProfile(true);
    });
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
      voiceDiaryBtn.textContent = t("voiceUnsupported");
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
      voiceDiaryBtn.textContent = t("voiceListening");
    };
    recognition.onend = function () {
      listening = false;
      voiceDiaryBtn.textContent = t("voiceInput");
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
      voiceDiaryBtn.textContent = t("voiceInput");
    };
    voiceDiaryBtn.addEventListener("click", function () {
      if (listening) recognition.stop();
      else {
        try {
          recognition.lang = getLanguage() === "en" ? "en-US" : "zh-CN";
          recognition.start();
        } catch (_e) {
          voiceDiaryBtn.textContent = t("voiceInput");
        }
      }
    });
  }

  function renderRituals(data) {
    if (!ritualPanel || !ritualActions) return;
    ritualPanel.classList.remove("hidden");
    ritualActions.innerHTML = (
      "<button type='button' class='ritual-button' data-ritual='release'>把今天放下</button>" +
      "<p id='ritual-status' class='ritual-status'></p>"
    );
  }

  function uniqueItems(items) {
    const seen = new Set();
    return items
      .map(function (item) { return String(item || "").trim(); })
      .filter(function (item) {
        if (!item || seen.has(item)) return false;
        seen.add(item);
        return true;
      });
  }

  function extractChineseMusicParts(term) {
    const text = String(term || "").trim();
    const titleMatch = text.match(/《([^》]+)》/);
    const artistMatch = text.match(/(?:如|例如)?\s*([^，、。；;（）()《》]{1,16})的《[^》]+》/);
    const artist = artistMatch ? artistMatch[1].replace(/^(如|例如)/, "").trim() : "";
    return {
      artist: artist,
      title: titleMatch ? titleMatch[1].trim() : "",
    };
  }

  function musicSearchQueries(term) {
    const text = String(term || "").trim();
    const parts = extractChineseMusicParts(text);
    const cleaned = text
      .replace(/[（(][^）)]*[）)]/g, " ")
      .replace(/[《》]/g, " ")
      .replace(/(例如|比如|如|专辑|单曲|歌曲|音乐建议|音乐推荐)/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const candidates = [];

    if (/赵雷/.test(text) && /鼓楼/.test(text)) candidates.push("赵雷 鼓楼");
    if (/班得瑞/.test(text)) candidates.push("Bandari");
    if (parts.artist && parts.title) candidates.push(parts.artist + " " + parts.title);
    if (parts.title) candidates.push(parts.title);
    if (/轻音乐|纯音乐/.test(text)) candidates.push("轻音乐", "relaxing piano music");
    if (/民谣/.test(text)) candidates.push("治愈系民谣", "healing folk");
    candidates.push(cleaned, text, "relaxing music");

    return uniqueItems(candidates).slice(0, 6);
  }

  function mediaCardLabel(name, kind) {
    const text = String(name || "").trim();
    if (kind === "music") {
      const parts = extractChineseMusicParts(text);
      if (parts.artist && parts.title) return parts.artist + "《" + parts.title + "》";
      if (parts.title) return "《" + parts.title + "》";
      return text
        .replace(/[（(][^）)]*[）)]/g, "")
        .replace(/\s+/g, " ")
        .trim() || text;
    }
    return text.split(/[、,，；;]/)[0].trim() || text;
  }

  async function fetchMusicCover(term) {
    const queries = musicSearchQueries(term);
    for (const query of queries) {
      const q = encodeURIComponent(query || "music");
      const url = "https://itunes.apple.com/search?media=music&entity=album&limit=1&term=" + q;
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const payload = await res.json();
        const item = (payload.results || [])[0];
        if (item && item.artworkUrl100) {
          return item.artworkUrl100.replace("100x100bb", "300x300bb");
        }
      } catch (_e) {
        // Try the next cleaner query before falling back.
      }
    }
    return null;
  }

  function compactRecommendationItems(items, limit) {
    const source = Array.isArray(items) ? items : [];
    return source
      .map(function (item) { return String(item || "").trim(); })
      .filter(function (item) { return !!item; })
      .slice(0, limit || MAX_RECOMMENDATION_ITEMS);
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
      "<circle cx='305' cy='302' r='170' fill='rgba(255,255,255,0.2)'/>" +
      "<path d='" + accentPath + "' fill='rgba(255,255,255,0.55)'/>" +
      "</svg>"
    );
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  }

  function foodImageSource(term) {
    const label = String(term || "").trim() || t("foodTitle");
    const normalized = label.toLowerCase();
    const matched = FOOD_IMAGE_SOURCES.find(function (source) {
      return source.keys.some(function (key) {
        return normalized.includes(String(key).toLowerCase());
      });
    });
    const fallback = mediaFallbackUrl(label, "food");
    const source = matched
      ? matched.url
      : DEFAULT_FOOD_IMAGES[hashString(label) % DEFAULT_FOOD_IMAGES.length];
    return { source: source, fallback: fallback };
  }

  async function buildMediaCards(items, kind) {
    const validItems = compactRecommendationItems(items, MAX_MEDIA_CARDS);
    if (!validItems.length) return "<p class='media-empty'>" + t("noMedia") + "</p>";

    if (kind === "music") {
      const covers = await Promise.all(validItems.map(fetchMusicCover));
      return validItems.map(function (name, idx) {
        const fallback = mediaFallbackUrl(name, "music");
        const src = covers[idx] || fallback;
        const label = mediaCardLabel(name, "music");
        return (
          "<div class='media-card'>" +
          "<img loading='lazy' src=\"" + escapeHtml(src) + "\" data-fallback=\"" + escapeHtml(fallback) + "\" alt='音乐专辑封面'>" +
          "<p>" + escapeHtml(label) + "</p>" +
          "</div>"
        );
      }).join("");
    }

    return validItems.map(function (name) {
      const image = foodImageSource(name);
      const label = mediaCardLabel(name, "food");
      return (
        "<div class='media-card'>" +
        "<img loading='lazy' src=\"" + escapeHtml(image.source) + "\" data-fallback=\"" + escapeHtml(image.fallback) + "\" alt=\"" + escapeHtml(label) + " 图片\">" +
        "<p>" + escapeHtml(label) + "</p>" +
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
    const music = compactRecommendationItems(data.music_suggestions);
    const food = compactRecommendationItems(data.food_suggestions);
    const tone = trendTone(score);
    const weather = moodWeatherForScore(score);
    const gentleTask = makeGentleTask(score, emotion, summary);
    const letter = buildSelfLetter(data, score);
    const taskDone = taskIsDone(gentleTask);

    const adviceHtml = advice.length
      ? advice.map(function (item) { return "<li>" + escapeHtml(item) + "</li>"; }).join("")
      : "<li>" + t("noAdvice") + "</li>";
    const separator = getLanguage() === "en" ? ", " : "、";
    const musicText = music.length ? music.map(escapeHtml).join(separator) : t("noneText");
    const foodText = food.length ? food.map(escapeHtml).join(separator) : t("noneText");
    const musicCards = await buildMediaCards(music, "music");
    const foodCards = await buildMediaCards(food, "food");

    return (
      "<div class='analysis-result-card' style='--analysis-color:" + tone.point + ";--analysis-soft:" + tone.soft + "'>" +
      "<div class='analysis-toolbar'>" +
      "<div class='analysis-header'>" +
      "<span class='emotion-chip'>" + escapeHtml(emotion) + "</span>" +
      "<span class='score-chip'>" + t("emotionScore") + " " + formatScore(score) + "/100</span>" +
      "</div>" +
      "<button type='button' class='ghost-button' data-clear-analysis>" + t("endAnalysis") + "</button>" +
      "</div>" +
      "<div class='score-meter' aria-hidden='true'><span style='width:" + formatScore(score) + "%'></span></div>" +
      "<div class='mood-mini-weather " + weather.className + "'>" +
      "<span class='weather-mark'>" + weather.mark + "</span>" +
      "<div><strong>" + t("todayMoodWeather") + weather.name + "</strong><p>" + weather.detail + "</p></div>" +
      "</div>" +
      "<div class='analysis-block analysis-summary'><h4>" + t("summaryTitle") + "</h4><p>" + escapeHtml(summary) + "</p></div>" +
      "<div class='gentle-task-card'>" +
      "<label>" +
      "<input type='checkbox' data-gentle-task=\"" + escapeHtml(gentleTask) + "\"" + (taskDone ? " checked" : "") + ">" +
      "<span><strong>" + t("gentleTaskTitle") + "</strong>" + escapeHtml(gentleTask) + "</span>" +
      "</label>" +
      "</div>" +
      "<div class='self-letter-card'>" +
      "<h4>" + t("selfLetterTitle") + "</h4>" +
      "<p>" + escapeHtml(letter) + "</p>" +
      "</div>" +
      "<div class='analysis-block'><h4>" + t("adviceTitle") + "</h4><ul>" + adviceHtml + "</ul></div>" +
      "<div class='analysis-grid'>" +
      "<div><h4>" + t("musicTitle") + "</h4><p>" + musicText + "</p></div>" +
      "<div><h4>" + t("foodTitle") + "</h4><p>" + foodText + "</p></div>" +
      "</div>" +
      "<div class='analysis-media'>" +
      "<section class='media-section'>" +
      "<h4>" + t("musicCoverTitle") + "</h4>" +
      "<div class='media-grid'>" + musicCards + "</div>" +
      "</section>" +
      "<section class='media-section'>" +
      "<h4>" + t("foodImageTitle") + "</h4>" +
      "<div class='media-grid'>" + foodCards + "</div>" +
      "</section>" +
      "</div>" +
      "</div>"
    );
  }

  function petStatusText(pet) {
    if (pet.checked_in_today) return t("petReady");
    if (Number(pet.streak_days) > 0) return t("petWaiting");
    return t("petSleepy");
  }

  function renderPet(pet) {
    if (!petCard) return;
    cachedPetState = pet;
    const points = Number(pet.points) || 0;
    const streak = Number(pet.streak_days) || 0;
    const level = Number(pet.level) || 1;
    const nextLevel = pet.next_level_points;
    const progress = nextLevel
      ? Math.max(8, Math.min(100, Math.round((points / Number(nextLevel)) * 100)))
      : 100;
    const mood = pet.mood || "waiting";
    const nextText = nextLevel
      ? t("petNextLevel") + Math.max(0, Number(nextLevel) - points)
      : t("petMaxLevel");
    petCard.className = "pet-card pet-mood-" + mood + (pet.checked_in_today ? " is-fed" : "");
    petCard.innerHTML = (
      "<div class='pet-avatar' aria-hidden='true'>" +
      "<span class='pet-ear pet-ear-left'></span>" +
      "<span class='pet-ear pet-ear-right'></span>" +
      "<span class='pet-spark'></span>" +
      "<span class='pet-face'>" +
      "<i class='pet-eye pet-eye-left'></i>" +
      "<i class='pet-eye pet-eye-right'></i>" +
      "<i class='pet-mouth'></i>" +
      "</span>" +
      "</div>" +
      "<div class='pet-copy'>" +
      "<div class='pet-title-row'>" +
      "<div><p class='section-kicker'>" + t("petKicker") + "</p>" +
      "<h2>" + t("petTitle") + "</h2></div>" +
      "<span class='pet-badge'>Lv." + level + "</span>" +
      "</div>" +
      "<p class='pet-status'>" + escapeHtml(petStatusText(pet)) + "</p>" +
      "<div class='pet-stats'>" +
      "<span><strong>" + points + "</strong><em>" + t("petPoints") + "</em></span>" +
      "<span><strong>" + streak + "</strong><em>" + t("petDays") + " " + t("petStreak") + "</em></span>" +
      "<span><strong>" + level + "</strong><em>" + t("petLevel") + "</em></span>" +
      "</div>" +
      "<div class='pet-progress' aria-hidden='true'><span style='width:" + progress + "%'></span></div>" +
      "<p class='pet-next'>" + escapeHtml(nextText) + "</p>" +
      "</div>"
    );
  }

  async function loadPet() {
    if (!petCard) return;
    petCard.className = "pet-card pet-loading";
    petCard.innerHTML = "<div class='pet-loading-copy'>" + t("petLoading") + "</div>";
    try {
      const res = await fetch("/api/pet");
      if (!res.ok) throw new Error("Pet request failed");
      const pet = await res.json();
      renderPet(pet);
    } catch (_e) {
      petCard.classList.add("hidden");
    }
  }

  initInterfaceLanguage();

  if (hasAnalyzePage) {
    initProfile();
    loadPet();
    restoreActiveAnalysis();
    renderOfflineDrafts();
    initVoiceDiary();
    updateDraftCount();
    diary.addEventListener("input", updateDraftCount);
    resultEl.addEventListener("click", function (event) {
      const clearButton = event.target.closest("[data-clear-analysis]");
      if (clearButton) clearActiveAnalysis();
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
    if (ritualActions) {
      ritualActions.addEventListener("click", function (event) {
        const ritualButton = event.target.closest("[data-ritual]");
        if (!ritualButton) return;
        const status = document.getElementById("ritual-status");
        if (status) {
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
    analyzeBtn.addEventListener("click", async function () {
    const content = (diary.value || "").trim();
    if (!content) {
      showError(t("writeContentFirst"));
      return;
    }
    if (!navigator.onLine) {
      saveOfflineDraft(content);
      showError(t("offlineDraftSaved"));
      return;
    }
    analyzeBtn.disabled = true;
    analyzeBtn.classList.add("is-loading");
    errorEl.classList.add("hidden");
    resultEl.classList.remove("hidden");
    resultEl.innerHTML = "<div class='analysis-loading'>" + t("analyzing") + "</div>";

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
        showError(data.error || t("analysisFailed"));
        return;
      }
      const cardHtml = await renderResultCard(data);
      showResult(cardHtml, true);
      renderRituals(data);
      if (data.pet) renderPet(data.pet);
      diary.value = "";
      updateDraftCount();
    } catch (e) {
      saveOfflineDraft(content);
      showError(t("networkDraftSaved") + e.message);
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
        { labelKey: "inhale", guideKey: "inhaleGuide", className: "inhale" },
        { labelKey: "hold", guideKey: "holdGuide", className: "hold" },
        { labelKey: "exhale", guideKey: "exhaleGuide", className: "exhale" },
      ];
      function renderBreathStep() {
        const current = steps[step % steps.length];
        breathOrb.textContent = t(current.labelKey);
        breathOrb.className = "breath-orb " + current.className;
        breathLabel.textContent = t(current.guideKey);
        step += 1;
      }
      breathToggle.addEventListener("click", function () {
        if (timer) {
          clearInterval(timer);
          timer = null;
          breathToggle.textContent = t("start");
          breathOrb.className = "breath-orb";
          breathOrb.textContent = t("inhale");
          breathLabel.textContent = t("breathGuide");
          return;
        }
        step = 0;
        renderBreathStep();
        timer = setInterval(renderBreathStep, 4200);
        breathToggle.textContent = t("pause");
      });
    }
    if (copySupportBtn && supportMessage) {
      copySupportBtn.addEventListener("click", async function () {
        try {
          await navigator.clipboard.writeText(supportMessage.value || "");
          if (copyStatus) copyStatus.textContent = t("copySuccess");
        } catch (_e) {
          supportMessage.select();
          if (copyStatus) copyStatus.textContent = t("copyManual");
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
