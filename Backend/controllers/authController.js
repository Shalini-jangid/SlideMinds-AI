const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middlewares/authMiddleware');
const { successResponse, errorResponse } = require('../utils/responseHandler');

const register = async (req, res) => {
  try {
    const { email, name } = req.body;

    // Validation
    if (!email || !name) {
      return errorResponse(res, 'Email and name are required', 400);
    }

    // Email validation
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return errorResponse(res, 'Invalid email format', 400);
    }

    // Check if user exists
    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Create new user
      user = new User({
        email: email.toLowerCase(),
        name: name.trim()
      });
      await user.save();
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return successResponse(res, {
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      }
    }, 'Registration successful');

  } catch (error) {
    console.error('Register error:', error);
    return errorResponse(res, 'Registration failed', 500);
  }
};

module.exports = { register };