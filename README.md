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

- `GOOGLE_SHEET_WEBHOOK_URL`: URL d'un webhook Google Apps Script (mode recommandé, sans clé API).
- `GOOGLE_SERVICE_ACCOUNT_JSON`: JSON du service account Google (fallback si pas de webhook).
- `GOOGLE_SHEET_ID`: ID du spreadsheet (fallback si pas de webhook).
- `GOOGLE_SHEET_TAB`: nom onglet (défaut `monitoring_raw`).
- `LOOKAHEAD_NIGHTS`: défaut `7`.
- `TZ`: défaut `Europe/Paris`.

## Mode Sans Clé API (Recommandé)

Le workflow supporte un append via webhook Google Apps Script, sans `GOOGLE_SERVICE_ACCOUNT_JSON`.

1. Ouvrir `script.new` avec ton compte Google.
2. Coller ce code:

```javascript
const SPREADSHEET_ID = '11UiLZyDw1-UXMXXMoqRu11XDfzlW2Gu80F1D8IUo8sQ';

function doPost(e) {
  const payload = JSON.parse(e.postData.contents || '{}');
  const tabName = payload.tab_name || 'monitoring_raw';
  const headers = payload.headers || [];
  const rows = payload.rows || [];

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    sheet = ss.insertSheet(tabName);
  }

  if (sheet.getLastRow() === 0 && headers.length > 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, appended: rows.length }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. `Deploy` -> `New deployment` -> type `Web app`.
4. `Execute as`: toi-même.
5. `Who has access`: `Anyone`.
6. Copier l'URL `/exec` et la mettre en secret GitHub: `GOOGLE_SHEET_WEBHOOK_URL`.

## GitHub Actions

Workflow: `.github/workflows/daily-monitoring.yml`
- Cron quotidien
- Déclenchement manuel (`workflow_dispatch`)
- Exécute tests puis monitoring
