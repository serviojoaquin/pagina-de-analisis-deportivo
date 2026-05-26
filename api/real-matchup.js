const SPORT_CONFIG = {
  football: {
    apiSport: "Soccer",
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
  basketball: {
    apiSport: "Basketball",
    name: "Basquet",
    participantLabel: "Equipo",
    scoreUnit: "puntos",
    drawsAllowed: false,
    baseline: {
      offenseLow: 92,
      offenseHigh: 124,
      defenseLow: 90,
      defenseHigh: 126,
      totalLine: 218.5,
      totalScale: 11,
      homeAdvantage: 4.5
    }
  }
};

const THE_SPORTS_DB_KEY = process.env.THE_SPORTS_DB_KEY || "3";
const THE_ODDS_API_KEY = process.env.THE_ODDS_API_KEY || "";

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=3600");

  try {
    const sportId = String(request.query.sport || request.query.sportId || "football");
    const homeQuery = String(request.query.home || "");
    const awayQuery = String(request.query.away || "");
    const config = SPORT_CONFIG[sportId];

    if (!config) {
      return response.status(400).json({
        error: "El proveedor real incluido soporta futbol y basquet. Para tenis conecta una API especifica de jugadores."
      });
    }

    if (!homeQuery || !awayQuery) {
      return response.status(400).json({ error: "Faltan participantes para analizar." });
    }

    if (sportId === "football") {
      return response.status(404).json({
        error: "Para futbol no se usa TheSportsDB porque puede devolver equipos incorrectos. El frontend valida partidos reales contra ESPN."
      });
    }

    const [homeTeam, awayTeam] = await Promise.all([
      searchTeam(homeQuery, config.apiSport),
      searchTeam(awayQuery, config.apiSport)
    ]);

    if (!homeTeam || !awayTeam) {
      return response.status(404).json({ error: "No se encontraron ambos equipos en TheSportsDB." });
    }

    const [homeEvents, awayEvents] = await Promise.all([
      getLastEvents(homeTeam.idTeam),
      getLastEvents(awayTeam.idTeam)
    ]);

    const home = toParticipant(homeTeam, homeEvents, "home");
    const away = toParticipant(awayTeam, awayEvents, "away");
    const headToHead = toHeadToHead(homeTeam.idTeam, awayTeam.idTeam, homeEvents.concat(awayEvents));
    const odds = await getOdds({ sportId, homeTeam, awayTeam });

    return response.status(200).json({
      sport: {
        id: sportId,
        name: config.name,
        participantLabel: config.participantLabel,
        scoreUnit: config.scoreUnit,
        drawsAllowed: config.drawsAllowed,
        baseline: config.baseline
      },
      home,
      away,
      headToHead,
      odds,
      source: "TheSportsDB",
      fetchedAt: new Date().toISOString()
    });
  } catch (error) {
    return response.status(500).json({
      error: "No se pudo consultar el proveedor real.",
      detail: error.message
    });
  }
}

async function searchTeam(query, sport) {
  const candidates = buildSearchCandidates(query);
  for (const candidate of candidates) {
    const url = `https://www.thesportsdb.com/api/v1/json/${THE_SPORTS_DB_KEY}/searchteams.php?t=${encodeURIComponent(candidate)}`;
    const data = await fetchJson(url);
    const teams = (data.teams || []).filter((team) => team.strSport === sport);
    if (teams.length) {
      const wanted = normalize(query);
      return (
        teams.find((team) => normalize(team.strTeam) === wanted) ||
        teams.find((team) => normalize(team.strTeam).includes(wanted) || wanted.includes(normalize(team.strTeam))) ||
        teams[0]
      );
    }
  }
  return null;
}

async function getLastEvents(teamId) {
  const url = `https://www.thesportsdb.com/api/v1/json/${THE_SPORTS_DB_KEY}/eventslast.php?id=${encodeURIComponent(teamId)}`;
  const data = await fetchJson(url);
  return (data.results || []).filter((event) => isFinishedEvent(event)).slice(0, 10);
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "responsible-sports-analytics-mvp/1.0" }
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} al consultar ${url}`);
  }
  return response.json();
}

function isFinishedEvent(event) {
  return Number.isFinite(Number(event.intHomeScore)) && Number.isFinite(Number(event.intAwayScore));
}

function toParticipant(team, events, defaultVenue) {
  return {
    id: team.idTeam,
    name: team.strTeam,
    league: team.strLeague,
    country: team.strCountry,
    badge: team.strBadge,
    absences: [],
    recentMatches: events.map((event) => toRecentMatch(team.idTeam, event, defaultVenue))
  };
}

function toRecentMatch(teamId, event, defaultVenue) {
  const isHome = event.idHomeTeam === teamId;
  const ownScore = Number(isHome ? event.intHomeScore : event.intAwayScore);
  const rivalScore = Number(isHome ? event.intAwayScore : event.intHomeScore);
  const opponent = isHome ? event.strAwayTeam : event.strHomeTeam;

  return {
    date: event.dateEvent || event.strTimestamp || "",
    opponent,
    venue: isHome ? "home" : event.idAwayTeam === teamId ? "away" : defaultVenue,
    for: ownScore,
    against: rivalScore
  };
}

function buildSearchCandidates(query) {
  const clean = String(query || "").trim();
  const normalized = normalize(clean);
  const candidates = [clean];

  const aliases = {
    estudiantes: ["Estudiantes de La Plata", "Estudiantes LP"],
    "estudiantes la plata": ["Estudiantes de La Plata"],
    "estudiantes de la plata": ["Estudiantes de La Plata"],
    "independiente medellin": ["Independiente Medellin", "Deportivo Independiente Medellin"],
    dim: ["Independiente Medellin", "Deportivo Independiente Medellin"]
  };

  if (aliases[normalized]) {
    candidates.push(...aliases[normalized]);
  }

  return [...new Set(candidates.filter(Boolean))];
}

function toHeadToHead(homeId, awayId, events) {
  const seen = new Set();
  return events
    .filter((event) => {
      const ids = [event.idHomeTeam, event.idAwayTeam];
      return ids.includes(homeId) && ids.includes(awayId) && isFinishedEvent(event);
    })
    .filter((event) => {
      if (seen.has(event.idEvent)) return false;
      seen.add(event.idEvent);
      return true;
    })
    .slice(0, 5)
    .map((event) => ({
      date: event.dateEvent || "",
      home: event.idHomeTeam,
      away: event.idAwayTeam,
      homeScore: Number(event.intHomeScore),
      awayScore: Number(event.intAwayScore)
    }));
}

async function getOdds({ sportId, homeTeam, awayTeam }) {
  if (!THE_ODDS_API_KEY) {
    return {
      book: "Sin API de cuotas configurada",
      updatedAt: new Date().toISOString(),
      markets: {}
    };
  }

  const oddsSport = sportId === "football" ? "soccer_epl" : "basketball_nba";
  const url = `https://api.the-odds-api.com/v4/sports/${oddsSport}/odds/?regions=us,eu&markets=h2h,totals,spreads&oddsFormat=decimal&apiKey=${encodeURIComponent(THE_ODDS_API_KEY)}`;
  const data = await fetchJson(url);
  const event = data.find((item) => {
    const names = [normalize(item.home_team), normalize(item.away_team)];
    return names.includes(normalize(homeTeam.strTeam)) && names.includes(normalize(awayTeam.strTeam));
  });

  if (!event || !event.bookmakers || !event.bookmakers.length) {
    return {
      book: "The Odds API",
      updatedAt: new Date().toISOString(),
      markets: {}
    };
  }

  return normalizeOdds(event.bookmakers[0], homeTeam.strTeam, awayTeam.strTeam);
}

function normalizeOdds(bookmaker, homeName, awayName) {
  const markets = {};

  for (const market of bookmaker.markets || []) {
    if (market.key === "h2h") {
      for (const outcome of market.outcomes || []) {
        if (normalize(outcome.name) === normalize(homeName)) markets.homeWin = outcome.price;
        if (normalize(outcome.name) === normalize(awayName)) markets.awayWin = outcome.price;
        if (normalize(outcome.name) === "draw") markets.draw = outcome.price;
      }
    }

    if (market.key === "totals") {
      const over = (market.outcomes || []).find((outcome) => outcome.name === "Over");
      const under = (market.outcomes || []).find((outcome) => outcome.name === "Under");
      if (over) markets.overTotal = over.price;
      if (under) markets.underTotal = under.price;
    }

    if (market.key === "spreads") {
      const home = (market.outcomes || []).find((outcome) => normalize(outcome.name) === normalize(homeName));
      const away = (market.outcomes || []).find((outcome) => normalize(outcome.name) === normalize(awayName));
      if (home) markets.handicapHome = home.price;
      if (away) markets.handicapAway = away.price;
    }
  }

  return {
    book: bookmaker.title || "The Odds API",
    updatedAt: bookmaker.last_update || new Date().toISOString(),
    markets
  };
}

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
