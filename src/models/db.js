// db.js — initializes an in-memory SQLite database using sql.js (pure JS, no native bindings needed)
// All tables are created here with proper constraints and indexes.

const initSqlJs = require('sql.js');

let db = null;

async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();
  db = new SQL.Database();

  db.run(`PRAGMA journal_mode = WAL;`);
  db.run(`PRAGMA foreign_keys = ON;`);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      email       TEXT NOT NULL UNIQUE,
      password    TEXT NOT NULL,
      role        TEXT NOT NULL CHECK(role IN ('viewer','analyst','admin')),
      status      TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS records (
      id          TEXT PRIMARY KEY,
      amount      REAL NOT NULL CHECK(amount > 0),
      type        TEXT NOT NULL CHECK(type IN ('income','expense')),
      category    TEXT NOT NULL,
      date        TEXT NOT NULL,
      notes       TEXT,
      deleted_at  TEXT,
      created_by  TEXT NOT NULL REFERENCES users(id),
      updated_by  TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT
    );
  `);

  // An index on date and type helps the dashboard summary queries run faster
  db.run(`CREATE INDEX IF NOT EXISTS idx_records_date     ON records(date);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_records_type     ON records(type);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_records_category ON records(category);`);

  return db;
}

// A thin wrapper so callers don't have to deal with the sql.js result format directly.
// Returns an array of plain objects for SELECT queries.
function query(db, sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// For INSERT / UPDATE / DELETE — returns the count of changed rows.
function run(db, sql, params = []) {
  db.run(sql, params);
  // sql.js doesn't expose changes() directly; read it via pragma
  const result = query(db, `SELECT changes() AS changed`);
  return result[0]?.changed ?? 0;
}

module.exports = { getDb, query, run };
