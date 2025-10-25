const User = require('../models/userModel');
const { successResponse, errorResponse } = require('../utils/responseHandler');

const saveApiKey = async (req, res) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey || apiKey.trim().length === 0) {
      return errorResponse(res, 'API key is required', 400);
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { apiKey: apiKey.trim(), updatedAt: new Date() },
      { new: true }
    );

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, null, 'API key saved successfully');

  } catch (error) {
    console.error('Save API key error:', error);
    return errorResponse(res, 'Failed to save API key', 500);
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-apiKey');

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    return errorResponse(res, 'Failed to get profile', 500);
  }
};

module.exports = { saveApiKey, getProfile };