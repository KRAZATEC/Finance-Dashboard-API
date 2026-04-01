// recordsController.js — CRUD for financial records.
// Soft delete is used instead of hard delete so we don't lose audit history.
// Admins can manage records; analysts and viewers can only read.

const { v4: uuid } = require('uuid');
const { getDb, query, run } = require('../models/db');

async function listRecords(req, res) {
  const db = await getDb();
  const { type, category, from, to, page = 1, limit = 20 } = req.query;

  let sql = `SELECT * FROM records WHERE deleted_at IS NULL`;
  const params = [];

  if (type) {
    sql += ` AND type = ?`;
    params.push(type);
  }
  if (category) {
    sql += ` AND category LIKE ?`;
    params.push(`%${category}%`);
  }
  if (from) {
    sql += ` AND date >= ?`;
    params.push(from);
  }
  if (to) {
    sql += ` AND date <= ?`;
    params.push(to);
  }

  // Count before pagination so the client knows total pages
  const countRows = query(db, `SELECT COUNT(*) AS total FROM (${sql})`, params);
  const total = countRows[0]?.total ?? 0;

  const offset = (Number(page) - 1) * Number(limit);
  sql += ` ORDER BY date DESC, created_at DESC LIMIT ? OFFSET ?`;
  params.push(Number(limit), offset);

  const records = query(db, sql, params);

  return res.json({
    data: records,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit))
    }
  });
}

async function getRecord(req, res) {
  const db = await getDb();
  const { id } = req.params;

  const rows = query(db, `SELECT * FROM records WHERE id = ? AND deleted_at IS NULL`, [id]);
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Record not found.' });
  }

  return res.json(rows[0]);
}

async function createRecord(req, res) {
  const db = await getDb();
  const { amount, type, category, date, notes } = req.body;
  const id = uuid();

  run(db, `
    INSERT INTO records (id, amount, type, category, date, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [id, amount, type, category, date, notes || null, req.user.id]);

  const [record] = query(db, `SELECT * FROM records WHERE id = ?`, [id]);
  return res.status(201).json(record);
}

async function updateRecord(req, res) {
  const db = await getDb();
  const { id } = req.params;

  const rows = query(db, `SELECT * FROM records WHERE id = ? AND deleted_at IS NULL`, [id]);
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Record not found.' });
  }

  const existing = rows[0];
  const amount   = req.body.amount   ?? existing.amount;
  const type     = req.body.type     ?? existing.type;
  const category = req.body.category ?? existing.category;
  const date     = req.body.date     ?? existing.date;
  const notes    = req.body.notes    !== undefined ? req.body.notes : existing.notes;

  run(db, `
    UPDATE records
    SET amount = ?, type = ?, category = ?, date = ?, notes = ?,
        updated_by = ?, updated_at = datetime('now')
    WHERE id = ?
  `, [amount, type, category, date, notes, req.user.id, id]);

  const [updated] = query(db, `SELECT * FROM records WHERE id = ?`, [id]);
  return res.json(updated);
}

async function deleteRecord(req, res) {
  const db = await getDb();
  const { id } = req.params;

  const rows = query(db, `SELECT id FROM records WHERE id = ? AND deleted_at IS NULL`, [id]);
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Record not found.' });
  }

  // Soft delete — we keep the row but stamp deleted_at
  run(db, `UPDATE records SET deleted_at = datetime('now') WHERE id = ?`, [id]);
  return res.json({ message: 'Record deleted.' });
}

module.exports = { listRecords, getRecord, createRecord, updateRecord, deleteRecord };
