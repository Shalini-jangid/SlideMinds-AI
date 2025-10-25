const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const { errorResponse } = require('../utils/responseHandler');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return errorResponse(res, 'No token provided', 401);
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verify user still exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    req.user = {
      userId: decoded.userId,
      email: decoded.email
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return errorResponse(res, 'Invalid token', 403);
    }
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 'Token expired', 403);
    }
    return errorResponse(res, 'Authentication failed', 403);
  }
};

module.exports = { authenticateToken, JWT_SECRET };