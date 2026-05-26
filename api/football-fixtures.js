const API_BASE = "https://v3.football.api-sports.io";

export default async function handler(request, response) {
  try {
    const apiKey = process.env.API_FOOTBALL_KEY;
    if (!apiKey) {
      return response.status(500).json({ error: "Falta configurar API_FOOTBALL_KEY en Vercel." });
    }

    const dates = datesAroundToday();
    const batches = await Promise.all(
      dates.map((date) => apiFootball(`/fixtures?date=${date}`, apiKey))
    );

    const fixtures = batches
      .flatMap((batch) => batch.response || [])
      .filter((item) => item.fixture && item.teams?.home && item.teams?.away)
      .map((item) => ({
        id: String(item.fixture.id),
        fixtureId: item.fixture.id,
        leagueId: item.league.id,
        league: item.league.name,
        country: item.league.country,
        date: item.fixture.date,
        status: item.fixture.status?.short,
        home: item.teams.home.name,
        away: item.teams.away.name,
        name: `${item.teams.home.name} vs ${item.teams.away.name}`
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    response.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=900");
    return response.status(200).json({ fixtures });
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

function datesAroundToday() {
  const now = new Date();
  return [-1, 0, 1, 2].map((offset) => {
    const date = new Date(now);
    date.setDate(date.getDate() + offset);
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
  });
}
