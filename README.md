# Analizador deportivo estadistico

Web para analizar mercados deportivos con datos reales de API-Football y advertencia de juego responsable.

No promete ganancias, no usa lenguaje de apuesta segura y no recomienda recuperar perdidas.

## Publicacion

Esta carpeta esta lista para GitHub + Vercel.

Variable necesaria en Vercel:

```text
API_FOOTBALL_KEY
```

Endpoints:

- `/api/football-fixtures`
- `/api/football-matchup?fixture=ID`

## Archivos principales

- `index.html`: interfaz.
- `styles.css`: estilos.
- `src/app.js`: interaccion de la app.
- `src/apiProviders.js`: llamadas a endpoints reales.
- `src/analyzer.js`: calculo estadistico y value bet.
- `api/football-fixtures.js`: lista partidos reales.
- `api/football-matchup.js`: arma el analisis real por fixture.
- `vercel.json`: configuracion para Vercel.
