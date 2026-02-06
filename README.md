# Hotel Monitoring

Monitoring quotidien des disponibilités (7 prochains soirs, séjour 1 nuit) pour:
- Maison Pavlov
- Les Séraphines
- Villa Victor Louis

Les résultats sont stockés en append-only dans SQLite et un rapport HTML est généré à chaque run.

## Setup

1. Installer dépendances:

```bash
npm install
npx playwright install --with-deps chromium
```

2. Créer un `.env` à partir de `.env.example`.

3. Lancer en local:

```bash
npm run monitor
```

## Sorties

- Base SQLite: `output/monitoring.db`
- Rapport HTML (dernier run): `output/latest-report.html`

## Variables

- `SQLITE_DB_PATH`: chemin de la base SQLite (défaut `output/monitoring.db`).
- `HTML_REPORT_PATH`: chemin du rapport HTML (défaut `output/latest-report.html`).
- `LOOKAHEAD_NIGHTS`: défaut `7`.
- `TZ`: défaut `Europe/Paris`.

## GitHub Actions

Workflow: `.github/workflows/daily-monitoring.yml`
- Cron quotidien (07:00 Europe/Paris)
- Déclenchement manuel (`workflow_dispatch`)
- Exécute tests puis monitoring
- Publie `output/monitoring.db` et `output/latest-report.html` en artefacts
- Déploie le rapport sur GitHub Pages (`output/latest-report.html` copié en `index.html`)
