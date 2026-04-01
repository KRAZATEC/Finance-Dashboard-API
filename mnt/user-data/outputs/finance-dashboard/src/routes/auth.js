const express = require('express');
const router  = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validators');
const { register, login } = require('../controllers/authController');

// POST /api/auth/register
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['viewer', 'analyst', 'admin']),
  validate
], register);

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  validate
], login);

module.exports = router;
