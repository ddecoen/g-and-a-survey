const express = require("express");
const { Pool } = require("pg");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const RESULTS_PASSPHRASE = process.env.RESULTS_PASSPHRASE;

if (!RESULTS_PASSPHRASE) {
  console.error("ERROR: RESULTS_PASSPHRASE environment variable is required.");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("ERROR: DATABASE_URL environment variable is required.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function requirePassphrase(req, res, next) {
  const provided = req.headers["x-passphrase"];
  if (!provided || provided !== RESULTS_PASSPHRASE) {
    return res.status(401).json({ error: "Invalid or missing passphrase." });
  }
  next();
}

// Database setup.
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS responses (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      team TEXT NOT NULL,

      overall_value INTEGER NOT NULL,
      overall_value_comment TEXT,
      strategy_understanding INTEGER NOT NULL,
      strategy_understanding_comment TEXT,
      job_impact INTEGER NOT NULL,
      job_impact_comment TEXT,
      relationships INTEGER NOT NULL,
      relationships_comment TEXT,

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

      ga_alignment INTEGER NOT NULL,
      ga_participation INTEGER NOT NULL,
      ga_participation_comment TEXT,
      non_ga_participation INTEGER NOT NULL,
      non_ga_participation_comment TEXT,
      cross_func_collab INTEGER NOT NULL,
      cross_func_collab_comment TEXT,
      cross_func_challenges INTEGER NOT NULL,
      cross_func_challenges_comment TEXT,

      balance_rating INTEGER NOT NULL,
      strategic_tactical_rating INTEGER NOT NULL,
      pacing_rating INTEGER NOT NULL,
      social_events_value INTEGER NOT NULL,

      keep_doing TEXT,
      change_next TEXT,
      stop_doing TEXT,

      missing_topic TEXT,
      more_impactful TEXT,

      highest_impact_session TEXT,
      lowest_impact_session TEXT,

      submitted_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Submit a survey response (no auth required).
app.post("/api/responses", async (req, res) => {
  const b = req.body;

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

  const opt = (v) => v || null;

  try {
    const result = await pool.query(
      `INSERT INTO responses (
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
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
        $21,$22,$23,$24,$25,$26,$27,$28,$29,
        $30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40
      ) RETURNING id`,
      [
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
        opt(b.highest_impact_session), opt(b.lowest_impact_session),
      ]
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    console.error("Insert error:", err);
    res.status(500).json({ error: "Failed to save response." });
  }
});

// Get all responses (protected).
app.get("/api/responses", requirePassphrase, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM responses ORDER BY submitted_at DESC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load responses." });
  }
});

// Get summary stats (protected).
app.get("/api/stats", requirePassphrase, async (req, res) => {
  try {
    const totalResult = await pool.query("SELECT COUNT(*) as count FROM responses");
    const total = parseInt(totalResult.rows[0].count);

    if (total === 0) {
      return res.json({ totalResponses: 0, ratings: {}, teamBreakdown: [], sessionImpact: { highest: [], lowest: [] } });
    }

    const ratingCols = [
      "overall_value", "strategy_understanding", "job_impact", "relationships",
      "amas_rating", "strategy_sessions_rating", "team_breakouts_rating",
      "ai_sessions_rating", "social_activities_rating",
      "ga_alignment", "ga_participation", "non_ga_participation",
      "cross_func_collab", "cross_func_challenges",
      "balance_rating", "strategic_tactical_rating", "pacing_rating", "social_events_value",
    ];

    const avgSelect = ratingCols.map((c) => `ROUND(AVG(${c})::numeric, 1) as ${c}`).join(", ");
    const avgsResult = await pool.query(`SELECT ${avgSelect} FROM responses`);
    const avgs = {};
    for (const col of ratingCols) {
      avgs[col] = parseFloat(avgsResult.rows[0][col]);
    }

    const distributions = {};
    for (const col of ratingCols) {
      const distResult = await pool.query(
        `SELECT ${col} as rating, COUNT(*)::int as count FROM responses GROUP BY ${col} ORDER BY ${col}`
      );
      distributions[col] = distResult.rows;
    }

    const teamsResult = await pool.query(
      "SELECT team, COUNT(*)::int as count FROM responses GROUP BY team ORDER BY count DESC"
    );

    const highestResult = await pool.query(
      "SELECT highest_impact_session as session, COUNT(*)::int as count FROM responses WHERE highest_impact_session IS NOT NULL GROUP BY highest_impact_session ORDER BY count DESC"
    );

    const lowestResult = await pool.query(
      "SELECT lowest_impact_session as session, COUNT(*)::int as count FROM responses WHERE lowest_impact_session IS NOT NULL GROUP BY lowest_impact_session ORDER BY count DESC"
    );

    res.json({
      totalResponses: total,
      ratings: avgs,
      distributions,
      teamBreakdown: teamsResult.rows,
      sessionImpact: { highest: highestResult.rows, lowest: lowestResult.rows },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load stats." });
  }
});

// CSV export (protected).
app.get("/api/export", requirePassphrase, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM responses ORDER BY submitted_at DESC");
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to export." });
  }
});

// Start server after DB init.
initDb()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Survey app running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
