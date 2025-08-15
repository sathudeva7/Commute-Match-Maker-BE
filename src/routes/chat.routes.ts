import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const chatController = new ChatController();

// All chat routes require authentication
router.use(authenticate);

// Chat management routes
router.post('/', chatController.createChat);                    // Create a new chat
router.get('/', chatController.getUserChats);                   // Get user's chats
router.get('/:chatId', chatController.getChatById);             // Get specific chat
router.put('/:chatId', chatController.updateChatInfo);          // Update chat info (group chats only)
router.delete('/:chatId', chatController.deleteChat);           // Delete/leave chat

// Message routes
router.post('/messages', chatController.sendMessage);           // Send a message
router.get('/:chatId/messages', chatController.getChatMessages); // Get chat messages
router.put('/:chatId/read', chatController.markMessagesAsRead); // Mark messages as read
router.get('/:chatId/search', chatController.searchMessages);   // Search messages in chat
router.delete('/messages/:messageId', chatController.deleteMessage); // Delete a message
router.put('/messages/:messageId', chatController.updateMessage);    // Update a message

// Participant management routes (group chats only)
router.post('/:chatId/participants', chatController.addParticipant);          // Add participant
router.delete('/:chatId/participants/:participantId', chatController.removeParticipant); // Remove participant

// Utility routes
router.get('/unread/count', chatController.getUnreadCount);      // Get total unread messages count

export default router;
