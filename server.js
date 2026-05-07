const express = require("express");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const RESULTS_PASSPHRASE = process.env.RESULTS_PASSPHRASE;

if (!RESULTS_PASSPHRASE) {
  console.error("ERROR: RESULTS_PASSPHRASE environment variable is required.");
  process.exit(1);
}

function requirePassphrase(req, res, next) {
  const provided = req.headers["x-passphrase"];
  if (!provided || provided !== RESULTS_PASSPHRASE) {
    return res.status(401).json({ error: "Invalid or missing passphrase." });
  }
  next();
}

// Database setup
const db = new Database(path.join(__dirname, "survey.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    team TEXT NOT NULL,

    -- Section 1: Overall Impact
    overall_value INTEGER NOT NULL,
    overall_value_comment TEXT,
    strategy_understanding INTEGER NOT NULL,
    strategy_understanding_comment TEXT,
    job_impact INTEGER NOT NULL,
    job_impact_comment TEXT,
    relationships INTEGER NOT NULL,
    relationships_comment TEXT,

    -- Section 2: Session Effectiveness
    amas_rating INTEGER NOT NULL,
    amas_comment TEXT,
    strategy_sessions_rating INTEGER NOT NULL,
    strategy_sessions_comment TEXT,
    team_breakouts_rating INTEGER NOT NULL,
    team_breakouts_comment TEXT,
    ai_sessions_rating INTEGER NOT NULL,
    ai_sessions_comment TEXT,
    social_activities_rating INTEGER NOT NULL,
    social_activities_comment TEXT,

    -- Section 3: Collaboration & Alignment
    ga_alignment INTEGER NOT NULL,
    ga_participation INTEGER NOT NULL,
    ga_participation_comment TEXT,
    non_ga_participation INTEGER NOT NULL,
    non_ga_participation_comment TEXT,
    cross_func_collab INTEGER NOT NULL,
    cross_func_collab_comment TEXT,
    cross_func_challenges INTEGER NOT NULL,
    cross_func_challenges_comment TEXT,

    -- Section 4: Format & Structure
    balance_rating INTEGER NOT NULL,
    strategic_tactical_rating INTEGER NOT NULL,
    pacing_rating INTEGER NOT NULL,
    social_events_value INTEGER NOT NULL,

    -- Section 5: Keep / Change / Stop
    keep_doing TEXT,
    change_next TEXT,
    stop_doing TEXT,

    -- Section 6: Forward-Looking
    missing_topic TEXT,
    more_impactful TEXT,

    -- Optional Add-On
    highest_impact_session TEXT,
    lowest_impact_session TEXT,

    submitted_at TEXT DEFAULT (datetime('now'))
  )
`);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Submit a survey response (no auth required).
app.post("/api/responses", (req, res) => {
  const b = req.body;

  // Validate all required rating fields are present.
  const requiredRatings = [
    "overall_value", "strategy_understanding", "job_impact", "relationships",
    "amas_rating", "strategy_sessions_rating", "team_breakouts_rating",
    "ai_sessions_rating", "social_activities_rating",
    "ga_alignment", "ga_participation", "non_ga_participation",
    "cross_func_collab", "cross_func_challenges",
    "balance_rating", "strategic_tactical_rating", "pacing_rating", "social_events_value",
  ];

  if (!b.name || !b.team) {
    return res.status(400).json({ error: "Name and team are required." });
  }

  for (const field of requiredRatings) {
    const val = b[field];
    if (val == null || val < 1 || val > 5) {
      return res.status(400).json({ error: `Rating "${field}" is required (1-5).` });
    }
  }

  const stmt = db.prepare(`
    INSERT INTO responses (
      name, team,
      overall_value, overall_value_comment,
      strategy_understanding, strategy_understanding_comment,
      job_impact, job_impact_comment,
      relationships, relationships_comment,
      amas_rating, amas_comment,
      strategy_sessions_rating, strategy_sessions_comment,
      team_breakouts_rating, team_breakouts_comment,
      ai_sessions_rating, ai_sessions_comment,
      social_activities_rating, social_activities_comment,
      ga_alignment, ga_participation, ga_participation_comment,
      non_ga_participation, non_ga_participation_comment,
      cross_func_collab, cross_func_collab_comment,
      cross_func_challenges, cross_func_challenges_comment,
      balance_rating, strategic_tactical_rating, pacing_rating, social_events_value,
      keep_doing, change_next, stop_doing,
      missing_topic, more_impactful,
      highest_impact_session, lowest_impact_session
    ) VALUES (
      ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?,
      ?, ?
    )
  `);

  const opt = (v) => v || null;

  const result = stmt.run(
    b.name, b.team,
    b.overall_value, opt(b.overall_value_comment),
    b.strategy_understanding, opt(b.strategy_understanding_comment),
    b.job_impact, opt(b.job_impact_comment),
    b.relationships, opt(b.relationships_comment),
    b.amas_rating, opt(b.amas_comment),
    b.strategy_sessions_rating, opt(b.strategy_sessions_comment),
    b.team_breakouts_rating, opt(b.team_breakouts_comment),
    b.ai_sessions_rating, opt(b.ai_sessions_comment),
    b.social_activities_rating, opt(b.social_activities_comment),
    b.ga_alignment, b.ga_participation, opt(b.ga_participation_comment),
    b.non_ga_participation, opt(b.non_ga_participation_comment),
    b.cross_func_collab, opt(b.cross_func_collab_comment),
    b.cross_func_challenges, opt(b.cross_func_challenges_comment),
    b.balance_rating, b.strategic_tactical_rating, b.pacing_rating, b.social_events_value,
    opt(b.keep_doing), opt(b.change_next), opt(b.stop_doing),
    opt(b.missing_topic), opt(b.more_impactful),
    opt(b.highest_impact_session), opt(b.lowest_impact_session)
  );

  res.json({ success: true, id: result.lastInsertRowid });
});

// Get all responses (protected).
app.get("/api/responses", requirePassphrase, (req, res) => {
  const rows = db.prepare("SELECT * FROM responses ORDER BY submitted_at DESC").all();
  res.json(rows);
});

// Get summary stats (protected).
app.get("/api/stats", requirePassphrase, (req, res) => {
  const total = db.prepare("SELECT COUNT(*) as count FROM responses").get();

  if (total.count === 0) {
    return res.json({ totalResponses: 0, ratings: {}, teamBreakdown: [], sessionImpact: { highest: [], lowest: [] } });
  }

  // Average for every rating column.
  const ratingCols = [
    "overall_value", "strategy_understanding", "job_impact", "relationships",
    "amas_rating", "strategy_sessions_rating", "team_breakouts_rating",
    "ai_sessions_rating", "social_activities_rating",
    "ga_alignment", "ga_participation", "non_ga_participation",
    "cross_func_collab", "cross_func_challenges",
    "balance_rating", "strategic_tactical_rating", "pacing_rating", "social_events_value",
  ];

  const avgSelect = ratingCols.map((c) => `ROUND(AVG(${c}), 1) as ${c}`).join(", ");
  const avgs = db.prepare(`SELECT ${avgSelect} FROM responses`).get();

  // Distribution for each rating column.
  const distributions = {};
  for (const col of ratingCols) {
    distributions[col] = db
      .prepare(`SELECT ${col} as rating, COUNT(*) as count FROM responses GROUP BY ${col} ORDER BY ${col}`)
      .all();
  }

  const teams = db
    .prepare("SELECT team, COUNT(*) as count FROM responses GROUP BY team ORDER BY count DESC")
    .all();

  const highest = db
    .prepare("SELECT highest_impact_session as session, COUNT(*) as count FROM responses WHERE highest_impact_session IS NOT NULL GROUP BY highest_impact_session ORDER BY count DESC")
    .all();

  const lowest = db
    .prepare("SELECT lowest_impact_session as session, COUNT(*) as count FROM responses WHERE lowest_impact_session IS NOT NULL GROUP BY lowest_impact_session ORDER BY count DESC")
    .all();

  res.json({
    totalResponses: total.count,
    ratings: avgs,
    distributions,
    teamBreakdown: teams,
    sessionImpact: { highest, lowest },
  });
});

// CSV export (protected).
app.get("/api/export", requirePassphrase, (req, res) => {
  const rows = db.prepare("SELECT * FROM responses ORDER BY submitted_at DESC").all();
  if (rows.length === 0) {
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=ga-offsite-survey-results.csv");
    return res.send("No responses yet.");
  }

  const headers = Object.keys(rows[0]);
  const csvRows = [headers.join(",")];
  for (const row of rows) {
    const values = headers.map((h) => {
      const val = row[h] == null ? "" : String(row[h]);
      return `"${val.replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(","));
  }

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=ga-offsite-survey-results.csv");
  res.send(csvRows.join("\n"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Survey app running at http://localhost:${PORT}`);
});
