# Finance Dashboard API

A RESTful backend for a role-based financial management system. Built with Node.js, Express, and SQLite (via sql.js — no native build tools required).

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Roles and Permissions](#roles-and-permissions)
- [API Reference](#api-reference)
  - [Auth](#auth)
  - [Users](#users)
  - [Records](#records)
  - [Dashboard](#dashboard)
- [Design Decisions](#design-decisions)
- [Assumptions](#assumptions)
- [Running Tests](#running-tests)
- [Live Demo](#live-demo)
- [API Documentation](#api-documentation)

---

## Live Demo

> [!TIP]
> **Live Demo URL:** [https://your-api-service.onrender.com](https://your-api-service.onrender.com) (Placeholder)


For a full, step-by-step walkthrough, see the **[Deployment Guide](./DEPLOYING.md)**.

## API Documentation

This project uses **Swagger UI** to provide interactive documentation. Once the server is running, you can explore and test the API at:

**[http://localhost:3000/api-docs](http://localhost:3000/api-docs)**

If you have deployed the API, replace `localhost:3000` with your live service URL.

---

## Tech Stack

| Layer        | Choice          | Why                                                                 |
|--------------|-----------------|---------------------------------------------------------------------|
| Runtime      | Node.js v18+    | Widely supported, async-first                                       |
| Framework    | Express 4       | Minimal, well-understood, easy to structure                         |
| Database     | sql.js (SQLite) | Zero native dependencies — runs anywhere without compiler setup     |
| Auth         | JWT (jsonwebtoken) | Stateless, easy to verify on every request                       |
| Validation   | express-validator | Declarative, chainable, integrates cleanly with Express           |
| Password hashing | bcryptjs    | Pure-JS bcrypt, no native bindings needed                           |
| Testing      | Jest + Supertest | Industry standard for Node API testing                             |

---

## Project Structure

```
finance-dashboard/
├── src/
│   ├── app.js                  # Express app setup (middleware, routes)
│   ├── server.js               # HTTP server entry point
│   ├── models/
│   │   └── db.js               # SQLite initialization, query helpers
│   ├── controllers/
│   │   ├── authController.js   # Registration, login
│   │   ├── userController.js   # User management
│   │   ├── recordsController.js # Financial records CRUD
│   │   └── dashboardController.js # Analytics/summary endpoints
│   ├── middleware/
│   │   ├── auth.js             # JWT verification, role guard
│   │   ├── validators.js       # Input validation chains
│   │   └── errorHandler.js     # Global error handler
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── records.js
│   │   └── dashboard.js
│   └── utils/
│       └── seed.js             # Demo data seeder
└── tests/
    ├── helpers.js              # Shared test setup utilities
    ├── auth.test.js
    ├── users.test.js
    ├── records.test.js
    └── dashboard.test.js
```

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Seed demo data
node src/utils/seed.js

# 3. Start the server
node src/server.js
# or for auto-reload during development:
npx nodemon src/server.js
```

The server starts on **http://localhost:3000** by default.

**Demo credentials (after seeding):**

| Role    | Email                | Password     |
|---------|----------------------|--------------|
| Admin   | admin@example.com    | admin123     |
| Analyst | analyst@example.com  | analyst123   |
| Viewer  | viewer@example.com   | viewer123    |

---

## Environment Variables

| Variable     | Default                                  | Description              |
|--------------|------------------------------------------|--------------------------|
| `PORT`       | `3000`                                   | HTTP server port         |
| `JWT_SECRET` | `finance-dashboard-secret-change-in-prod` | Secret for signing JWTs |
| `NODE_ENV`   | `development`                            | Suppresses logs in tests |

---

## Roles and Permissions

| Action                          | Viewer | Analyst | Admin |
|---------------------------------|--------|---------|-------|
| Login / Register                | ✅     | ✅      | ✅    |
| View own profile                | ✅     | ✅      | ✅    |
| List all users                  | ❌     | ❌      | ✅    |
| Create/manage users             | ❌     | ❌      | ✅    |
| Change user role / status       | ❌     | ❌      | ✅    |
| View financial records          | ✅     | ✅      | ✅    |
| Create / update / delete records| ❌     | ❌      | ✅    |
| Dashboard summary               | ✅     | ✅      | ✅    |
| Category breakdown              | ❌     | ✅      | ✅    |
| Monthly / weekly trends         | ❌     | ✅      | ✅    |
| Recent activity                 | ✅     | ✅      | ✅    |

Role enforcement is implemented via the `requireRole()` middleware in `src/middleware/auth.js`. It uses a numeric level system — a user passes if their level is greater than or equal to the minimum required level, so an admin automatically satisfies any `requireRole('analyst')` check.

---

## API Reference

All authenticated routes require:
```
Authorization: Bearer <token>
```

### Auth

#### `POST /api/auth/register`
Create a new user account. Role defaults to `viewer`.

**Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "secure123",
  "role": "viewer"
}
```

**Response `201`:**
```json
{
  "message": "Account created successfully.",
  "user": { "id": "...", "name": "Jane Smith", "email": "jane@example.com", "role": "viewer" }
}
```

---

#### `POST /api/auth/login`
Authenticate and receive a JWT.

**Body:**
```json
{ "email": "jane@example.com", "password": "secure123" }
```

**Response `200`:**
```json
{
  "token": "<jwt>",
  "user": { "id": "...", "name": "Jane Smith", "email": "jane@example.com", "role": "viewer" }
}
```

---

### Users

#### `GET /api/users` — Admin only
Returns a list of all users.

#### `GET /api/users/:id`
Returns a single user. Non-admins can only request their own ID.

#### `POST /api/users` — Admin only
Creates a user directly (bypasses the public registration route).

#### `PATCH /api/users/:id/role` — Admin only
**Body:** `{ "role": "analyst" }`

#### `PATCH /api/users/:id/status` — Admin only
**Body:** `{ "status": "inactive" }`

---

### Records

#### `GET /api/records`
List financial records with optional filters and pagination.

**Query params:**

| Param      | Type   | Description                            |
|------------|--------|----------------------------------------|
| `type`     | string | `income` or `expense`                  |
| `category` | string | Partial match (case-insensitive)       |
| `from`     | date   | ISO 8601 start date                    |
| `to`       | date   | ISO 8601 end date                      |
| `page`     | int    | Page number (default: 1)               |
| `limit`    | int    | Records per page (default: 20, max: 100)|

**Response:**
```json
{
  "data": [ { "id": "...", "amount": 1500, "type": "income", ... } ],
  "pagination": { "total": 42, "page": 1, "limit": 20, "pages": 3 }
}
```

#### `GET /api/records/:id`
Single record by ID.

#### `POST /api/records` — Admin only
```json
{
  "amount": 1500.00,
  "type": "income",
  "category": "Salary",
  "date": "2024-03-01",
  "notes": "Optional description"
}
```

#### `PATCH /api/records/:id` — Admin only
All fields are optional; only supplied fields are updated.

#### `DELETE /api/records/:id` — Admin only
Soft delete — sets `deleted_at` timestamp rather than removing the row.

---

### Dashboard

#### `GET /api/dashboard/summary`
Total income, total expenses, net balance, and record count across all non-deleted records.

```json
{
  "total_income": 12500.00,
  "total_expenses": 4800.00,
  "net_balance": 7700.00,
  "record_count": 47
}
```

#### `GET /api/dashboard/categories` — Analyst+
Income and expense totals grouped by category.

```json
{
  "income":  [ { "category": "Salary", "total": 9000, "count": 3 } ],
  "expense": [ { "category": "Rent",   "total": 3600, "count": 3 } ]
}
```

#### `GET /api/dashboard/trends/monthly?months=12` — Analyst+
Monthly aggregated income, expenses, and net for the last N months (max 24).

#### `GET /api/dashboard/trends/weekly?weeks=8` — Analyst+
Weekly aggregated data for the last N weeks (max 52).

#### `GET /api/dashboard/recent?limit=10`
The most recently created records, joined with the creator's name.

---

## Design Decisions

**Why sql.js instead of better-sqlite3?**
`better-sqlite3` is faster but requires compiling a native `.node` module. `sql.js` is pure WebAssembly and works without any system build tools — making it much easier to get running across different machines without the typical `node-gyp` headaches. In a production deployment you'd swap it for `better-sqlite3` or PostgreSQL.

**Why soft deletes?**
Deleting a financial record permanently would break any audit trail or reporting that references it. Soft deletes let us exclude records from all normal queries while keeping the data intact for potential recovery or historical analysis.

**Why is the database in-memory?**
For the scope of this project, in-memory is simpler to set up and keeps the focus on the API logic and data model rather than database configuration. The data model and query patterns are identical to what you'd use with a file-backed SQLite database — swapping to persistent storage would be a one-line change in `db.js`.

**Role hierarchy vs. explicit role lists**
The `requireRole()` guard uses a numeric level map (`viewer=0, analyst=1, admin=2`). This means you call `requireRole('analyst')` and it passes for both analysts and admins without listing both roles explicitly. It's cleaner and less error-prone than maintaining a list everywhere.

**Separation of auth and user management**
Public registration goes through `/api/auth/register`. Admin-created users go through `POST /api/users`. This mirrors a common real-world pattern where users can self-register but admins can also provision accounts directly.

---

## Assumptions

1. **Single organisation** — there's no multi-tenancy. All users share access to all records within the system.
2. **Amounts are always positive** — the `type` field (`income`/`expense`) communicates direction. Negative amounts are rejected.
3. **Dates are stored as strings** in `YYYY-MM-DD` format and compared lexicographically. This works correctly for ISO dates.
4. **JWT expiry is 8 hours** — long enough for a working day, short enough to limit exposure if a token leaks.
5. **No email verification** — registration is immediate. In production you'd want to add an email confirmation step.

---

## Running Tests

```bash
npm test
```

Tests use an in-memory database that's wiped and re-seeded before each test suite, so they're fully isolated and can run in any order.

**Coverage:**
- 4 test suites, 41 tests
- Auth (register, login, validation)
- User management (CRUD, role/status changes, access control)
- Records (CRUD, filtering, soft delete, role enforcement)
- Dashboard (summary, categories, trends, recent activity)
