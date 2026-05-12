(function () {
  const diary = document.getElementById("diary");
  const analyzeBtn = document.getElementById("analyze");
  const resultEl = document.getElementById("analysis-result");
  const errorEl = document.getElementById("analysis-error");
  const historyList = document.getElementById("history-list");
  const keywordsEl = document.getElementById("keywords");
  const trendCanvas = document.getElementById("trend-chart");
  const hasAnalyzePage = !!(diary && analyzeBtn && resultEl && errorEl);
  const hasHistoryPage = !!historyList;
  const hasTrendPage = !!(keywordsEl && trendCanvas);

  function getPersona() {
    return document.getElementById("persona").value;
  }
  function getLanguage() {
    return document.getElementById("language").value;
  }

  function showResult(html) {
    errorEl.classList.add("hidden");
    resultEl.classList.remove("hidden");
    resultEl.innerHTML = html;
  }
  function showError(msg) {
    resultEl.classList.add("hidden");
    errorEl.classList.remove("hidden");
    errorEl.textContent = msg;
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
    const q = encodeURIComponent("food," + (term || "healthy"));
    return "https://source.unsplash.com/600x400/?" + q;
  }

  async function buildMediaCards(items, kind) {
    const validItems = items.filter(function (x) { return !!x; }).slice(0, 4);
    if (!validItems.length) return "<p class='media-empty'>暂无推荐图片。</p>";

    if (kind === "music") {
      const covers = await Promise.all(validItems.map(fetchMusicCover));
      return validItems.map(function (name, idx) {
        const src = covers[idx] || "https://picsum.photos/seed/music-" + encodeURIComponent(name) + "/300/300";
        return (
          "<div class='media-card'>" +
          "<img loading='lazy' src='" + src + "' alt='音乐专辑封面'>" +
          "<p>" + name + "</p>" +
          "</div>"
        );
      }).join("");
    }

    return validItems.map(function (name) {
      const src = foodImageUrl(name);
      return (
        "<div class='media-card'>" +
        "<img loading='lazy' src='" + src + "' alt='食物推荐图片'>" +
        "<p>" + name + "</p>" +
        "</div>"
      );
    }).join("");
  }

  async function renderResultCard(data) {
    const emotion = data.emotion || "未知";
    const score = data.emotion_score ?? 50;
    const summary = data.summary || "暂无总结。";
    const advice = data.advice || [];
    const music = data.music_suggestions || [];
    const food = data.food_suggestions || [];

    const adviceHtml = advice.length
      ? advice.map(function (item) { return "<li>" + item + "</li>"; }).join("")
      : "<li>暂未生成建议</li>";
    const musicText = music.length ? music.join("、") : "暂无";
    const foodText = food.length ? food.join("、") : "暂无";
    const musicCards = await buildMediaCards(music, "music");
    const foodCards = await buildMediaCards(food, "food");

    return (
      "<div class='analysis-header'>" +
      "<span class='emotion-chip'>" + emotion + "</span>" +
      "<span class='score-chip'>情绪分数 " + score + "/100</span>" +
      "</div>" +
      "<div class='analysis-block'><h4>总结</h4><p>" + summary + "</p></div>" +
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
      "</div>"
    );
  }

  if (hasAnalyzePage) analyzeBtn.addEventListener("click", async function () {
    const content = (diary.value || "").trim();
    if (!content) {
      showError("请先写一点内容再分析。");
      return;
    }
    analyzeBtn.disabled = true;
    errorEl.classList.add("hidden");
    resultEl.classList.remove("hidden");
    resultEl.textContent = "分析中，请稍候...";

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
      showResult(cardHtml);
      diary.value = "";
    } catch (e) {
      showError("网络异常：" + e.message);
    } finally {
      analyzeBtn.disabled = false;
    }
  });

  async function loadHistory() {
    try {
      const res = await fetch("/api/entries");
      const entries = await res.json();
      historyList.innerHTML = entries.length === 0
        ? "<p class='history-item'>还没有历史记录，先写一篇日记吧。</p>"
        : entries.map(function (e) {
            return (
              "<div class='history-item'>" +
              "<span class='date'>" + e.date + "</span> | " +
              "情绪：" + e.emotion + "（" + e.emotion_score + "）<br>" +
              "<span class='summary'>" + (e.summary || e.content_preview) + "</span>" +
              "</div>"
            );
          }).join("");
    } catch (e) {
      historyList.innerHTML = "<p class='history-item'>历史记录加载失败。</p>";
    }
  }

  let trendChart = null;
  async function loadTrend() {
    try {
      const res = await fetch("/api/trend");
      const data = await res.json();
      const labels = data.trend.map(function (x) { return x.date; });
      const scores = data.trend.map(function (x) { return x.score; });
      keywordsEl.textContent = data.keywords.length === 0
        ? "暂无关键词。"
        : data.keywords.map(function (x) { return x.word + " (" + x.count + ")"; }).join(", ");

      if (trendChart) trendChart.destroy();
      trendChart = new Chart(trendCanvas, {
        type: "line",
        data: {
          labels: labels,
          datasets: [{
            label: "情绪分数",
            data: scores,
            borderColor: "#e85a7a",
            backgroundColor: "rgba(232,90,122,0.1)",
            fill: true,
            tension: 0.2,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { min: 0, max: 100 },
          },
        },
      });
    } catch (e) {
      keywordsEl.textContent = "趋势数据加载失败。";
    }
  }

  if (hasHistoryPage) {
    loadHistory();
  }
  if (hasTrendPage) {
    loadTrend();
  }
})();
