# Reemplazar datos simulados por APIs reales

El MVP usa `HybridSportsDataProvider` en `src/apiProviders.js`.
Para futbol, usa API-Football mediante endpoints serverless propios:

- `api/football-fixtures.js`: lista fixtures reales cercanos a la fecha actual.
- `api/football-matchup.js`: analiza un fixture real por ID.

El frontend no analiza partidos escritos libremente en futbol. Primero se selecciona un fixture real y luego se analiza ese ID.

Para conectar otro proveedor real, mantene el mismo contrato que consume `SportsBettingAnalyzer.analyzeMatchup()`.

## Contrato esperado

```js
{
  sport,
  home,
  away,
  headToHead,
  odds,
  source: "api"
}
```

Cada participante debe traer:

```js
{
  id: "team-or-player-id",
  name: "Nombre",
  league: "Liga",
  country: "Pais",
  absences: [
    { name: "Nombre o descripcion", role: "Rol", impact: 12, status: "baja" }
  ],
  recentMatches: [
    { date: "2026-05-18", opponent: "Rival", venue: "home", for: 2, against: 1 }
  ]
}
```

Las cuotas deben estar en formato decimal:

```js
{
  book: "Proveedor",
  updatedAt: "2026-05-26T10:00:00-03:00",
  markets: {
    homeWin: 2.08,
    draw: 3.25,
    awayWin: 3.65,
    doubleChanceHomeDraw: 1.32,
    overTotal: 1.95,
    underTotal: 1.88,
    bothTeamsScoreYes: 1.82,
    handicapHome: 2.15
  }
}
```

## Backend incluido

`api/football-fixtures.js` y `api/football-matchup.js` estan listos para Vercel como serverless functions.

Consulta:

- API-Football para fixtures, predicciones, comparacion, H2H, bajas y cuotas disponibles.

Variables:

- `API_FOOTBALL_KEY`: obligatoria.
- `THE_ODDS_API_KEY`: opcional para integrar otra fuente de cuotas si se quisiera.

## Backend recomendado para produccion

Usa un backend propio para no exponer claves API en el navegador.

Endpoints minimos:

- `GET /api/sports`
- `GET /api/participants?sport=football`
- `GET /api/matchup?sport=football&home=aurora-fc&away=puerto-norte`

El backend deberia:

- Consultar API de resultados deportivos.
- Consultar API de odds.
- Normalizar nombres e IDs de equipos o jugadores.
- Convertir cuotas americanas/fraccionarias a decimales si hiciera falta.
- Devolver el contrato esperado por el frontend.
- Guardar cache para evitar rate limits.

## Donde cambiar el frontend

En `src/app.js`, hoy se usa:

```js
const provider = new window.SportsDataProviders.HybridSportsDataProvider(window.SPORTS_BETTING_MOCK_DATA);
```

Si queres usar solo tu backend, reemplazalo por un proveedor real que implemente los mismos metodos:

```js
const provider = new ApiBackedProvider({ baseUrl: "/api" });
```

Ejemplo de proveedor:

```js
class ApiBackedProvider {
  constructor({ baseUrl }) {
    this.baseUrl = baseUrl;
  }

  async listSports() {
    const response = await fetch(`${this.baseUrl}/sports`);
    return response.json();
  }

  async getSport(sportId) {
    const response = await fetch(`${this.baseUrl}/sports/${sportId}`);
    return response.json();
  }

  async getMatchup(sportId, home, away) {
    const params = new URLSearchParams({ sport: sportId, home, away });
    const response = await fetch(`${this.baseUrl}/matchup?${params}`);
    return response.json();
  }
}
```

## Formula actual

El modelo es deliberadamente simple:

- Forma reciente: 30%
- Rendimiento local/visitante: 20%
- Promedio ofensivo: 20%
- Defensa recibida: 15%
- Historial entre ambos: 10%
- Lesiones o bajas: 5%

Para detectar valor:

```txt
probabilidad_implicita = 1 / cuota
diferencia_de_valor = probabilidad_estimada - probabilidad_implicita
```

Si la diferencia es positiva, la app lo marca como oportunidad estadistica posible, siempre con advertencia de riesgo.
