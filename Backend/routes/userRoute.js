const express = require('express');
const router = express.Router();
const { saveApiKey, getProfile } = require('../controllers/userController');
const { authenticateToken } = require('../middlewares/authMiddleware');

// POST /api/user/api-key
router.post('/api-key', authenticateToken, saveApiKey);

// GET /api/user/profile
router.get('/profile', authenticateToken, getProfile);

module.exports = router;
