// app.js — Express app setup.
// Kept intentionally thin: middleware registration, route mounting, error handler.
// All business logic lives in controllers and services, not here.

const express    = require('express');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const swaggerUi  = require('swagger-ui-express');
const swaggerSpec = require('./utils/swagger');

const authRoutes      = require('./routes/auth');
const userRoutes      = require('./routes/users');
const recordRoutes    = require('./routes/records');
const dashboardRoutes = require('./routes/dashboard');
const errorHandler    = require('./middleware/errorHandler');

const app = express();

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json());

// ── Request logging (skip in test runs to keep output clean) ─────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Rate limiting — gentle limit to discourage brute-force on auth endpoints ──
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down and try again in a bit.' }
});
app.use(limiter);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ── API Documentation ──────────────────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ── Redirects ──────────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.redirect('/api-docs'));
app.get('/docs', (req, res) => res.redirect('/api-docs'));

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/users',     userRoutes);
app.use('/api/records',   recordRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ── 404 for anything unrecognised ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
