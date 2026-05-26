const API_BASE = "https://v3.football.api-sports.io";

export default async function handler(request, response) {
  try {
    const apiKey = process.env.API_FOOTBALL_KEY;
    const fixtureId = String(request.query.fixture || request.query.fixtureId || "");

    if (!apiKey) {
      return response.status(500).json({ error: "Falta configurar API_FOOTBALL_KEY en Vercel." });
    }

    if (!fixtureId) {
      return response.status(400).json({ error: "Falta fixtureId. Elegi un partido real de la lista." });
    }

    const fixtureData = await apiFootball(`/fixtures?id=${encodeURIComponent(fixtureId)}`, apiKey);
    const fixture = fixtureData.response?.[0];
    if (!fixture) {
      return response.status(404).json({ error: "Fixture real no encontrado en API-Football." });
    }

    const [predictionData, oddsData, injuryData] = await Promise.all([
      apiFootball(`/predictions?fixture=${encodeURIComponent(fixtureId)}`, apiKey),
      apiFootball(`/odds?fixture=${encodeURIComponent(fixtureId)}`, apiKey).catch(() => ({ response: [] })),
      apiFootball(`/injuries?fixture=${encodeURIComponent(fixtureId)}`, apiKey).catch(() => ({ response: [] }))
    ]);

    const prediction = predictionData.response?.[0];
    if (!prediction) {
      return response.status(404).json({ error: "API-Football no tiene prediccion para este fixture." });
    }

    const homeTeam = prediction.teams.home;
    const awayTeam = prediction.teams.away;
    const odds = normalizeOdds(oddsData.response?.[0]);

    const matchup = {
      sport: {
        id: "football",
        name: "Futbol",
        participantLabel: "Equipo",
        scoreUnit: "goles",
        drawsAllowed: true,
        baseline: {
          offenseLow: 0.5,
          offenseHigh: 2.6,
          defenseLow: 0.45,
          defenseHigh: 2.4,
          totalLine: 2.5,
          totalScale: 0.7,
          homeAdvantage: 3.5
        }
      },
      home: teamToParticipant(homeTeam, "home", injuryData.response || []),
      away: teamToParticipant(awayTeam, "away", injuryData.response || []),
      headToHead: (prediction.h2h || []).map(toHeadToHead),
      odds,
      modelProbabilities: normalizePredictionProbabilities(prediction.predictions?.percent),
      apiFootball: {
        fixtureId,
        prediction: prediction.predictions,
        comparison: prediction.comparison,
        league: prediction.league
      },
      source: "API-Football",
      fetchedAt: new Date().toISOString(),
      event: {
        id: fixture.fixture.id,
        name: `${fixture.teams.home.name} vs ${fixture.teams.away.name}`,
        date: fixture.fixture.date,
        league: fixture.league.name
      }
    };

    response.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=900");
    return response.status(200).json(matchup);
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}

async function apiFootball(path, apiKey) {
  const result = await fetch(`${API_BASE}${path}`, {
    headers: { "x-apisports-key": apiKey }
  });
  if (!result.ok) {
    throw new Error(`API-Football HTTP ${result.status}`);
  }
  return result.json();
}

function teamToParticipant(teamData, side, injuries) {
  const league = teamData.league || {};
  const last5 = teamData.last_5 || {};
  const teamInjuries = injuries
    .filter((item) => item.team?.id === teamData.id)
    .map((item) => ({
      name: item.player?.name || "Jugador",
      role: item.player?.type || "Baja",
      impact: 6,
      status: item.player?.reason || "lesion"
    }));

  return {
    id: teamData.id,
    name: teamData.name,
    league: "API-Football",
    country: "",
    badge: teamData.logo,
    absences: teamInjuries,
    recentMatches: syntheticRecentMatches(league.form || "", last5, side)
  };
}

function syntheticRecentMatches(form, last5, side) {
  const chars = String(form || "").slice(-5).split("");
  const played = Number(last5.played || chars.length || 5);
  const avgFor = Number(last5.goals?.for?.average || 1);
  const avgAgainst = Number(last5.goals?.against?.average || 1);
  const sequence = chars.length ? chars : Array.from({ length: played }, () => "D");

  return sequence.map((result, index) => {
    const score = scoreFromResult(result, avgFor, avgAgainst);
    return {
      date: "",
      opponent: `Partido reciente ${index + 1}`,
      venue: index % 2 === 0 ? side : side === "home" ? "away" : "home",
      for: score.for,
      against: score.against
    };
  });
}

function scoreFromResult(result, avgFor, avgAgainst) {
  if (result === "W") return { for: Math.max(1, Math.round(avgFor + 1)), against: Math.max(0, Math.round(avgAgainst - 0.5)) };
  if (result === "L") return { for: Math.max(0, Math.round(avgFor - 0.5)), against: Math.max(1, Math.round(avgAgainst + 1)) };
  const goals = Math.max(0, Math.round((avgFor + avgAgainst) / 2));
  return { for: goals, against: goals };
}

function toHeadToHead(item) {
  return {
    date: item.fixture?.date || "",
    home: item.teams?.home?.id,
    away: item.teams?.away?.id,
    homeScore: Number(item.goals?.home || 0),
    awayScore: Number(item.goals?.away || 0)
  };
}

function normalizePredictionProbabilities(percent) {
  const homeWin = parsePercent(percent?.home);
  const draw = parsePercent(percent?.draw);
  const awayWin = parsePercent(percent?.away);
  return {
    homeWin,
    draw,
    awayWin,
    doubleChanceHomeDraw: homeWin + draw,
    doubleChanceAwayDraw: awayWin + draw
  };
}

function normalizeOdds(oddsPayload) {
  const bookmaker = oddsPayload?.bookmakers?.[0];
  if (!bookmaker) {
    return {
      book: "API-Football sin cuotas disponibles",
      updatedAt: new Date().toISOString(),
      markets: {}
    };
  }

  const markets = {};
  const bets = bookmaker.bets || [];
  assignMatchWinner(markets, findBet(bets, "Match Winner"));
  assignDoubleChance(markets, findBet(bets, "Double Chance"));
  assignTotals(markets, findBet(bets, "Goals Over/Under"));
  assignBothTeamsScore(markets, findBet(bets, "Both Teams Score"));
  assignHandicap(markets, findBet(bets, "Asian Handicap") || findBet(bets, "Handicap Result"));
  assignHtFt(markets, findBet(bets, "HT/FT Double"));

  return {
    book: `API-Football / ${bookmaker.name}`,
    updatedAt: oddsPayload.update || new Date().toISOString(),
    markets
  };
}

function findBet(bets, name) {
  return bets.find((bet) => bet.name === name);
}

function assignMatchWinner(markets, bet) {
  for (const item of bet?.values || []) {
    if (item.value === "Home") markets.homeWin = Number(item.odd);
    if (item.value === "Draw") markets.draw = Number(item.odd);
    if (item.value === "Away") markets.awayWin = Number(item.odd);
  }
}

function assignDoubleChance(markets, bet) {
  for (const item of bet?.values || []) {
    if (item.value === "Home/Draw") markets.doubleChanceHomeDraw = Number(item.odd);
    if (item.value === "Draw/Away") markets.doubleChanceAwayDraw = Number(item.odd);
  }
}

function assignTotals(markets, bet) {
  for (const item of bet?.values || []) {
    if (item.value === "Over 2.5") markets.overTotal = Number(item.odd);
    if (item.value === "Under 2.5") markets.underTotal = Number(item.odd);
  }
}

function assignBothTeamsScore(markets, bet) {
  for (const item of bet?.values || []) {
    if (item.value === "Yes") markets.bothTeamsScoreYes = Number(item.odd);
  }
}

function assignHandicap(markets, bet) {
  for (const item of bet?.values || []) {
    if (item.value === "Home -0.5") markets.handicapHome = Number(item.odd);
  }
}

function assignHtFt(markets, bet) {
  for (const item of bet?.values || []) {
    if (item.value === "Home/Home") markets.halfTimeFullTimeHomeHome = Number(item.odd);
  }
}

function parsePercent(value) {
  return Math.max(0, Math.min(1, Number(String(value || "0").replace("%", "")) / 100));
}
