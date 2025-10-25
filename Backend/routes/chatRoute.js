const express = require('express');
const router = express.Router();
const {
  getChatHistory,
  saveChat,
  deleteChat,
  getSingleChat
} = require('../controllers/chatController');
const { authenticateToken } = require('../middlewares/authMiddleware');

// GET /api/chat - Get all chats
router.get('/', authenticateToken, getChatHistory);

// GET /api/chat/:chatId - Get single chat
router.get('/:chatId', authenticateToken, getSingleChat);

// POST /api/chat/save - Save/update chat
router.post('/save', authenticateToken, saveChat);

// DELETE /api/chat/:chatId - Delete chat
router.delete('/:chatId', authenticateToken, deleteChat);

module.exports = router;