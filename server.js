const express = require("express");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const RESULTS_PASSPHRASE = process.env.RESULTS_PASSPHRASE || "ganda2026";

// Middleware to protect results endpoints with a passphrase.
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
    top_takeaway TEXT NOT NULL,
    most_valuable_session TEXT NOT NULL,
    collaboration_rating INTEGER NOT NULL,
    action_item TEXT NOT NULL,
    improve_next TEXT,
    additional_comments TEXT,
    submitted_at TEXT DEFAULT (datetime('now'))
  )
`);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Submit a survey response
app.post("/api/responses", (req, res) => {
  const {
    name,
    team,
    top_takeaway,
    most_valuable_session,
    collaboration_rating,
    action_item,
    improve_next,
    additional_comments,
  } = req.body;

  if (
    !name ||
    !team ||
    !top_takeaway ||
    !most_valuable_session ||
    !collaboration_rating ||
    !action_item
  ) {
    return res.status(400).json({ error: "Please fill in all required fields." });
  }

  const stmt = db.prepare(`
    INSERT INTO responses (name, team, top_takeaway, most_valuable_session, collaboration_rating, action_item, improve_next, additional_comments)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    name,
    team,
    top_takeaway,
    most_valuable_session,
    collaboration_rating,
    action_item,
    improve_next || null,
    additional_comments || null
  );

  res.json({ success: true, id: result.lastInsertRowid });
});

// Get all responses (for results page)
app.get("/api/responses", requirePassphrase, (req, res) => {
  const rows = db.prepare("SELECT * FROM responses ORDER BY submitted_at DESC").all();
  res.json(rows);
});

// Get summary stats
app.get("/api/stats", requirePassphrase, (req, res) => {
  const total = db.prepare("SELECT COUNT(*) as count FROM responses").get();
  const avgRating = db.prepare("SELECT AVG(collaboration_rating) as avg FROM responses").get();
  const ratingDist = db
    .prepare(
      "SELECT collaboration_rating as rating, COUNT(*) as count FROM responses GROUP BY collaboration_rating ORDER BY collaboration_rating"
    )
    .all();
  const teams = db
    .prepare("SELECT team, COUNT(*) as count FROM responses GROUP BY team ORDER BY count DESC")
    .all();
  const sessions = db
    .prepare(
      "SELECT most_valuable_session as session, COUNT(*) as count FROM responses GROUP BY most_valuable_session ORDER BY count DESC"
    )
    .all();

  res.json({
    totalResponses: total.count,
    avgCollaborationRating: avgRating.avg ? Number(avgRating.avg.toFixed(1)) : 0,
    ratingDistribution: ratingDist,
    teamBreakdown: teams,
    topSessions: sessions,
  });
});

// CSV export
app.get("/api/export", requirePassphrase, (req, res) => {
  const rows = db.prepare("SELECT * FROM responses ORDER BY submitted_at DESC").all();
  const headers = [
    "id",
    "name",
    "team",
    "top_takeaway",
    "most_valuable_session",
    "collaboration_rating",
    "action_item",
    "improve_next",
    "additional_comments",
    "submitted_at",
  ];

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
