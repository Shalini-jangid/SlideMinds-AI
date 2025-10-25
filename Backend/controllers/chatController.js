const Chat = require('../models/chatModel');
const { successResponse, errorResponse } = require('../utils/responseHandler');

const getChatHistory = async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.user.userId })
      .sort({ updatedAt: -1 })
      .limit(50)
      .select('-__v');

    const formattedChats = chats.map(chat => ({
      chatId: chat.chatId,
      title: chat.title,
      messages: chat.messages,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt
    }));

    return successResponse(res, { chats: formattedChats });

  } catch (error) {
    console.error('Get chat history error:', error);
    return errorResponse(res, 'Failed to retrieve chat history', 500);
  }
};

const saveChat = async (req, res) => {
  try {
    const { chatId, title, messages } = req.body;

    // Validation
    if (!chatId || !title) {
      return errorResponse(res, 'ChatId and title are required', 400);
    }

    const chatData = {
      userId: req.user.userId,
      chatId,
      title,
      messages: messages || [],
      updatedAt: new Date()
    };

    const chat = await Chat.findOneAndUpdate(
      { chatId, userId: req.user.userId },
      chatData,
      { upsert: true, new: true }
    );

    return successResponse(res, { chat }, 'Chat saved successfully');

  } catch (error) {
    console.error('Save chat error:', error);
    return errorResponse(res, 'Failed to save chat', 500);
  }
};

const deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params;

    const result = await Chat.findOneAndDelete({
      chatId,
      userId: req.user.userId
    });

    if (!result) {
      return errorResponse(res, 'Chat not found', 404);
    }

    return successResponse(res, null, 'Chat deleted successfully');

  } catch (error) {
    console.error('Delete chat error:', error);
    return errorResponse(res, 'Failed to delete chat', 500);
  }
};

const getSingleChat = async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findOne({
      chatId,
      userId: req.user.userId
    }).select('-__v');

    if (!chat) {
      return errorResponse(res, 'Chat not found', 404);
    }

    return successResponse(res, { chat });

  } catch (error) {
    console.error('Get single chat error:', error);
    return errorResponse(res, 'Failed to retrieve chat', 500);
  }
};

module.exports = {
  getChatHistory,
  saveChat,
  deleteChat,
  getSingleChat
};