# G&A Offsite Survey — Santa Cruz, May 2026

A lightweight survey app for capturing takeaways from the G&A team offsite. Respondents fill out a simple form; results are viewable on a passphrase-protected dashboard with charts and CSV export.

## Features

- **Survey form** — open to anyone with the link, no login required
- **Results dashboard** — summary stats, bar charts (rating distribution, top sessions, team breakdown), and individual response cards
- **CSV export** — one-click download for deeper analysis in Sheets/Excel
- **Passphrase protection** — results and export endpoints require a passphrase; the survey form stays open

## Survey questions

| # | Question | Type |
|---|----------|------|
| 1 | Your Name | Text (required) |
| 2 | Team / Function | Select: People, Finance, Accounting, IT, Recruiting (required) |
| 3 | #1 takeaway from the offsite | Free text (required) |
| 4 | Most valuable session | Select grouped by day (required) |
| 5 | Collaboration rating | 1–5 scale (required) |
| 6 | Action item to bring back to your team | Free text (required) |
| 7 | What to improve for next offsite | Free text (optional) |
| 8 | Anything else to share | Free text (optional) |

### Sessions covered

**Day 1:** People and Finance at Scale, UK Expansion, Team Dinner  
**Day 2:** Functional Roadmaps, Volunteer Event, Team Dinner

## Running locally

```bash
npm install
node server.js
```

Open http://localhost:3000 for the survey and http://localhost:3000/results.html for the dashboard.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `RESULTS_PASSPHRASE` | `ganda2026` | Passphrase required to view results and export CSV |

## Deploying to Render

1. Create a **New Web Service** at [render.com](https://render.com) and connect this repo.
2. **Build command:** `npm install`
3. **Start command:** `node server.js`
4. Optionally set `RESULTS_PASSPHRASE` in the environment variables.
5. Deploy and share the URL.

> **Note:** Render's free tier uses ephemeral disk, so the SQLite database resets on service restart. For multi-day collection, use the Starter tier ($7/mo) which includes persistent disk.

## Tech stack

- Node.js + Express
- SQLite via better-sqlite3
- Vanilla HTML/CSS/JS (no build step)
