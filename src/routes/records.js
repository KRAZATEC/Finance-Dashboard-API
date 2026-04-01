const express = require('express');
const router  = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { validate, recordValidators } = require('../middleware/validators');
const ctrl = require('../controllers/recordsController');

router.use(authenticate);

/**
 * @openapi
 * /api/records:
 *   get:
 *     tags: [Records]
 *     summary: List financial records
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [income, expense] }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *     responses:
 *       200:
 *         description: Paginated list of records
 */
router.get('/',    recordValidators.listQuery, validate, ctrl.listRecords);

/**
 * @openapi
 * /api/records/{id}:
 *   get:
 *     tags: [Records]
 *     summary: Get a single record
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Record details
 */
router.get('/:id', ctrl.getRecord);

/**
 * @openapi
 * /api/records:
 *   post:
 *     tags: [Records]
 *     summary: Create a new record (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, type, category, date]
 *             properties:
 *               amount: { type: number, minimum: 0 }
 *               type: { type: string, enum: [income, expense] }
 *               category: { type: string }
 *               date: { type: string, format: date }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Record created
 */
router.post('/',    requireRole('admin'), recordValidators.create, validate, ctrl.createRecord);

/**
 * @openapi
 * /api/records/{id}:
 *   patch:
 *     tags: [Records]
 *     summary: Update a record (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount: { type: number, minimum: 0 }
 *               type: { type: string, enum: [income, expense] }
 *               category: { type: string }
 *               date: { type: string, format: date }
 *               notes: { type: string }
 *     responses:
 *       200:
 *         description: Record updated
 */
router.patch('/:id', requireRole('admin'), recordValidators.update, validate, ctrl.updateRecord);

/**
 * @openapi
 * /api/records/{id}:
 *   delete:
 *     tags: [Records]
 *     summary: Soft delete a record (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Record deleted
 */
router.delete('/:id', requireRole('admin'), ctrl.deleteRecord);

module.exports = router;
