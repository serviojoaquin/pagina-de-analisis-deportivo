(function () {
  const HISTORY_KEY = "responsible-sports-analytics-history";
  const provider = new window.SportsDataProviders.HybridSportsDataProvider(window.SPORTS_BETTING_MOCK_DATA);

  const state = {
    sports: [],
    selectedSport: null,
    currentAnalysis: null,
    expandedMarket: null
  };

  const els = {};

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    cacheElements();
    bindEvents();
    state.sports = await provider.listSports();
    renderSports();
    await selectSport(state.sports[0].id);
    renderHistory();
    clearAnalysisView("Elegí un partido real de la lista para analizar.");
  }

  function cacheElements() {
    [
      "sportSelect",
      "matchSelect",
      "matchSelectLabel",
      "homeInput",
      "awayInput",
      "participantList",
      "searchForm",
      "statusMessage",
      "analysisShell",
      "emptyAnalysis",
      "matchTitle",
      "matchSubtitle",
      "sourceBadge",
      "summaryGrid",
      "teamBreakdown",
      "marketsTableBody",
      "notEvaluated",
      "finalRecommendation",
      "saveAnalysisButton",
      "historyList",
      "clearHistoryButton",
      "demoButtons",
      "sportVisual",
      "responsibleText"
    ].forEach((id) => {
      els[id] = document.getElementById(id);
    });
  }

  function bindEvents() {
    els.searchForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      await analyzeCurrentForm();
    });

    els.homeInput.addEventListener("input", debounce(async () => {
      await refreshParticipantSuggestions(els.homeInput.value);
    }, 350));

    els.awayInput.addEventListener("input", debounce(async () => {
      await refreshParticipantSuggestions(els.awayInput.value);
    }, 350));

    els.sportSelect.addEventListener("change", async (event) => {
      await selectSport(event.target.value);
    });

    els.matchSelect.addEventListener("change", () => {
      const selectedOption = els.matchSelect.selectedOptions[0];
      if (!selectedOption || !selectedOption.dataset.home) return;
      els.homeInput.value = selectedOption.dataset.home;
      els.awayInput.value = selectedOption.dataset.away;
      clearAnalysisView("Partido seleccionado. Tocá Analizar mercado.");
    });

    els.saveAnalysisButton.addEventListener("click", saveCurrentAnalysis);
    els.clearHistoryButton.addEventListener("click", clearHistory);

    els.demoButtons.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-demo]");
      if (!button) return;
      const [sportId, homeId, awayId] = button.dataset.demo.split("|");
      await selectSport(sportId, homeId, awayId);
      if (sportId === "football") {
        selectFootballMatchByTeams(homeId, awayId);
      }
      await analyzeCurrentForm();
    });

    els.marketsTableBody.addEventListener("click", (event) => {
      const button = event.target.closest("[data-market-key]");
      if (!button) return;
      const key = button.dataset.marketKey;
      state.expandedMarket = state.expandedMarket === key ? null : key;
      renderMarkets(state.currentAnalysis);
    });

    els.historyList.addEventListener("click", async (event) => {
      const loadButton = event.target.closest("[data-load-history]");
      const deleteButton = event.target.closest("[data-delete-history]");

      if (loadButton) {
        const item = readHistory().find((historyItem) => historyItem.id === loadButton.dataset.loadHistory);
        if (!item) return;
        await selectSport(item.request.sportId, item.request.homeId, item.request.awayId);
        await analyzeCurrentForm(false);
      }

      if (deleteButton) {
        const nextHistory = readHistory().filter((historyItem) => historyItem.id !== deleteButton.dataset.deleteHistory);
        writeHistory(nextHistory);
        renderHistory();
      }
    });
  }

  function renderSports() {
    els.sportSelect.innerHTML = state.sports
      .map((sport) => `<option value="${escapeHtml(sport.id)}">${escapeHtml(sport.name)}</option>`)
      .join("");
  }

  async function selectSport(sportId, preferredHomeId, preferredAwayId) {
    els.sportSelect.value = sportId;
    state.selectedSport = await provider.getSport(sportId);
    renderParticipantList(state.selectedSport.participants);
    await renderMatchSelector(sportId);
    const isFootball = sportId === "football";
    els.homeInput.readOnly = isFootball;
    els.awayInput.readOnly = isFootball;

    const participants = state.selectedSport.participants;
    const home = participants.find((item) => item.id === preferredHomeId || item.name === preferredHomeId);
    const away = participants.find((item) => item.id === preferredAwayId || item.name === preferredAwayId);

    els.homeInput.value = home ? home.name : preferredHomeId || participants[0]?.name || "";
    els.awayInput.value = away ? away.name : preferredAwayId || participants.find((item) => item.name !== els.homeInput.value)?.name || "";
    document.body.dataset.sport = sportId;
  }

  async function renderMatchSelector(sportId) {
    const isFootball = sportId === "football";
    els.matchSelectLabel.hidden = !isFootball;

    if (!isFootball) {
      els.matchSelect.innerHTML = "";
      return;
    }

    els.matchSelect.innerHTML = `<option value="">Cargando partidos reales...</option>`;
    try {
      const matches = await provider.listFootballMatches();
      if (!matches.length) {
        els.matchSelect.innerHTML = `<option value="">No hay partidos reales disponibles ahora</option>`;
        return;
      }

      els.matchSelect.innerHTML = `<option value="">Elegir partido real</option>` + matches.map((match) => {
        return `<option value="${escapeHtml(match.id)}" data-home="${escapeHtml(match.home)}" data-away="${escapeHtml(match.away)}">${escapeHtml(match.name)} - ${escapeHtml(formatFullDate(match.date))}</option>`;
      }).join("");
    } catch (error) {
      els.matchSelect.innerHTML = `<option value="">No se pudieron cargar partidos reales</option>`;
    }
  }

  function selectFootballMatchByTeams(homeName, awayName) {
    const wanted = [normalize(homeName), normalize(awayName)].sort().join("|");
    for (const option of Array.from(els.matchSelect.options)) {
      const teams = [normalize(option.dataset.home), normalize(option.dataset.away)].sort().join("|");
      if (teams === wanted) {
        els.matchSelect.value = option.value;
        return;
      }
    }
  }

  function renderParticipantList(participants) {
    els.participantList.innerHTML = participants
      .map((participant) => `<option value="${escapeHtml(participant.name)}"></option>`)
      .join("");
  }

  async function refreshParticipantSuggestions(query) {
    if (!query || query.trim().length < 3 || !provider.searchParticipants) return;
    const participants = await provider.searchParticipants(els.sportSelect.value, query);
    renderParticipantList(participants);
  }

  async function analyzeCurrentForm(showStatus = true) {
    try {
      clearAnalysisView();
      if (showStatus) setStatus("Consultando datos actuales y analizando historial...", "neutral");
      const matchup = els.sportSelect.value === "football"
        ? await provider.getFootballMatchupByEvent(els.matchSelect.value)
        : await provider.getMatchup(els.sportSelect.value, els.homeInput.value, els.awayInput.value);
      const analysis = window.SportsBettingAnalyzer.analyzeMatchup(matchup);
      state.currentAnalysis = analysis;
      state.expandedMarket = analysis.markets[0] ? analysis.markets[0].key : null;
      renderAnalysis(analysis);
      const isMock = String(matchup.source || "").includes("mock");
      const hasOdds = analysis.odds && analysis.odds.markets && Object.keys(analysis.odds.markets).length > 0;
      const sourceLabel = isMock
        ? "datos demo porque no se encontro el proveedor real"
        : !hasOdds
          ? "datos reales sin cuotas reales"
          : "datos reales y cuotas configuradas";
      setStatus(`Analisis actualizado con ${sourceLabel}.`, "positive");
    } catch (error) {
      state.currentAnalysis = null;
      clearAnalysisView(error.message);
      setStatus(error.message, "negative");
    }
  }

  function clearAnalysisView(message) {
    els.analysisShell.hidden = true;
    els.emptyAnalysis.hidden = false;
    const title = els.emptyAnalysis.querySelector("h2");
    if (title) {
      title.textContent = message || "Buscando un partido real para analizar.";
    }
    els.marketsTableBody.innerHTML = "";
    els.summaryGrid.innerHTML = "";
    els.teamBreakdown.innerHTML = "";
    els.notEvaluated.innerHTML = "";
    els.notEvaluated.hidden = true;
    els.finalRecommendation.innerHTML = "";
    els.finalRecommendation.hidden = true;
  }

  function renderAnalysis(analysis) {
    els.analysisShell.hidden = false;
    els.emptyAnalysis.hidden = true;
    els.matchTitle.textContent = `${analysis.home.name} vs ${analysis.away.name}`;
    const eventLabel = analysis.event ? ` - Partido: ${analysis.event.name} - ${formatFullDate(analysis.event.date)}` : "";
    els.matchSubtitle.textContent = `${analysis.sport.name} - ${analysis.home.league || analysis.away.league} - ${analysis.sport.scoreUnit}${eventLabel}`;
    els.sourceBadge.textContent = `${analysis.odds.book} - ${analysis.odds.updatedAt ? formatDate(analysis.odds.updatedAt) : "sin actualizacion"}`;
    els.responsibleText.textContent = analysis.responsibleMessage;
    renderSportVisual(analysis);
    renderSummary(analysis);
    renderBreakdown(analysis);
    renderMarkets(analysis);
    renderNotEvaluated(analysis);
    renderFinalRecommendation(analysis);
  }

  function renderSportVisual(analysis) {
    const homeWin = Math.round(analysis.probabilities.homeWin * 100);
    const awayWin = Math.round(analysis.probabilities.awayWin * 100);
    const draw = Math.round(analysis.probabilities.draw * 100);
    els.sportVisual.innerHTML = `
      <div class="visual-stage ${escapeHtml(analysis.sport.id)}" aria-hidden="true">
        <span class="visual-line visual-line-a"></span>
        <span class="visual-line visual-line-b"></span>
        <span class="visual-dot visual-dot-home"></span>
        <span class="visual-dot visual-dot-away"></span>
        <div class="probability-ribbon">
          <span style="--share:${homeWin}%">${homeWin}%</span>
          ${analysis.sport.drawsAllowed ? `<span style="--share:${draw}%">${draw}%</span>` : ""}
          <span style="--share:${awayWin}%">${awayWin}%</span>
        </div>
      </div>
    `;
  }

  function renderSummary(analysis) {
    const bestMarket = analysis.markets[0];
    els.summaryGrid.innerHTML = `
      ${metricCard("Marcador estimado", `${formatNumber(analysis.expected.home)} - ${formatNumber(analysis.expected.away)}`, `Total: ${formatNumber(analysis.expected.total)} ${analysis.sport.scoreUnit}`)}
      ${metricCard("Rating local", Math.round(analysis.summaries.home.rating), `${analysis.summaries.home.record.wins}G ${analysis.summaries.home.record.draws}E ${analysis.summaries.home.record.losses}P`)}
      ${metricCard("Rating visitante", Math.round(analysis.summaries.away.rating), `${analysis.summaries.away.record.wins}G ${analysis.summaries.away.record.draws}E ${analysis.summaries.away.record.losses}P`)}
      ${metricCard("Mejor senal", bestMarket ? bestMarket.recommendation : "Sin dato", bestMarket ? bestMarket.label : "Sin mercado")}
    `;
  }

  function metricCard(label, value, hint) {
    return `
      <article class="metric-card">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(String(value))}</strong>
        <small>${escapeHtml(hint)}</small>
      </article>
    `;
  }

  function renderBreakdown(analysis) {
    els.teamBreakdown.innerHTML = `
      ${teamPanel(analysis.home.name, analysis.summaries.home)}
      ${teamPanel(analysis.away.name, analysis.summaries.away)}
    `;
  }

  function teamPanel(name, summary) {
    return `
      <article class="team-panel">
        <div class="team-panel-header">
          <div>
            <span class="eyebrow">${summary.side === "home" ? "Local" : "Visitante"}</span>
            <h3>${escapeHtml(name)}</h3>
          </div>
          <strong>${Math.round(summary.rating)}</strong>
        </div>
        <div class="component-list">
          ${summary.components.map(componentBar).join("")}
        </div>
      </article>
    `;
  }

  function componentBar(item) {
    return `
      <div class="component-row">
        <div class="component-copy">
          <span>${escapeHtml(item.label)} <em>${escapeHtml(item.weightLabel)}</em></span>
          <small>${escapeHtml(item.detail)}</small>
        </div>
        <div class="component-score">
          <b>${Math.round(item.score)}</b>
          <span class="bar"><i style="width:${Math.round(item.score)}%"></i></span>
        </div>
      </div>
    `;
  }

  function renderMarkets(analysis) {
    if (!analysis) return;
    els.marketsTableBody.innerHTML = analysis.markets.map(marketRows).join("");
  }

  function marketRows(market) {
    const isOpen = state.expandedMarket === market.key;
    const recommendationClass = market.recommendation.toLowerCase().replaceAll(" ", "-");
    return `
      <tr>
        <td>
          <button class="market-toggle" type="button" data-market-key="${escapeHtml(market.key)}" aria-expanded="${isOpen}">
            <span>${isOpen ? "-" : "+"}</span>
            ${escapeHtml(market.label)}
          </button>
          <small>${escapeHtml(market.family)}</small>
        </td>
        <td>${formatPercent(market.probability)}</td>
        <td>${market.odds ? market.odds.toFixed(2) : "S/C"}</td>
        <td>${market.impliedProbability === null ? "S/C" : formatPercent(market.impliedProbability)}</td>
        <td class="${market.valueDiff !== null && market.valueDiff > 0 ? "positive" : "negative"}">${market.valueDiff === null ? "S/C" : formatSignedPercent(market.valueDiff)}</td>
        <td>
          <span class="confidence">
            <i style="width:${Math.round(market.confidence)}%"></i>
            <b>${Math.round(market.confidence)}</b>
          </span>
        </td>
        <td><span class="tag ${recommendationClass}">${escapeHtml(market.recommendation)}</span></td>
      </tr>
      <tr class="calculation-row ${isOpen ? "" : "is-hidden"}">
        <td colspan="7">
          <div class="calculation-box">
            <div>
              <strong>Calculo transparente</strong>
              <p>${escapeHtml(market.formula.probability)}</p>
              <p>${escapeHtml(market.formula.implied)}</p>
              <p>${escapeHtml(market.formula.value)}</p>
              <p>${escapeHtml(market.formula.confidence)}</p>
            </div>
            <ul>
              ${market.evidence.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
            </ul>
          </div>
        </td>
      </tr>
    `;
  }

  function renderNotEvaluated(analysis) {
    if (!analysis.notEvaluated.length) {
      els.notEvaluated.innerHTML = "";
      els.notEvaluated.hidden = true;
      return;
    }
    els.notEvaluated.hidden = false;
    els.notEvaluated.innerHTML = analysis.notEvaluated.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  }

  function renderFinalRecommendation(analysis) {
    const decision = buildFinalDecision(analysis);
    els.finalRecommendation.hidden = false;
    els.finalRecommendation.innerHTML = `
      <div class="section-heading compact">
        <span class="eyebrow">Resumen final</span>
        <h2>${escapeHtml(decision.title)}</h2>
      </div>
      <div class="recommendation-grid">
        <div>
          <strong>${escapeHtml(decision.marketLabel)}</strong>
          <p>${escapeHtml(decision.mainText)}</p>
        </div>
        <div class="recommendation-metrics">
          <span>Prob. estimada <b>${decision.market ? formatPercent(decision.market.probability) : "S/C"}</b></span>
          <span>Cuota <b>${decision.market && decision.market.odds ? decision.market.odds.toFixed(2) : "S/C"}</b></span>
          <span>Valor <b>${decision.market && decision.market.valueDiff !== null ? formatSignedPercent(decision.market.valueDiff) : "S/C"}</b></span>
          <span>Indice <b>${decision.market ? Math.round(decision.market.confidence) : 0}/100</b></span>
        </div>
      </div>
      <ul>
        ${decision.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}
      </ul>
      <p class="final-warning">${escapeHtml(decision.warning)}</p>
    `;
  }

  function buildFinalDecision(analysis) {
    const valueMarket = analysis.markets.find((market) => market.recommendation === "Posible value bet");
    const interestingMarket = analysis.markets.find((market) => market.recommendation === "Interesante");
    const market = valueMarket || interestingMarket || analysis.markets[0];
    const shouldAvoid = !market || (market.recommendation !== "Posible value bet" && market.recommendation !== "Interesante");

    if (shouldAvoid) {
      return {
        title: "No hay una apuesta clara para tomar",
        marketLabel: market ? `Mercado mas fuerte: ${market.label}` : "Sin mercado evaluable",
        mainText: market
          ? `La mejor senal disponible queda como "${market.recommendation}", por eso el resumen no marca una apuesta conveniente.`
          : "No hay suficientes datos para destacar un mercado.",
        market,
        reasons: market
          ? [
              `El indice de confianza es ${Math.round(market.confidence)}/100.`,
              market.valueDiff === null
                ? "No hay cuota suficiente para comparar probabilidad estimada contra probabilidad implicita."
                : `La diferencia de valor es ${formatSignedPercent(market.valueDiff)}.`,
              "Cuando no aparece valor estadistico claro, la decision responsable es evitar o esperar mejor informacion."
            ]
          : ["No se pudo calcular un mercado principal con datos suficientes."],
        warning: "Este resumen es estadistico y no garantiza resultados. No recomienda montos ni recuperar perdidas."
      };
    }

    return {
      title: "Mercado a considerar",
      marketLabel: market.label,
      mainText: `Si decidis apostar, este es el mercado con mejor combinacion de probabilidad estimada, cuota e indice de confianza.`,
      market,
      reasons: [
        `Recomendacion del modelo: ${market.recommendation}.`,
        market.odds
          ? `La cuota ${market.odds.toFixed(2)} implica ${formatPercent(market.impliedProbability)}, contra ${formatPercent(market.probability)} estimado por el analisis.`
          : "No hay cuota disponible, por eso el resumen se apoya solo en la senal estadistica.",
        market.valueDiff !== null
          ? `La diferencia de valor es ${formatSignedPercent(market.valueDiff)}.`
          : "Sin diferencia de valor calculable por falta de cuota.",
        market.evidence[0] || "El mercado queda arriba por la comparacion ponderada de forma, localia, ataque, defensa, historial y bajas."
      ],
      warning: "Tomalo como apoyo estadistico, no como prediccion segura. Aposta con responsabilidad."
    };
  }

  function saveCurrentAnalysis() {
    if (!state.currentAnalysis) {
      setStatus("Primero genera un analisis.", "negative");
      return;
    }

    const analysis = state.currentAnalysis;
    const best = analysis.markets.find((market) => market.recommendation === "Posible value bet") || analysis.markets[0];
    const item = {
      id: analysis.id,
      createdAt: analysis.createdAt,
      request: {
        sportId: analysis.sport.id,
        homeId: analysis.home.id,
        awayId: analysis.away.id
      },
      title: `${analysis.home.name} vs ${analysis.away.name}`,
      sportName: analysis.sport.name,
      topMarket: best ? best.label : "Sin mercado",
      recommendation: best ? best.recommendation : "Sin dato",
      confidence: best ? Math.round(best.confidence) : 0
    };

    const history = readHistory().filter((historyItem) => historyItem.id !== item.id);
    history.unshift(item);
    writeHistory(history.slice(0, 12));
    renderHistory();
    setStatus("Analisis guardado en historial.", "positive");
  }

  function renderHistory() {
    const history = readHistory();
    els.clearHistoryButton.disabled = !history.length;

    if (!history.length) {
      els.historyList.innerHTML = `<p class="empty-text">Todavia no hay analisis guardados.</p>`;
      return;
    }

    els.historyList.innerHTML = history
      .map(
        (item) => `
          <article class="history-item">
            <div>
              <span class="eyebrow">${escapeHtml(item.sportName)} - ${formatDate(item.createdAt)}</span>
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.topMarket)} - ${escapeHtml(item.recommendation)} - indice ${item.confidence}</p>
            </div>
            <div class="history-actions">
              <button class="icon-button" type="button" data-load-history="${escapeHtml(item.id)}" aria-label="Cargar analisis">Abrir</button>
              <button class="icon-button danger" type="button" data-delete-history="${escapeHtml(item.id)}" aria-label="Eliminar">X</button>
            </div>
          </article>
        `
      )
      .join("");
  }

  function clearHistory() {
    writeHistory([]);
    renderHistory();
    setStatus("Historial vaciado.", "neutral");
  }

  function readHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    } catch (error) {
      return [];
    }
  }

  function writeHistory(history) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }

  function setStatus(message, type) {
    els.statusMessage.textContent = message;
    els.statusMessage.dataset.type = type;
  }

  function formatDate(value) {
    if (!value) return "";
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  }

  function formatFullDate(value) {
    if (!value) return "";
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  }

  function formatPercent(value) {
    return window.SportsBettingAnalyzer.formatPercent(value);
  }

  function formatSignedPercent(value) {
    return window.SportsBettingAnalyzer.formatSignedPercent(value);
  }

  function formatNumber(value) {
    return window.SportsBettingAnalyzer.formatNumber(value);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalize(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function debounce(callback, delay) {
    let timeoutId;
    return (...args) => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => callback(...args), delay);
    };
  }
})();
