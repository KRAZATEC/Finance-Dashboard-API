const express = require('express');
const router  = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/dashboardController');

router.use(authenticate);

// Viewers can see the summary; analysts and admins get full analytics access.
// This tiered approach lets you give viewers a lightweight overview without
// exposing detailed category breakdowns or trend data.

/**
 * @openapi
 * /api/dashboard/summary:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get overall financial summary
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Summary totals
 */
router.get('/summary',    ctrl.getSummary);

/**
 * @openapi
 * /api/dashboard/categories:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get category breakdown (Analyst+)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Category totals
 */
router.get('/categories', requireRole('analyst'), ctrl.getCategoryBreakdown);

/**
 * @openapi
 * /api/dashboard/trends/monthly:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get monthly trends (Analyst+)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: months
 *         schema: { type: integer, default: 12 }
 *     responses:
 *       200:
 *         description: Monthly data
 */
router.get('/trends/monthly', requireRole('analyst'), ctrl.getMonthlyTrends);

/**
 * @openapi
 * /api/dashboard/trends/weekly:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get weekly trends (Analyst+)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: weeks
 *         schema: { type: integer, default: 8 }
 *     responses:
 *       200:
 *         description: Weekly data
 */
router.get('/trends/weekly',  requireRole('analyst'), ctrl.getWeeklyTrends);

/**
 * @openapi
 * /api/dashboard/recent:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get recent activity
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of recent records
 */
router.get('/recent',    ctrl.getRecentActivity);

module.exports = router;
