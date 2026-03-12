(function () {
  const diary = document.getElementById("diary");
  const analyzeBtn = document.getElementById("analyze");
  const resultEl = document.getElementById("analysis-result");
  const errorEl = document.getElementById("analysis-error");
  const historyList = document.getElementById("history-list");
  const keywordsEl = document.getElementById("keywords");
  const trendCanvas = document.getElementById("trend-chart");

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

  analyzeBtn.addEventListener("click", async function () {
    const content = (diary.value || "").trim();
    if (!content) {
      showError("Please write something first.");
      return;
    }
    analyzeBtn.disabled = true;
    errorEl.classList.add("hidden");
    resultEl.classList.remove("hidden");
    resultEl.textContent = "Analyzing...";

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
        showError(data.error || "Analysis failed.");
        return;
      }
      const emotion = data.emotion || "unknown";
      const score = data.emotion_score ?? 50;
      const summary = data.summary || "";
      const advice = (data.advice || []).join("\n• ");
      const music = (data.music_suggestions || []).join(", ");
      const food = (data.food_suggestions || []).join(", ");
      let html = `Emotion: ${emotion} (${score} / 100)\n${summary ? "Summary: " + summary + "\n\n" : ""}`;
      if (advice) html += "Advice:\n• " + advice + "\n\n";
      if (music) html += "Music: " + music + "\n";
      if (food) html += "Food: " + food;
      showResult(html);
      diary.value = "";
      loadHistory();
      loadTrend();
    } catch (e) {
      showError("Network error: " + e.message);
    } finally {
      analyzeBtn.disabled = false;
    }
  });

  async function loadHistory() {
    try {
      const res = await fetch("/api/entries");
      const entries = await res.json();
      historyList.innerHTML = entries.length === 0
        ? "<p class='history-item'>No history yet. Write your first diary!</p>"
        : entries.map(function (e) {
            return (
              "<div class='history-item'>" +
              "<span class='date'>" + e.date + "</span> | " +
              "Emotion: " + e.emotion + " (" + e.emotion_score + ")<br>" +
              (e.summary || e.content_preview) +
              "</div>"
            );
          }).join("");
    } catch (e) {
      historyList.innerHTML = "<p class='history-item'>Failed to load history.</p>";
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
        ? "No keywords yet."
        : data.keywords.map(function (x) { return x.word + " (" + x.count + ")"; }).join(", ");

      if (trendChart) trendChart.destroy();
      trendChart = new Chart(trendCanvas, {
        type: "line",
        data: {
          labels: labels,
          datasets: [{
            label: "Emotion score",
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
      keywordsEl.textContent = "Failed to load trends.";
    }
  }

  loadHistory();
  loadTrend();
})();
