# G&A Offsite Survey — Santa Cruz, May 2026

A lightweight survey app for capturing feedback from the G&A team offsite. Respondents fill out a 25-question form covering overall impact, session effectiveness, collaboration, format, and forward-looking suggestions. Results are viewable on a passphrase-protected dashboard with charts and CSV export.

## Features

- **Survey form** — open to anyone with the link, no login required
- **Results dashboard** — average ratings by section, bar charts for session impact and team breakdown, and all open-text responses
- **CSV export** — one-click download for deeper analysis in Sheets/Excel
- **Passphrase protection** — results and export endpoints require a passphrase; the survey form stays open

## Survey structure

| Section | Questions | Type |
|---------|-----------|------|
| 1. Overall Impact | Q1-Q4: value, strategy understanding, job impact, relationships | 1-5 rating + optional comment |
| 2. Session Effectiveness | Q5-Q9: AMAs, strategy/scaling, breakouts, AI/skill-building, social | 1-5 rating + optional comment |
| 3. Collaboration & Alignment | Q10-Q14: G&A alignment, G&A participation, non-G&A participation, cross-functional collab, cross-functional challenges | 1-5 rating + optional comment |
| 4. Format & Structure | Q15-Q18: balance, strategic vs. tactical, pacing, social events value | 1-5 rating |
| 5. Keep / Change / Stop | Q19-Q21 | Open text |
| 6. Forward-Looking | Q22-Q23: missing topics, next offsite improvements | Open text |
| Optional | Q24-Q25: highest/lowest impact session type | Select one |

## Running locally

```bash
npm install
RESULTS_PASSPHRASE=yourpassphrase node server.js
```

Open http://localhost:3000 for the survey and http://localhost:3000/results.html for the dashboard.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No (default: `3000`) | Server port |
| `RESULTS_PASSPHRASE` | **Yes** | Passphrase required to view results and export CSV. The server will not start without it. |

## Deploying to Render

1. Create a **New Web Service** at [render.com](https://render.com) and connect this repo.
2. **Build command:** `npm install`
3. **Start command:** `node server.js`
4. Set `RESULTS_PASSPHRASE` in the environment variables.
5. Deploy and share the URL.

> **Note:** Render's free tier uses ephemeral disk, so the SQLite database resets on service restart. For multi-day collection, use the Starter tier ($7/mo) which includes persistent disk.

## Tech stack

- Node.js + Express
- SQLite via better-sqlite3
- Vanilla HTML/CSS/JS (no build step)
