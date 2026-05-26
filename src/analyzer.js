(function () {
  const WEIGHTS = {
    form: 0.3,
    venue: 0.2,
    offense: 0.2,
    defense: 0.15,
    h2h: 0.1,
    availability: 0.05
  };

  const WEIGHT_LABELS = {
    form: "Forma reciente",
    venue: "Localia / visita",
    offense: "Promedio ofensivo",
    defense: "Defensa recibida",
    h2h: "Historial entre ambos",
    availability: "Lesiones o bajas"
  };

  function analyzeMatchup(matchup) {
    const homeSummary = summarizeParticipant(matchup.sport, matchup.home, matchup.away, "home", matchup.headToHead);
    const awaySummary = summarizeParticipant(matchup.sport, matchup.away, matchup.home, "away", matchup.headToHead);
    const expected = estimateExpectedScore(matchup.sport, homeSummary, awaySummary);
    const probabilities = applyExternalProbabilities(
      estimateCoreProbabilities(matchup.sport, homeSummary, awaySummary, expected),
      matchup.modelProbabilities
    );
    const markets = buildMarkets(matchup, homeSummary, awaySummary, expected, probabilities);
    const notEvaluated = buildNotEvaluated(matchup, homeSummary, awaySummary);

    return {
      id: window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      createdAt: new Date().toISOString(),
      sport: matchup.sport,
      home: matchup.home,
      away: matchup.away,
      odds: matchup.odds,
      headToHead: matchup.headToHead,
      summaries: {
        home: homeSummary,
        away: awaySummary
      },
      expected,
      probabilities,
      markets,
      notEvaluated,
      responsibleMessage: "Este sistema usa datos históricos y probabilidades. No garantiza resultados. Apostá con responsabilidad."
    };
  }

  function applyExternalProbabilities(baseProbabilities, modelProbabilities) {
    if (!modelProbabilities) return baseProbabilities;
    const next = { ...baseProbabilities };
    ["homeWin", "draw", "awayWin"].forEach((key) => {
      if (Number.isFinite(modelProbabilities[key])) {
        next[key] = modelProbabilities[key];
      }
    });
    next.doubleChanceHomeDraw = next.homeWin + next.draw;
    next.doubleChanceAwayDraw = next.awayWin + next.draw;
    return next;
  }

  function summarizeParticipant(sport, participant, opponent, side, headToHead) {
    const recentMatches = participant.recentMatches.slice(0, 10);
    const venue = side === "home" ? "home" : side === "away" ? "away" : "neutral";
    const venueMatches = recentMatches.filter((match) => match.venue === venue);
    const relevantVenueMatches = venueMatches.length ? venueMatches : recentMatches;
    const avgFor = average(recentMatches.map((match) => match.for));
    const avgAgainst = average(recentMatches.map((match) => match.against));
    const formScore = average(recentMatches.map((match) => resultScore(match))) * 100;
    const venueScore = average(relevantVenueMatches.map((match) => resultScore(match))) * 100;
    const offenseScore = normalizeHigh(avgFor, sport.baseline.offenseLow, sport.baseline.offenseHigh);
    const defenseScore = normalizeLow(avgAgainst, sport.baseline.defenseLow, sport.baseline.defenseHigh);
    const availabilityImpact = sum(participant.absences.map((absence) => absence.impact));
    const availabilityScore = clamp(100 - availabilityImpact, 35, 100);
    const h2hScore = scoreHeadToHead(participant.id, opponent.id, headToHead);
    const record = buildRecord(recentMatches);
    const streak = buildStreak(recentMatches);

    const components = [
      component("form", formScore, `${record.wins}G ${record.draws}E ${record.losses}P en los ultimos ${recentMatches.length}.`),
      component("venue", venueScore, venueDetail(side, relevantVenueMatches.length, recentMatches.length)),
      component("offense", offenseScore, `Promedio a favor: ${formatNumber(avgFor)} ${sport.scoreUnit}.`),
      component("defense", defenseScore, `Promedio en contra: ${formatNumber(avgAgainst)} ${sport.scoreUnit}.`),
      component("h2h", h2hScore, headToHead.length ? `${headToHead.length} cruces directos cargados.` : "Sin historial directo, se usa valor neutral."),
      component("availability", availabilityScore, absenceDetail(participant.absences, availabilityImpact))
    ];

    const rating = components.reduce((acc, item) => acc + item.contribution, 0);

    return {
      participant,
      side,
      recentMatches,
      record,
      streak,
      avgFor,
      avgAgainst,
      components,
      rating,
      availabilityImpact,
      dataQuality: dataQuality(recentMatches.length, headToHead.length, participant.absences.length)
    };
  }

  function component(key, rawScore, detail) {
    const score = clamp(rawScore, 0, 100);
    const weight = WEIGHTS[key];
    return {
      key,
      label: WEIGHT_LABELS[key],
      weight,
      weightLabel: `${Math.round(weight * 100)}%`,
      score,
      contribution: score * weight,
      detail
    };
  }

  function resultScore(match) {
    if (match.for > match.against) return 1;
    if (match.for === match.against) return 0.5;
    return 0;
  }

  function buildRecord(matches) {
    return matches.reduce(
      (record, match) => {
        if (match.for > match.against) record.wins += 1;
        if (match.for === match.against) record.draws += 1;
        if (match.for < match.against) record.losses += 1;
        return record;
      },
      { wins: 0, draws: 0, losses: 0 }
    );
  }

  function buildStreak(matches) {
    if (!matches.length) return "Sin racha";
    const first = resultLabel(matches[0]);
    let count = 0;
    for (const match of matches) {
      if (resultLabel(match) !== first) break;
      count += 1;
    }
    return `${count} ${first}`;
  }

  function resultLabel(match) {
    if (match.for > match.against) return "victoria";
    if (match.for === match.against) return "empate";
    return "derrota";
  }

  function scoreHeadToHead(participantId, opponentId, headToHead) {
    const matches = headToHead
      .filter((match) => [match.home, match.away].includes(participantId) && [match.home, match.away].includes(opponentId))
      .slice(0, 5);

    if (!matches.length) return 50;

    return average(
      matches.map((match) => {
        const own = match.home === participantId ? match.homeScore : match.awayScore;
        const rival = match.home === participantId ? match.awayScore : match.homeScore;
        if (own > rival) return 1;
        if (own === rival) return 0.5;
        return 0;
      })
    ) * 100;
  }

  function venueDetail(side, usedMatches, totalMatches) {
    if (side === "home") return `${usedMatches} partidos recientes como local.`;
    if (side === "away") return `${usedMatches} partidos recientes como visitante.`;
    return `${usedMatches || totalMatches} partidos recientes en contexto neutral.`;
  }

  function absenceDetail(absences, impact) {
    if (!absences.length) return "Sin bajas relevantes en el mock.";
    const names = absences.map((absence) => `${absence.name} (${absence.status})`).join(", ");
    return `${names}. Impacto agregado: ${impact}.`;
  }

  function estimateExpectedScore(sport, homeSummary, awaySummary) {
    const homeExpected = Math.max(0, homeSummary.avgFor * 0.55 + awaySummary.avgAgainst * 0.45);
    const awayExpected = Math.max(0, awaySummary.avgFor * 0.55 + homeSummary.avgAgainst * 0.45);
    const total = homeExpected + awayExpected;

    return {
      home: homeExpected,
      away: awayExpected,
      total,
      diff: homeExpected - awayExpected,
      line: sport.baseline.totalLine
    };
  }

  function estimateCoreProbabilities(sport, homeSummary, awaySummary, expected) {
    const ratingDiff = homeSummary.rating - awaySummary.rating + sport.baseline.homeAdvantage;
    const baseHome = sigmoid(ratingDiff / 18);
    let draw = 0;

    if (sport.drawsAllowed) {
      const similarity = 1 - clamp(Math.abs(homeSummary.rating - awaySummary.rating) / 55, 0, 1);
      const lowTotalBoost = clamp((sport.baseline.totalLine - expected.total) / sport.baseline.totalLine, -0.25, 0.25);
      draw = clamp(0.16 + similarity * 0.12 + lowTotalBoost * 0.08, 0.12, 0.32);
    }

    const homeWin = baseHome * (1 - draw);
    const awayWin = (1 - baseHome) * (1 - draw);
    const overTotal = sigmoid((expected.total - sport.baseline.totalLine) / sport.baseline.totalScale);
    const bothTeamsScore = clamp(
      0.08 +
        Math.min(expected.home, sport.baseline.offenseHigh) / sport.baseline.offenseHigh * 0.42 +
        Math.min(expected.away, sport.baseline.offenseHigh) / sport.baseline.offenseHigh * 0.42,
      0.16,
      0.76
    );

    return {
      homeWin,
      draw,
      awayWin,
      doubleChanceHomeDraw: homeWin + draw,
      doubleChanceAwayDraw: awayWin + draw,
      overTotal,
      underTotal: 1 - overTotal,
      bothTeamsScore,
      ratingDiff
    };
  }

  function buildMarkets(matchup, homeSummary, awaySummary, expected, probabilities) {
    const { sport, home, away, odds } = matchup;
    const oddsMarkets = odds.markets || {};
    const markets = [
      makeMarket({
        key: "homeWin",
        label: `Ganador: ${home.name}`,
        family: "Ganador del partido",
        probability: probabilities.homeWin,
        odds: oddsMarkets.homeWin,
        signal: homeSummary.rating,
        evidence: winnerEvidence(homeSummary, awaySummary, probabilities.ratingDiff)
      }),
      makeMarket({
        key: "awayWin",
        label: `Ganador: ${away.name}`,
        family: "Ganador del partido",
        probability: probabilities.awayWin,
        odds: oddsMarkets.awayWin,
        signal: awaySummary.rating,
        evidence: winnerEvidence(awaySummary, homeSummary, -probabilities.ratingDiff)
      }),
      makeMarket({
        key: "overTotal",
        label: `Mas de ${sport.baseline.totalLine} ${sport.scoreUnit}`,
        family: "Mas/Menos",
        probability: probabilities.overTotal,
        odds: oddsMarkets.overTotal,
        signal: totalSignal(homeSummary, awaySummary, "over"),
        evidence: [
          `Total esperado: ${formatNumber(expected.total)} vs linea ${sport.baseline.totalLine}.`,
          `${home.name}: ${formatNumber(homeSummary.avgFor)} a favor / ${formatNumber(homeSummary.avgAgainst)} en contra.`,
          `${away.name}: ${formatNumber(awaySummary.avgFor)} a favor / ${formatNumber(awaySummary.avgAgainst)} en contra.`
        ]
      }),
      makeMarket({
        key: "underTotal",
        label: `Menos de ${sport.baseline.totalLine} ${sport.scoreUnit}`,
        family: "Mas/Menos",
        probability: probabilities.underTotal,
        odds: oddsMarkets.underTotal,
        signal: totalSignal(homeSummary, awaySummary, "under"),
        evidence: [
          `Total esperado: ${formatNumber(expected.total)} vs linea ${sport.baseline.totalLine}.`,
          "El modelo favorece este lado cuando la proyeccion queda por debajo de la linea."
        ]
      })
    ];

    if (sport.drawsAllowed) {
      markets.splice(
        1,
        0,
        makeMarket({
          key: "draw",
          label: "Empate",
          family: "Ganador del partido",
          probability: probabilities.draw,
          odds: oddsMarkets.draw,
          signal: clamp(100 - Math.abs(probabilities.ratingDiff), 0, 100),
          evidence: [
            `Diferencia de rating ajustada: ${formatNumber(probabilities.ratingDiff)} puntos.`,
            "El empate sube cuando los ratings son cercanos y el total esperado es moderado."
          ]
        })
      );

      markets.push(
        makeMarket({
          key: "doubleChanceHomeDraw",
          label: `${home.name} o empate`,
          family: "Doble oportunidad",
          probability: probabilities.doubleChanceHomeDraw,
          odds: oddsMarkets.doubleChanceHomeDraw,
          signal: clamp((homeSummary.rating + probabilities.draw * 100) / 1.6, 0, 100),
          evidence: [
            `Suma de escenarios: ${formatPercent(probabilities.homeWin)} local + ${formatPercent(probabilities.draw)} empate.`,
            `Rating local ponderado: ${formatNumber(homeSummary.rating)}.`
          ]
        }),
        makeMarket({
          key: "doubleChanceAwayDraw",
          label: `${away.name} o empate`,
          family: "Doble oportunidad",
          probability: probabilities.doubleChanceAwayDraw,
          odds: oddsMarkets.doubleChanceAwayDraw,
          signal: clamp((awaySummary.rating + probabilities.draw * 100) / 1.6, 0, 100),
          evidence: [
            `Suma de escenarios: ${formatPercent(probabilities.awayWin)} visitante + ${formatPercent(probabilities.draw)} empate.`,
            `Rating visitante ponderado: ${formatNumber(awaySummary.rating)}.`
          ]
        }),
        makeMarket({
          key: "bothTeamsScoreYes",
          label: "Ambos anotan",
          family: "Ambos equipos anotan",
          probability: probabilities.bothTeamsScore,
          odds: oddsMarkets.bothTeamsScoreYes,
          signal: totalSignal(homeSummary, awaySummary, "over"),
          evidence: [
            `${home.name} esperado: ${formatNumber(expected.home)} ${sport.scoreUnit}.`,
            `${away.name} esperado: ${formatNumber(expected.away)} ${sport.scoreUnit}.`,
            "Se combinan ataque propio y defensa rival reciente."
          ]
        })
      );
    }

    markets.push(
      makeMarket({
        key: "handicapHome",
        label: handicapLabel(sport, home.name),
        family: "Handicap",
        probability: handicapProbability(sport, expected.diff),
        odds: oddsMarkets.handicapHome,
        signal: clamp(50 + expected.diff * handicapSignalScale(sport), 0, 100),
        evidence: [
          `Diferencia esperada: ${formatSignedNumber(expected.diff)} ${sport.scoreUnit}.`,
          `El handicap se calcula contra una linea demo de ${handicapLine(sport)}.`
        ]
      })
    );

    if (!sport.drawsAllowed && oddsMarkets.handicapAway) {
      markets.push(
        makeMarket({
          key: "handicapAway",
          label: handicapAwayLabel(sport, away.name),
          family: "Handicap",
          probability: 1 - handicapProbability(sport, expected.diff),
          odds: oddsMarkets.handicapAway,
          signal: clamp(50 - expected.diff * handicapSignalScale(sport), 0, 100),
          evidence: [
            `Diferencia esperada: ${formatSignedNumber(expected.diff)} ${sport.scoreUnit}.`,
            "Se evalua el lado visitante del handicap demo."
          ]
        })
      );
    }

    if (hasHalfTimeFullTimeData(sport, matchup.headToHead, homeSummary, awaySummary)) {
      const homeHomeProbability = clamp(probabilities.homeWin * firstHalfLeadRate(matchup.home.id, matchup.headToHead, homeSummary), 0.05, 0.48);
      markets.push(
        makeMarket({
          key: "halfTimeFullTimeHomeHome",
          label: `Descanso/final: ${home.name}/${home.name}`,
          family: "Descanso/final",
          probability: homeHomeProbability,
          odds: oddsMarkets.halfTimeFullTimeHomeHome,
          signal: clamp(homeSummary.rating * 0.7 + firstHalfLeadRate(matchup.home.id, matchup.headToHead, homeSummary) * 30, 0, 100),
          evidence: [
            "Se incluye porque hay marcadores al descanso en el mock.",
            `Probabilidad base local: ${formatPercent(probabilities.homeWin)}.`
          ]
        })
      );
    }

    return markets.sort((a, b) => b.confidence - a.confidence);
  }

  function makeMarket({ key, label, family, probability, odds, signal, evidence }) {
    const impliedProbability = odds ? 1 / odds : null;
    const valueDiff = impliedProbability === null ? null : probability - impliedProbability;
    const confidence = marketConfidence(probability, valueDiff, signal, Boolean(odds));

    return {
      key,
      label,
      family,
      probability,
      odds,
      impliedProbability,
      valueDiff,
      confidence,
      recommendation: recommendation(confidence, valueDiff, Boolean(odds)),
      evidence,
      formula: {
        probability: `${formatPercent(probability)} estimado por componentes ponderados y ajuste del mercado.`,
        implied: odds ? `1 / ${odds.toFixed(2)} = ${formatPercent(impliedProbability)}.` : "Sin cuota disponible.",
        value: odds ? `${formatPercent(probability)} - ${formatPercent(impliedProbability)} = ${formatSignedPercent(valueDiff)}.` : "No se calcula diferencia sin cuota.",
        confidence: `Indice ${Math.round(confidence)}/100: senal estadistica ${Math.round(signal)}/100, distancia de probabilidad y margen de valor.`
      }
    };
  }

  function winnerEvidence(primary, secondary, ratingDiff) {
    return [
      `Rating ponderado: ${formatNumber(primary.rating)} vs ${formatNumber(secondary.rating)}.`,
      `Diferencia ajustada del modelo: ${formatSignedNumber(ratingDiff)} puntos.`,
      `Racha reciente: ${primary.streak}.`
    ];
  }

  function totalSignal(homeSummary, awaySummary, mode) {
    const homeOffense = scoreByKey(homeSummary, "offense");
    const awayOffense = scoreByKey(awaySummary, "offense");
    const homeDefense = scoreByKey(homeSummary, "defense");
    const awayDefense = scoreByKey(awaySummary, "defense");
    if (mode === "over") {
      return average([homeOffense, awayOffense, 100 - homeDefense, 100 - awayDefense]);
    }
    return average([100 - homeOffense, 100 - awayOffense, homeDefense, awayDefense]);
  }

  function marketConfidence(probability, valueDiff, signal, hasOdds) {
    const clarity = Math.abs(probability - 0.5) * 200;
    const valueScore = Math.max(valueDiff || 0, 0) * 130;
    return clamp(30 + signal * 0.26 + clarity * 0.28 + valueScore + (hasOdds ? 6 : -8), 0, 100);
  }

  function recommendation(confidence, valueDiff, hasOdds) {
    if (!hasOdds) return "Riesgo alto";
    if (valueDiff <= -0.03 || confidence < 42) return "Evitar";
    if (valueDiff > 0.05 && confidence >= 64) return "Posible value bet";
    if (valueDiff > 0.01 && confidence >= 54) return "Interesante";
    return "Riesgo alto";
  }

  function handicapLine(sport) {
    if (sport.id === "football") return "-0.5";
    if (sport.id === "tennis") return "-1.5 games";
    return "-4.5 puntos";
  }

  function handicapLabel(sport, name) {
    if (sport.id === "football") return `Handicap ${name} -0.5`;
    if (sport.id === "tennis") return `Handicap ${name} -1.5 games`;
    return `Handicap ${name} -4.5`;
  }

  function handicapAwayLabel(sport, name) {
    if (sport.id === "tennis") return `Handicap ${name} +1.5 games`;
    return `Handicap ${name} +4.5`;
  }

  function handicapProbability(sport, expectedDiff) {
    if (sport.id === "football") return sigmoid((expectedDiff - 0.5) / 0.75);
    if (sport.id === "tennis") return sigmoid((expectedDiff - 1.5) / 2.7);
    return sigmoid((expectedDiff - 4.5) / 7.5);
  }

  function handicapSignalScale(sport) {
    if (sport.id === "football") return 20;
    if (sport.id === "tennis") return 7;
    return 2;
  }

  function hasHalfTimeFullTimeData(sport, headToHead, homeSummary, awaySummary) {
    if (!sport.drawsAllowed) return false;
    const h2hWithHalftime = headToHead.filter((match) => typeof match.halftimeHome === "number");
    const recentWithHalftime = homeSummary.recentMatches.concat(awaySummary.recentMatches).filter((match) => typeof match.halftimeFor === "number");
    return h2hWithHalftime.length >= 2 && recentWithHalftime.length >= 8;
  }

  function firstHalfLeadRate(participantId, headToHead, summary) {
    const recentRate = average(
      summary.recentMatches
        .filter((match) => typeof match.halftimeFor === "number")
        .map((match) => (match.halftimeFor > match.halftimeAgainst ? 1 : match.halftimeFor === match.halftimeAgainst ? 0.45 : 0.1))
    );
    const h2hRate = average(
      headToHead
        .filter((match) => typeof match.halftimeHome === "number")
        .map((match) => {
          const own = match.home === participantId ? match.halftimeHome : match.halftimeAway;
          const rival = match.home === participantId ? match.halftimeAway : match.halftimeHome;
          if (own > rival) return 1;
          if (own === rival) return 0.45;
          return 0.1;
        })
    );
    return clamp((recentRate * 0.7 + h2hRate * 0.3) || 0.35, 0.2, 0.8);
  }

  function buildNotEvaluated(matchup) {
    if (matchup.sport.drawsAllowed) return [];
    return ["Descanso/final: no se calcula en este MVP para deportes sin empate o sin datos parciales suficientes."];
  }

  function dataQuality(recentCount, h2hCount, absenceCount) {
    return clamp(recentCount * 7 + Math.min(h2hCount, 5) * 5 + (absenceCount >= 0 ? 10 : 0), 0, 100);
  }

  function scoreByKey(summary, key) {
    return summary.components.find((componentItem) => componentItem.key === key).score;
  }

  function normalizeHigh(value, low, high) {
    return clamp(((value - low) / (high - low)) * 100, 0, 100);
  }

  function normalizeLow(value, low, high) {
    return clamp(((high - value) / (high - low)) * 100, 0, 100);
  }

  function average(values) {
    const valid = values.filter((value) => Number.isFinite(value));
    if (!valid.length) return 0;
    return sum(valid) / valid.length;
  }

  function sum(values) {
    return values.reduce((acc, value) => acc + Number(value || 0), 0);
  }

  function sigmoid(value) {
    return 1 / (1 + Math.exp(-value));
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function formatNumber(value) {
    return Number(value || 0).toFixed(1);
  }

  function formatSignedNumber(value) {
    const rounded = formatNumber(value);
    return value >= 0 ? `+${rounded}` : rounded;
  }

  function formatPercent(value) {
    return `${Math.round(value * 100)}%`;
  }

  function formatSignedPercent(value) {
    const pct = Math.round(value * 100);
    return pct >= 0 ? `+${pct}%` : `${pct}%`;
  }

  window.SportsBettingAnalyzer = {
    analyzeMatchup,
    weights: WEIGHTS,
    formatPercent,
    formatSignedPercent,
    formatNumber
  };
})();
