// seed.js — populates the database with realistic demo data so you can
// start testing immediately without having to create everything by hand.
// Run with: node src/utils/seed.js

const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const { getDb, run, query } = require('../models/db');

const CATEGORIES = ['Salary', 'Freelance', 'Rent', 'Groceries', 'Utilities', 'Transport', 'Healthcare', 'Entertainment', 'Insurance', 'Other'];

function randomBetween(min, max) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

function randomDate(daysBack) {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
  return d.toISOString().split('T')[0];
}

async function seed() {
  const db = await getDb();

  console.log('Seeding users...');

  const users = [
    { name: 'Alice Admin',   email: 'admin@example.com',   role: 'admin',   password: 'admin123' },
    { name: 'Ana Analyst',   email: 'analyst@example.com', role: 'analyst', password: 'analyst123' },
    { name: 'Victor Viewer', email: 'viewer@example.com',  role: 'viewer',  password: 'viewer123' },
  ];

  const userIds = [];

  for (const u of users) {
    const existing = query(db, `SELECT id FROM users WHERE email = ?`, [u.email]);
    if (existing.length > 0) {
      console.log(`  Skipping ${u.email} (already exists)`);
      userIds.push(existing[0].id);
      continue;
    }
    const id = uuid();
    const hashed = await bcrypt.hash(u.password, 10);
    run(db, `INSERT INTO users (id, name, email, password, role) VALUES (?,?,?,?,?)`,
      [id, u.name, u.email, hashed, u.role]);
    userIds.push(id);
    console.log(`  Created ${u.role}: ${u.email} / ${u.password}`);
  }

  const adminId = userIds[0];

  console.log('\nSeeding financial records...');

  const incomeCategories  = ['Salary', 'Freelance', 'Other'];
  const expenseCategories = ['Rent', 'Groceries', 'Utilities', 'Transport', 'Healthcare', 'Entertainment', 'Insurance'];

  let created = 0;
  for (let i = 0; i < 60; i++) {
    const isIncome = Math.random() > 0.45;
    const type     = isIncome ? 'income' : 'expense';
    const cats     = isIncome ? incomeCategories : expenseCategories;
    const category = cats[Math.floor(Math.random() * cats.length)];
    const amount   = isIncome ? randomBetween(500, 5000) : randomBetween(20, 800);
    const date     = randomDate(180);
    const id       = uuid();

    run(db, `
      INSERT INTO records (id, amount, type, category, date, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [id, amount, type, category, date, adminId]);
    created++;
  }

  console.log(`  Created ${created} records.`);
  console.log('\nSeed complete. You can now start the server and log in with the credentials above.');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
