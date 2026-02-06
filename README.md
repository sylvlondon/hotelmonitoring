# Hotel Monitoring

Monitoring quotidien des disponibilités (7 prochains soirs, séjour 1 nuit) pour:
- Maison Pavlov
- Les Séraphines
- Villa Victor Louis

Les résultats sont append dans une Google Sheet unique.

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

## Variables

- `GOOGLE_SERVICE_ACCOUNT_JSON`: JSON du service account Google.
- `GOOGLE_SHEET_ID`: ID du spreadsheet.
- `GOOGLE_SHEET_TAB`: nom onglet (défaut `monitoring_raw`).
- `LOOKAHEAD_NIGHTS`: défaut `7`.
- `TZ`: défaut `Europe/Paris`.

## GitHub Actions

Workflow: `.github/workflows/daily-monitoring.yml`
- Cron quotidien
- Déclenchement manuel (`workflow_dispatch`)
- Exécute tests puis monitoring
