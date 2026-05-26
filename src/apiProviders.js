(function () {
  class MockSportsDataProvider {
    constructor(database) {
      this.database = database;
    }

    async listSports() {
      return this.database.sports.map((sport) => ({
        id: sport.id,
        name: sport.name,
        participantLabel: sport.participantLabel
      }));
    }

    async getSport(sportId) {
      const sport = this.database.sports.find((item) => item.id === sportId);
      if (!sport) {
        throw new Error("No se encontro el deporte seleccionado.");
      }
      return sport;
    }

    async getParticipants(sportId) {
      const sport = await this.getSport(sportId);
      return sport.participants.map((participant) => ({
        id: participant.id,
        name: participant.name,
        league: participant.league,
        country: participant.country
      }));
    }

    async getMatchup(sportId, homeValue, awayValue) {
      const sport = await this.getSport(sportId);
      const home = findParticipant(sport, homeValue);
      const away = findParticipant(sport, awayValue);

      if (!home || !away) {
        throw new Error("No hay datos simulados para uno de los participantes.");
      }

      if (home.id === away.id) {
        throw new Error("Selecciona dos participantes distintos.");
      }

      const matchupKey = `${home.id}__${away.id}`;
      const odds = sport.odds[matchupKey] || {
        book: "Sin cuotas simuladas",
        updatedAt: null,
        markets: {}
      };

      const headToHead = sport.headToHead.filter((match) => {
        const ids = [match.home, match.away];
        return ids.includes(home.id) && ids.includes(away.id);
      });

      return {
        sport,
        home,
        away,
        headToHead,
        odds,
        source: "mock"
      };
    }
  }

  class SportsResultsApiProvider {
    constructor({ baseUrl, apiKey }) {
      this.baseUrl = baseUrl;
      this.apiKey = apiKey;
    }

    async getMatchup() {
      throw new Error("Proveedor real pendiente: mapear resultados, rachas, bajas e historial al contrato del MVP.");
    }
  }

  class HybridSportsDataProvider {
    constructor(database, { baseUrl = "" } = {}) {
      this.mockProvider = new MockSportsDataProvider(database);
      this.baseUrl = baseUrl;
    }

    async listSports() {
      return this.mockProvider.listSports();
    }

    async getSport(sportId) {
      return this.mockProvider.getSport(sportId);
    }

    async getParticipants(sportId) {
      return this.mockProvider.getParticipants(sportId);
    }

    async listFootballMatches() {
      const response = await fetch(`${this.baseUrl}/api/football-fixtures`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "No se pudieron cargar fixtures reales.");
      }
      return payload.fixtures || [];
    }

    async getFootballMatchupByEvent(matchId) {
      if (!matchId) {
        throw new Error("Selecciona un partido real de la lista.");
      }

      const params = new URLSearchParams({ fixture: matchId });
      const response = await fetch(`${this.baseUrl}/api/football-matchup?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "No se pudo analizar el fixture real.");
      }
      return payload;
    }

    async searchParticipants(sportId, query) {
      const localResults = await this.mockProvider.getParticipants(sportId);
      const localMatches = localResults.filter((participant) => normalize(participant.name).includes(normalize(query)));

      if (sportId === "football" && normalize(query).length >= 3) {
        const espnMatches = await searchEspnTeams(query);
        if (espnMatches.length) {
          return mergeParticipants(espnMatches, localMatches).slice(0, 10);
        }
      }

      if ((sportId !== "football" && sportId !== "basketball") || normalize(query).length < 3) {
        return localMatches;
      }

      try {
        const apiMatches = await searchTeamsOnTheSportsDb(query, sportId);
        return mergeParticipants(apiMatches, localMatches).slice(0, 10);
      } catch (error) {
        return localMatches;
      }
    }

    async getMatchup(sportId, homeValue, awayValue) {
      if (sportId === "football") {
        if (normalize(homeValue) === normalize(awayValue)) {
          throw new Error("Selecciona dos equipos distintos.");
        }

        const espnMatchup = await tryEspnFootballMatchup(homeValue, awayValue);
        if (!espnMatchup.error) {
          return espnMatchup.matchup;
        }

        throw new Error(
          `No encontre un partido real cercano para "${homeValue}" vs "${awayValue}". Revisa los nombres o proba con equipos que jueguen entre ayer y los proximos 2 dias.`
        );
      }

      if (sportId === "basketball") {
        const serverError = await tryServerMatchup(this.baseUrl, sportId, homeValue, awayValue);
        if (!serverError.error) {
          return serverError.matchup;
        }

        const clientMatchup = await tryClientMatchup(sportId, homeValue, awayValue);
        if (!clientMatchup.error) {
          return clientMatchup.matchup;
        }

        try {
          const fallback = await this.mockProvider.getMatchup(sportId, homeValue, awayValue);
          fallback.source = `mock fallback (${serverError.error || clientMatchup.error})`;
          return fallback;
        } catch (error) {
          throw new Error(
            `No encontre datos reales para "${homeValue}" vs "${awayValue}". Proba con nombres completos, por ejemplo "Estudiantes de La Plata" e "Independiente Medellin".`
          );
        }
      }

      const fallback = await this.mockProvider.getMatchup(sportId, homeValue, awayValue);
      fallback.source = "mock: proveedor real de tenis pendiente";
      return fallback;
    }
  }

  class OddsApiProvider {
    constructor({ baseUrl, apiKey }) {
      this.baseUrl = baseUrl;
      this.apiKey = apiKey;
    }

    async getOdds() {
      throw new Error("Proveedor real pendiente: normalizar cuotas decimales por mercado.");
    }
  }

  function findParticipant(sport, value) {
    const normalized = normalize(value);
    return sport.participants.find((participant) => {
      return participant.id === value || normalize(participant.name) === normalized;
    });
  }

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

  const ESPN_SOCCER_LEAGUES = [
    "conmebol.libertadores",
    "conmebol.sudamericana",
    "arg.1",
    "col.1",
    "eng.1",
    "esp.1",
    "ita.1",
    "ger.1",
    "fra.1",
    "usa.1"
  ];

  async function tryEspnFootballMatchup(homeValue, awayValue) {
    try {
      const match = await findEspnMatch(homeValue, awayValue);
      if (!match) {
        throw new Error("ESPN no encontro un partido cercano con esos equipos.");
      }
      return { matchup: await buildEspnMatchup(match) };
    } catch (error) {
      return { error: error.message };
    }
  }

  async function buildEspnMatchup(match) {
    const competition = match.event.competitions[0];
    const competitors = competition.competitors || [];
    const homeCompetitor = competitors.find((item) => item.homeAway === "home");
    const awayCompetitor = competitors.find((item) => item.homeAway === "away");

    if (!homeCompetitor || !awayCompetitor) {
      throw new Error("El evento real no tiene local y visitante definidos.");
    }

    const season = new Date(match.event.date).getUTCFullYear();
    const [homeEvents, awayEvents] = await Promise.all([
      getEspnTeamSchedule(match.league, homeCompetitor.team.id, season),
      getEspnTeamSchedule(match.league, awayCompetitor.team.id, season)
    ]);

    const odds = normalizeEspnOdds(competition.odds);
    const config = clone(SPORT_CONFIG.football);
    if (competition.odds && Number.isFinite(Number(competition.odds.overUnder))) {
      config.baseline.totalLine = Number(competition.odds.overUnder);
    }

    return {
      sport: {
        id: "football",
        name: config.name,
        participantLabel: config.participantLabel,
        scoreUnit: config.scoreUnit,
        drawsAllowed: config.drawsAllowed,
        baseline: config.baseline
      },
      home: toEspnParticipant(homeCompetitor, homeEvents),
      away: toEspnParticipant(awayCompetitor, awayEvents),
      headToHead: toEspnHeadToHead(homeCompetitor.team.id, awayCompetitor.team.id, homeEvents.concat(awayEvents)),
      odds,
      source: "ESPN",
      fetchedAt: new Date().toISOString(),
      event: {
        id: match.event.id,
        name: match.event.name,
        date: match.event.date,
        league: match.league
      }
    };
  }

  async function searchEspnTeams(query) {
    const matches = [];
    const normalizedQuery = normalize(query);
    for (const league of ESPN_SOCCER_LEAGUES.slice(0, 3)) {
      const events = await getEspnScoreboardEvents(league);
      for (const event of events) {
        const competitors = event.competitions?.[0]?.competitors || [];
        for (const competitor of competitors) {
          const name = competitor.team?.displayName || "";
          if (teamMatches(name, normalizedQuery)) {
            matches.push({
              id: competitor.team.id,
              name,
              league,
              country: "",
              raw: competitor.team
            });
          }
        }
      }
    }
    return mergeParticipants(matches, []);
  }

  async function findEspnMatch(homeValue, awayValue) {
    const wantedHome = normalize(homeValue);
    const wantedAway = normalize(awayValue);
    for (const league of ESPN_SOCCER_LEAGUES) {
      const events = await getEspnScoreboardEvents(league);
      for (const event of events) {
        const competitors = event.competitions?.[0]?.competitors || [];
        const names = competitors.map((competitor) => competitor.team?.displayName || competitor.team?.shortDisplayName || "");
        const hasHome = names.some((name) => teamMatches(name, wantedHome));
        const hasAway = names.some((name) => teamMatches(name, wantedAway));
        if (hasHome && hasAway) {
          return { league, event };
        }
      }
    }
    return null;
  }

  async function getEspnScoreboardEvents(league) {
    const dates = datesAroundToday();
    const allEvents = [];
    for (const date of dates) {
      const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard?dates=${date}`;
      const response = await fetch(url);
      if (!response.ok) continue;
      const data = await response.json();
      allEvents.push(...(data.events || []));
    }
    return allEvents;
  }

  async function getEspnTeamSchedule(league, teamId, season) {
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/teams/${teamId}/schedule?season=${season}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("No se pudo consultar el calendario ESPN.");
    }
    const data = await response.json();
    return (data.events || [])
      .filter((event) => isEspnEventFinished(event))
      .slice(0, 10)
      .map((event) => toEspnRecentMatch(teamId, event));
  }

  function toEspnParticipant(competitor, recentMatches) {
    return {
      id: competitor.team.id,
      name: competitor.team.displayName,
      league: "ESPN Soccer",
      country: "",
      badge: competitor.team.logo,
      absences: [],
      recentMatches
    };
  }

  function toEspnRecentMatch(teamId, event) {
    const competition = event.competitions?.[0] || {};
    const competitors = competition.competitors || [];
    const own = competitors.find((competitor) => String(competitor.team?.id) === String(teamId));
    const rival = competitors.find((competitor) => String(competitor.team?.id) !== String(teamId));

    return {
      date: event.date || "",
      opponent: rival?.team?.displayName || "Rival",
      venue: own?.homeAway || "neutral",
      for: Number(own?.score || 0),
      against: Number(rival?.score || 0)
    };
  }

  function toEspnHeadToHead(homeId, awayId, events) {
    const seen = new Set();
    return events
      .filter((event) => {
        const competitors = event.competitions?.[0]?.competitors || [];
        const ids = competitors.map((competitor) => String(competitor.team?.id));
        return ids.includes(String(homeId)) && ids.includes(String(awayId));
      })
      .filter((event) => {
        if (seen.has(event.id)) return false;
        seen.add(event.id);
        return true;
      })
      .map((event) => {
        const competitors = event.competitions[0].competitors;
        const home = competitors.find((competitor) => competitor.homeAway === "home");
        const away = competitors.find((competitor) => competitor.homeAway === "away");
        return {
          date: event.date || "",
          home: home.team.id,
          away: away.team.id,
          homeScore: Number(home.score || 0),
          awayScore: Number(away.score || 0)
        };
      });
  }

  function normalizeEspnOdds(odds) {
    if (!odds) {
      return {
        book: "ESPN sin cuotas disponibles",
        updatedAt: new Date().toISOString(),
        markets: {}
      };
    }

    return {
      book: odds.provider?.name ? `ESPN / ${odds.provider.name}` : "ESPN Odds",
      updatedAt: new Date().toISOString(),
      markets: {
        homeWin: americanToDecimal(odds.moneyline?.home?.close?.odds || odds.moneyline?.home?.open?.odds),
        draw: americanToDecimal(odds.moneyline?.draw?.close?.odds || odds.drawOdds?.moneyLine),
        awayWin: americanToDecimal(odds.moneyline?.away?.close?.odds || odds.moneyline?.away?.open?.odds),
        overTotal: americanToDecimal(odds.total?.over?.close?.odds || odds.total?.over?.open?.odds),
        underTotal: americanToDecimal(odds.total?.under?.close?.odds || odds.total?.under?.open?.odds),
        handicapHome: americanToDecimal(odds.pointSpread?.home?.close?.odds || odds.pointSpread?.home?.open?.odds),
        handicapAway: americanToDecimal(odds.pointSpread?.away?.close?.odds || odds.pointSpread?.away?.open?.odds)
      }
    };
  }

  function americanToDecimal(value) {
    if (value === undefined || value === null || value === "") return undefined;
    const normalized = Number(String(value).replace("+", ""));
    if (!Number.isFinite(normalized) || normalized === 0) return undefined;
    return normalized > 0 ? 1 + normalized / 100 : 1 + 100 / Math.abs(normalized);
  }

  function isEspnEventFinished(event) {
    const status = event.status?.type || event.competitions?.[0]?.status?.type || {};
    if (status.completed) return true;
    const statusName = status.name || status.state || "";
    return /STATUS_FINAL|post/i.test(statusName);
  }

  function datesAroundToday() {
    const now = new Date();
    return [-1, 0, 1, 2].map((offset) => {
      const date = new Date(now);
      date.setDate(date.getDate() + offset);
      return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
    });
  }

  function teamMatches(candidateName, normalizedQuery) {
    const candidate = normalize(candidateName);
    const aliases = buildSearchCandidates(normalizedQuery).map(normalize);
    return aliases.includes(candidate);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function dedupeMatches(matches) {
    const seen = new Set();
    return matches.filter((match) => {
      if (seen.has(match.id)) return false;
      seen.add(match.id);
      return true;
    });
  }

  async function tryServerMatchup(baseUrl, sportId, homeValue, awayValue) {
    try {
      const params = new URLSearchParams({ sport: sportId, home: homeValue, away: awayValue });
      const response = await fetch(`${baseUrl}/api/real-matchup?${params.toString()}`);
      const text = await response.text();
      const payload = JSON.parse(text);
      if (!response.ok) {
        throw new Error(payload.error || "No se pudo obtener informacion real desde el backend.");
      }
      return { matchup: payload };
    } catch (error) {
      return { error: error.message };
    }
  }

  async function tryClientMatchup(sportId, homeValue, awayValue) {
    try {
      if (sportId === "football") {
        throw new Error("Para futbol no se usa fallback: solo se analiza si existe un partido real en ESPN.");
      }

      const config = SPORT_CONFIG[sportId];
      const [homeTeam, awayTeam] = await Promise.all([
        findBestTeam(homeValue, sportId),
        findBestTeam(awayValue, sportId)
      ]);

      if (!homeTeam || !awayTeam) {
        throw new Error("TheSportsDB no devolvio ambos equipos.");
      }

      const [homeEvents, awayEvents] = await Promise.all([
        getLastEvents(homeTeam.idTeam),
        getLastEvents(awayTeam.idTeam)
      ]);

      const home = toParticipant(homeTeam, homeEvents, "home");
      const away = toParticipant(awayTeam, awayEvents, "away");
      const headToHead = toHeadToHead(homeTeam.idTeam, awayTeam.idTeam, homeEvents.concat(awayEvents));

      if (home.recentMatches.length < 3 || away.recentMatches.length < 3) {
        throw new Error("Hay menos de 3 partidos recientes para uno de los equipos.");
      }

      return {
        matchup: {
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
          odds: {
            book: "Sin API de cuotas configurada",
            updatedAt: new Date().toISOString(),
            markets: {}
          },
          source: "TheSportsDB directo",
          fetchedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  async function findBestTeam(query, sportId) {
    const matches = await searchTeamsOnTheSportsDb(query, sportId);
    if (!matches.length) return null;
    const wanted = normalize(query);
    return (
      matches.find((team) => normalize(team.name) === wanted) ||
      matches.find((team) => normalize(team.name).includes(wanted) || wanted.includes(normalize(team.name))) ||
      matches[0].raw
    );
  }

  async function searchTeamsOnTheSportsDb(query, sportId) {
    const config = SPORT_CONFIG[sportId];
    const candidates = buildSearchCandidates(query);
    const results = [];

    for (const candidate of candidates) {
      const url = `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(candidate)}`;
      const response = await fetch(url);
      if (!response.ok) continue;
      const data = await response.json();
      const teams = (data.teams || []).filter((team) => !config || team.strSport === config.apiSport);
      for (const team of teams) {
        results.push({
          id: team.idTeam,
          name: team.strTeam,
          league: team.strLeague,
          country: team.strCountry,
          raw: team
        });
      }
      if (results.length) break;
    }

    return mergeParticipants(results, []);
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
      "independiente medellín": ["Independiente Medellin", "Deportivo Independiente Medellin"],
      dim: ["Independiente Medellin", "Deportivo Independiente Medellin"]
    };

    if (aliases[normalized]) {
      candidates.push(...aliases[normalized]);
    }

    return [...new Set(candidates.filter(Boolean))];
  }

  async function getLastEvents(teamId) {
    const url = `https://www.thesportsdb.com/api/v1/json/3/eventslast.php?id=${encodeURIComponent(teamId)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("No se pudieron consultar ultimos partidos.");
    }
    const data = await response.json();
    return (data.results || []).filter(isFinishedEvent).slice(0, 10);
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
    const isAway = event.idAwayTeam === teamId;
    const ownScore = Number(isHome ? event.intHomeScore : event.intAwayScore);
    const rivalScore = Number(isHome ? event.intAwayScore : event.intHomeScore);
    const opponent = isHome ? event.strAwayTeam : event.strHomeTeam;

    return {
      date: event.dateEvent || event.strTimestamp || "",
      opponent,
      venue: isHome ? "home" : isAway ? "away" : defaultVenue,
      for: ownScore,
      against: rivalScore
    };
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

  function mergeParticipants(primary, secondary) {
    const merged = [];
    const seen = new Set();
    for (const participant of primary.concat(secondary)) {
      const id = participant.id || participant.idTeam || participant.name;
      if (seen.has(id)) continue;
      seen.add(id);
      merged.push(participant);
    }
    return merged;
  }

  function normalize(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  window.SportsDataProviders = {
    MockSportsDataProvider,
    HybridSportsDataProvider,
    SportsResultsApiProvider,
    OddsApiProvider
  };
})();
