# Migracion a React + Tailwind

El MVP actual es estatico para poder abrirlo sin instalar dependencias. Para pasarlo al stack recomendado:

1. Crear proyecto:

```bash
npm create vite@latest sports-analytics -- --template react
cd sports-analytics
npm install
npm install -D tailwindcss @tailwindcss/vite
```

2. Copiar la logica:

- `src/analyzer.js` puede convertirse en `src/lib/analyzer.js`.
- `src/apiProviders.js` puede convertirse en `src/services/apiProviders.js`.
- `data/mock-data.json` puede importarse desde React o servirse desde `/public`.

3. Separar componentes:

- `SearchForm.jsx`
- `ResponsibleBanner.jsx`
- `MatchSummary.jsx`
- `TeamBreakdown.jsx`
- `MarketsTable.jsx`
- `AnalysisHistory.jsx`

4. Mantener la regla de negocio:

La formula ponderada y la deteccion de valor deberian quedar en funciones puras, fuera de componentes visuales. Asi es mas facil testear:

```js
import { analyzeMatchup } from "./lib/analyzer";

const analysis = analyzeMatchup(matchup);
```

5. Backend:

Crear un proxy con Node/Express o FastAPI para ocultar claves de APIs deportivas y de odds. El frontend deberia llamar solo a tu backend.
