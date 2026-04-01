// dashboardController.js — aggregated analytics endpoints.
// These are the data that a frontend dashboard would need to draw charts and cards.
// Everything is calculated with SQL aggregations rather than pulling rows into JS —
// faster and less memory hungry.

const { getDb, query } = require('../models/db');

async function getSummary(req, res) {
  const db = await getDb();

  const totals = query(db, `
    SELECT
      SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END) AS total_income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total_expenses,
      COUNT(*) AS record_count
    FROM records
    WHERE deleted_at IS NULL
  `)[0];

  const income   = totals.total_income   ?? 0;
  const expenses = totals.total_expenses ?? 0;

  return res.json({
    total_income:   income,
    total_expenses: expenses,
    net_balance:    income - expenses,
    record_count:   totals.record_count ?? 0
  });
}

async function getCategoryBreakdown(req, res) {
  const db = await getDb();

  // One row per (type, category) combination — handy for grouped bar or pie charts
  const rows = query(db, `
    SELECT
      type,
      category,
      SUM(amount) AS total,
      COUNT(*)    AS count
    FROM records
    WHERE deleted_at IS NULL
    GROUP BY type, category
    ORDER BY type, total DESC
  `);

  // Group the flat rows into { income: [...], expense: [...] } so the frontend gets
  // two ready-made arrays rather than having to filter itself.
  const breakdown = { income: [], expense: [] };
  for (const row of rows) {
    breakdown[row.type]?.push({ category: row.category, total: row.total, count: row.count });
  }

  return res.json(breakdown);
}

async function getMonthlyTrends(req, res) {
  const db = await getDb();

  // Pull the last 12 months by default. Caller can pass ?months=N to override.
  const months = Math.min(parseInt(req.query.months) || 12, 24);

  const rows = query(db, `
    SELECT
      strftime('%Y-%m', date) AS month,
      SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END) AS income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expenses
    FROM records
    WHERE deleted_at IS NULL
      AND date >= date('now', '-' || ? || ' months')
    GROUP BY month
    ORDER BY month ASC
  `, [months]);

  return res.json(rows.map(r => ({
    month:    r.month,
    income:   r.income   ?? 0,
    expenses: r.expenses ?? 0,
    net:      (r.income ?? 0) - (r.expenses ?? 0)
  })));
}

async function getWeeklyTrends(req, res) {
  const db = await getDb();

  // Last 8 weeks by default
  const weeks = Math.min(parseInt(req.query.weeks) || 8, 52);

  const rows = query(db, `
    SELECT
      strftime('%Y-W%W', date) AS week,
      SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END) AS income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expenses
    FROM records
    WHERE deleted_at IS NULL
      AND date >= date('now', '-' || ? || ' days')
    GROUP BY week
    ORDER BY week ASC
  `, [weeks * 7]);

  return res.json(rows.map(r => ({
    week:     r.week,
    income:   r.income   ?? 0,
    expenses: r.expenses ?? 0,
    net:      (r.income ?? 0) - (r.expenses ?? 0)
  })));
}

async function getRecentActivity(req, res) {
  const db = await getDb();
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);

  const rows = query(db, `
    SELECT r.*, u.name AS created_by_name
    FROM records r
    LEFT JOIN users u ON r.created_by = u.id
    WHERE r.deleted_at IS NULL
    ORDER BY r.created_at DESC
    LIMIT ?
  `, [limit]);

  return res.json(rows);
}

module.exports = { getSummary, getCategoryBreakdown, getMonthlyTrends, getWeeklyTrends, getRecentActivity };
