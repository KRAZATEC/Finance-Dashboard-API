// validators.js — reusable validation chains for each route group.
// express-validator lets us declaratively describe what we expect,
// then validate.check() in the route handles the error response.

const { body, query, param, validationResult } = require('express-validator');

// Call this at the top of any route handler to auto-respond if validation failed
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: 'Validation failed',
      details: errors.array().map(e => ({ field: e.path, message: e.msg }))
    });
  }
  next();
}

const userValidators = {
  create: [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role')
      .optional()
      .isIn(['viewer', 'analyst', 'admin'])
      .withMessage('Role must be viewer, analyst, or admin'),
  ],
  updateRole: [
    body('role')
      .isIn(['viewer', 'analyst', 'admin'])
      .withMessage('Role must be viewer, analyst, or admin'),
  ],
  updateStatus: [
    body('status')
      .isIn(['active', 'inactive'])
      .withMessage('Status must be active or inactive'),
  ],
};

const recordValidators = {
  create: [
    body('amount')
      .isFloat({ gt: 0 })
      .withMessage('Amount must be a positive number'),
    body('type')
      .isIn(['income', 'expense'])
      .withMessage('Type must be income or expense'),
    body('category')
      .trim()
      .notEmpty()
      .withMessage('Category is required'),
    body('date')
      .isISO8601()
      .withMessage('Date must be in ISO 8601 format (YYYY-MM-DD)'),
    body('notes').optional().trim(),
  ],
  update: [
    body('amount')
      .optional()
      .isFloat({ gt: 0 })
      .withMessage('Amount must be a positive number'),
    body('type')
      .optional()
      .isIn(['income', 'expense'])
      .withMessage('Type must be income or expense'),
    body('category').optional().trim().notEmpty().withMessage('Category cannot be empty'),
    body('date').optional().isISO8601().withMessage('Date must be in ISO 8601 format'),
    body('notes').optional().trim(),
  ],
  listQuery: [
    query('type').optional().isIn(['income', 'expense']),
    query('category').optional().trim(),
    query('from').optional().isISO8601().withMessage('from must be ISO date'),
    query('to').optional().isISO8601().withMessage('to must be ISO date'),
    query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be 1–100'),
  ],
};

module.exports = { validate, userValidators, recordValidators };
