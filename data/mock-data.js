window.SPORTS_BETTING_MOCK_DATA = {
  sports: [
    {
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
      },
      participants: [
        {
          id: "aurora-fc",
          name: "Aurora FC",
          league: "Liga Metropolitana",
          country: "AR",
          absences: [
            { name: "N. Herrera", role: "Mediocentro", impact: 8, status: "duda" }
          ],
          recentMatches: [
            { date: "2026-05-18", opponent: "Rio Sur", venue: "home", for: 2, against: 1, halftimeFor: 1, halftimeAgainst: 0 },
            { date: "2026-05-11", opponent: "Puerto Norte", venue: "away", for: 1, against: 1, halftimeFor: 0, halftimeAgainst: 1 },
            { date: "2026-05-04", opponent: "Barrio Alto", venue: "home", for: 3, against: 0, halftimeFor: 2, halftimeAgainst: 0 },
            { date: "2026-04-27", opponent: "Union Central", venue: "away", for: 0, against: 2, halftimeFor: 0, halftimeAgainst: 1 },
            { date: "2026-04-20", opponent: "Costa Este", venue: "home", for: 2, against: 2, halftimeFor: 1, halftimeAgainst: 1 },
            { date: "2026-04-13", opponent: "Deportivo Sur", venue: "away", for: 2, against: 1, halftimeFor: 1, halftimeAgainst: 1 },
            { date: "2026-04-06", opponent: "Atletico Norte", venue: "home", for: 1, against: 0, halftimeFor: 0, halftimeAgainst: 0 },
            { date: "2026-03-30", opponent: "Ciudad Verde", venue: "away", for: 1, against: 3, halftimeFor: 1, halftimeAgainst: 2 },
            { date: "2026-03-23", opponent: "Racing Delta", venue: "home", for: 2, against: 0, halftimeFor: 1, halftimeAgainst: 0 },
            { date: "2026-03-16", opponent: "Mar Azul", venue: "away", for: 1, against: 1, halftimeFor: 0, halftimeAgainst: 0 }
          ]
        },
        {
          id: "puerto-norte",
          name: "Puerto Norte",
          league: "Liga Metropolitana",
          country: "AR",
          absences: [
            { name: "L. Andrade", role: "Delantero", impact: 14, status: "baja" },
            { name: "F. Reyes", role: "Lateral", impact: 6, status: "baja" }
          ],
          recentMatches: [
            { date: "2026-05-18", opponent: "Union Central", venue: "away", for: 0, against: 1, halftimeFor: 0, halftimeAgainst: 0 },
            { date: "2026-05-11", opponent: "Aurora FC", venue: "home", for: 1, against: 1, halftimeFor: 1, halftimeAgainst: 0 },
            { date: "2026-05-04", opponent: "Costa Este", venue: "away", for: 2, against: 3, halftimeFor: 1, halftimeAgainst: 2 },
            { date: "2026-04-27", opponent: "Rio Sur", venue: "home", for: 2, against: 0, halftimeFor: 1, halftimeAgainst: 0 },
            { date: "2026-04-20", opponent: "Atletico Norte", venue: "away", for: 1, against: 2, halftimeFor: 0, halftimeAgainst: 1 },
            { date: "2026-04-13", opponent: "Mar Azul", venue: "home", for: 1, against: 0, halftimeFor: 0, halftimeAgainst: 0 },
            { date: "2026-04-06", opponent: "Ciudad Verde", venue: "away", for: 0, against: 0, halftimeFor: 0, halftimeAgainst: 0 },
            { date: "2026-03-30", opponent: "Racing Delta", venue: "home", for: 3, against: 2, halftimeFor: 2, halftimeAgainst: 1 },
            { date: "2026-03-23", opponent: "Barrio Alto", venue: "away", for: 1, against: 1, halftimeFor: 1, halftimeAgainst: 1 },
            { date: "2026-03-16", opponent: "Deportivo Sur", venue: "home", for: 0, against: 2, halftimeFor: 0, halftimeAgainst: 1 }
          ]
        },
        {
          id: "rio-sur",
          name: "Rio Sur",
          league: "Liga Metropolitana",
          country: "AR",
          absences: [],
          recentMatches: [
            { date: "2026-05-18", opponent: "Aurora FC", venue: "away", for: 1, against: 2, halftimeFor: 0, halftimeAgainst: 1 },
            { date: "2026-05-11", opponent: "Barrio Alto", venue: "home", for: 2, against: 1, halftimeFor: 1, halftimeAgainst: 1 },
            { date: "2026-05-04", opponent: "Costa Este", venue: "home", for: 1, against: 1, halftimeFor: 0, halftimeAgainst: 1 },
            { date: "2026-04-27", opponent: "Puerto Norte", venue: "away", for: 0, against: 2, halftimeFor: 0, halftimeAgainst: 1 },
            { date: "2026-04-20", opponent: "Union Central", venue: "home", for: 3, against: 1, halftimeFor: 2, halftimeAgainst: 0 },
            { date: "2026-04-13", opponent: "Atletico Norte", venue: "away", for: 1, against: 2, halftimeFor: 0, halftimeAgainst: 1 }
          ]
        }
      ],
      headToHead: [
        { date: "2026-05-11", home: "puerto-norte", away: "aurora-fc", homeScore: 1, awayScore: 1, halftimeHome: 1, halftimeAway: 0 },
        { date: "2025-11-02", home: "aurora-fc", away: "puerto-norte", homeScore: 2, awayScore: 0, halftimeHome: 1, halftimeAway: 0 },
        { date: "2025-06-14", home: "puerto-norte", away: "aurora-fc", homeScore: 2, awayScore: 1, halftimeHome: 1, halftimeAway: 1 },
        { date: "2024-12-08", home: "aurora-fc", away: "puerto-norte", homeScore: 1, awayScore: 1, halftimeHome: 0, halftimeAway: 0 }
      ],
      odds: {
        "aurora-fc__puerto-norte": {
          book: "Mock Odds",
          updatedAt: "2026-05-26T10:00:00-03:00",
          markets: {
            homeWin: 2.08,
            draw: 3.25,
            awayWin: 3.65,
            doubleChanceHomeDraw: 1.32,
            doubleChanceAwayDraw: 1.78,
            overTotal: 1.95,
            underTotal: 1.88,
            bothTeamsScoreYes: 1.82,
            handicapHome: 2.15,
            halfTimeFullTimeHomeHome: 3.75
          }
        },
        "puerto-norte__aurora-fc": {
          book: "Mock Odds",
          updatedAt: "2026-05-26T10:00:00-03:00",
          markets: {
            homeWin: 3.35,
            draw: 3.18,
            awayWin: 2.18,
            doubleChanceHomeDraw: 1.66,
            doubleChanceAwayDraw: 1.36,
            overTotal: 2.02,
            underTotal: 1.78,
            bothTeamsScoreYes: 1.86,
            handicapHome: 1.86,
            halfTimeFullTimeHomeHome: 6.25
          }
        }
      }
    },
    {
      id: "basketball",
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
      },
      participants: [
        {
          id: "capital-meteors",
          name: "Capital Meteors",
          league: "Liga Nacional",
          country: "AR",
          absences: [
            { name: "M. Silva", role: "Base", impact: 10, status: "duda" }
          ],
          recentMatches: [
            { date: "2026-05-20", opponent: "Mar del Plata Titans", venue: "home", for: 111, against: 104 },
            { date: "2026-05-17", opponent: "Cordoba Hawks", venue: "away", for: 98, against: 101 },
            { date: "2026-05-14", opponent: "Rosario Wolves", venue: "home", for: 116, against: 108 },
            { date: "2026-05-10", opponent: "Bahia Storm", venue: "away", for: 107, against: 110 },
            { date: "2026-05-06", opponent: "Norte Basket", venue: "home", for: 122, against: 112 },
            { date: "2026-05-02", opponent: "Sur Flyers", venue: "away", for: 109, against: 99 },
            { date: "2026-04-29", opponent: "Litoral Foxes", venue: "home", for: 103, against: 97 },
            { date: "2026-04-25", opponent: "Andes Club", venue: "away", for: 101, against: 106 },
            { date: "2026-04-21", opponent: "Pampa Bulls", venue: "home", for: 118, against: 115 },
            { date: "2026-04-17", opponent: "Patagonia Ice", venue: "away", for: 105, against: 100 }
          ]
        },
        {
          id: "mar-del-plata-titans",
          name: "Mar del Plata Titans",
          league: "Liga Nacional",
          country: "AR",
          absences: [
            { name: "T. Ocampo", role: "Pivot", impact: 16, status: "baja" }
          ],
          recentMatches: [
            { date: "2026-05-20", opponent: "Capital Meteors", venue: "away", for: 104, against: 111 },
            { date: "2026-05-17", opponent: "Bahia Storm", venue: "home", for: 112, against: 108 },
            { date: "2026-05-14", opponent: "Norte Basket", venue: "away", for: 96, against: 102 },
            { date: "2026-05-10", opponent: "Sur Flyers", venue: "home", for: 119, against: 114 },
            { date: "2026-05-06", opponent: "Andes Club", venue: "away", for: 99, against: 105 },
            { date: "2026-05-02", opponent: "Litoral Foxes", venue: "home", for: 107, against: 98 },
            { date: "2026-04-29", opponent: "Pampa Bulls", venue: "away", for: 100, against: 104 },
            { date: "2026-04-25", opponent: "Patagonia Ice", venue: "home", for: 113, against: 109 },
            { date: "2026-04-21", opponent: "Cordoba Hawks", venue: "away", for: 101, against: 103 },
            { date: "2026-04-17", opponent: "Rosario Wolves", venue: "home", for: 115, against: 110 }
          ]
        }
      ],
      headToHead: [
        { date: "2026-05-20", home: "capital-meteors", away: "mar-del-plata-titans", homeScore: 111, awayScore: 104 },
        { date: "2026-02-12", home: "mar-del-plata-titans", away: "capital-meteors", homeScore: 102, awayScore: 99 },
        { date: "2025-12-03", home: "capital-meteors", away: "mar-del-plata-titans", homeScore: 108, awayScore: 96 }
      ],
      odds: {
        "capital-meteors__mar-del-plata-titans": {
          book: "Mock Odds",
          updatedAt: "2026-05-26T10:00:00-03:00",
          markets: {
            homeWin: 1.78,
            awayWin: 2.08,
            overTotal: 1.91,
            underTotal: 1.91,
            handicapHome: 1.95,
            handicapAway: 1.87
          }
        }
      }
    },
    {
      id: "tennis",
      name: "Tenis",
      participantLabel: "Jugador",
      scoreUnit: "games",
      drawsAllowed: false,
      baseline: {
        offenseLow: 8,
        offenseHigh: 16,
        defenseLow: 7,
        defenseHigh: 16,
        totalLine: 22.5,
        totalScale: 3.7,
        homeAdvantage: 0
      },
      participants: [
        {
          id: "mateo-rios",
          name: "Mateo Rios",
          league: "ATP 250 Demo",
          country: "AR",
          absences: [],
          recentMatches: [
            { date: "2026-05-21", opponent: "Noah Keller", venue: "neutral", for: 13, against: 9 },
            { date: "2026-05-18", opponent: "Luca Moretti", venue: "neutral", for: 15, against: 12 },
            { date: "2026-05-15", opponent: "Ivan Petrov", venue: "neutral", for: 10, against: 13 },
            { date: "2026-05-12", opponent: "Hugo Martin", venue: "neutral", for: 14, against: 8 },
            { date: "2026-05-08", opponent: "Samir Haddad", venue: "neutral", for: 12, against: 14 },
            { date: "2026-05-05", opponent: "Jan Novak", venue: "neutral", for: 13, against: 10 },
            { date: "2026-05-01", opponent: "Diego Alvarez", venue: "neutral", for: 16, against: 11 },
            { date: "2026-04-28", opponent: "Marc Vogel", venue: "neutral", for: 9, against: 13 }
          ]
        },
        {
          id: "lucas-bennett",
          name: "Lucas Bennett",
          league: "ATP 250 Demo",
          country: "GB",
          absences: [
            { name: "Molestia en hombro", role: "Condicion fisica", impact: 12, status: "seguimiento" }
          ],
          recentMatches: [
            { date: "2026-05-21", opponent: "Jan Novak", venue: "neutral", for: 12, against: 14 },
            { date: "2026-05-18", opponent: "Diego Alvarez", venue: "neutral", for: 13, against: 11 },
            { date: "2026-05-15", opponent: "Marc Vogel", venue: "neutral", for: 14, against: 12 },
            { date: "2026-05-12", opponent: "Noah Keller", venue: "neutral", for: 8, against: 13 },
            { date: "2026-05-08", opponent: "Luca Moretti", venue: "neutral", for: 11, against: 13 },
            { date: "2026-05-05", opponent: "Ivan Petrov", venue: "neutral", for: 15, against: 10 },
            { date: "2026-05-01", opponent: "Hugo Martin", venue: "neutral", for: 10, against: 12 },
            { date: "2026-04-28", opponent: "Samir Haddad", venue: "neutral", for: 13, against: 8 }
          ]
        }
      ],
      headToHead: [
        { date: "2026-03-03", home: "mateo-rios", away: "lucas-bennett", homeScore: 13, awayScore: 11 },
        { date: "2025-09-18", home: "lucas-bennett", away: "mateo-rios", homeScore: 14, awayScore: 12 }
      ],
      odds: {
        "mateo-rios__lucas-bennett": {
          book: "Mock Odds",
          updatedAt: "2026-05-26T10:00:00-03:00",
          markets: {
            homeWin: 1.92,
            awayWin: 1.95,
            overTotal: 1.86,
            underTotal: 1.98,
            handicapHome: 2.04,
            handicapAway: 1.82
          }
        }
      }
    }
  ]
};
