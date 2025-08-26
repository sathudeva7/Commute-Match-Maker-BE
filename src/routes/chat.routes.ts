import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const chatController = new ChatController();

// All chat routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/chat:
 *   post:
 *     summary: Create a new chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - participantId
 *             properties:
 *               participantId:
 *                 type: string
 *                 description: ID of the other user for direct chats (current user ID is automatically added from auth token)
 *                 example: "user2_id"
 *               chatType:
 *                 type: string
 *                 enum: [direct, group]
 *                 default: direct
 *                 description: Type of chat to create
 *               title:
 *                 type: string
 *                 description: Chat name (required for group chats)
 *               description:
 *                 type: string
 *                 description: Chat description (optional)
 *           examples:
 *             direct_chat:
 *               summary: Create a direct chat
 *               value:
 *                 participantId: "user2_id"
 *                 chatType: "direct"
 *             group_chat:
 *               summary: Create a group chat
 *               value:
 *                 participantIds: ["user2_id", "user3_id"]
 *                 chatType: "group"
 *                 title: "My Group Chat"
 *                 description: "A group chat for our team"
 *     responses:
 *       201:
 *         description: Chat created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/', chatController.createChat);

/**
 * @swagger
 * /api/chat:
 *   get:
 *     summary: Get user's chats
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *         description: Number of chats per page
 *     responses:
 *       200:
 *         description: Chats retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/', chatController.getUserChats);

/**
 * @swagger
 * /api/chat/{chatId}:
 *   get:
 *     summary: Get specific chat by ID
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat ID
 *     responses:
 *       200:
 *         description: Chat retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied to this chat
 *       404:
 *         description: Chat not found
 *       500:
 *         description: Internal server error
 */
router.get('/:chatId', chatController.getChatById);

/**
 * @swagger
 * /api/chat/{chatId}:
 *   put:
 *     summary: Update chat info (group chats only)
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: New chat name
 *               description:
 *                 type: string
 *                 description: Chat description
 *     responses:
 *       200:
 *         description: Chat updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied or not allowed for private chats
 *       404:
 *         description: Chat not found
 *       500:
 *         description: Internal server error
 */
router.put('/:chatId', chatController.updateChatInfo);

/**
 * @swagger
 * /api/chat/{chatId}:
 *   delete:
 *     summary: Delete or leave chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat ID
 *     responses:
 *       200:
 *         description: Chat deleted or left successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Chat not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:chatId', chatController.deleteChat);

/**
 * @swagger
 * /api/chat/messages:
 *   post:
 *     summary: Send a message
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - chatId
 *               - content
 *             properties:
 *               chatId:
 *                 type: string
 *                 description: ID of the chat to send message to
 *               content:
 *                 type: string
 *                 description: Message content
 *               messageType:
 *                 type: string
 *                 enum: [text, image, file]
 *                 default: text
 *     responses:
 *       201:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied to this chat
 *       404:
 *         description: Chat not found
 *       500:
 *         description: Internal server error
 */
router.post('/messages', chatController.sendMessage);

/**
 * @swagger
 * /api/chat/{chatId}/messages:
 *   get:
 *     summary: Get chat messages
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Messages per page
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Get messages before this timestamp
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied to this chat
 *       404:
 *         description: Chat not found
 *       500:
 *         description: Internal server error
 */
router.get('/:chatId/messages', chatController.getChatMessages);

/**
 * @swagger
 * /api/chat/{chatId}/read:
 *   put:
 *     summary: Mark messages as read
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               messageId:
 *                 type: string
 *                 description: Specific message ID to mark as read (optional)
 *     responses:
 *       200:
 *         description: Messages marked as read successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied to this chat
 *       404:
 *         description: Chat not found
 *       500:
 *         description: Internal server error
 */
router.put('/:chatId/read', chatController.markMessagesAsRead);

/**
 * @swagger
 * /api/chat/{chatId}/search:
 *   get:
 *     summary: Search messages in chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat ID
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied to this chat
 *       404:
 *         description: Chat not found
 *       500:
 *         description: Internal server error
 */
router.get('/:chatId/search', chatController.searchMessages);

/**
 * @swagger
 * /api/chat/messages/{messageId}:
 *   delete:
 *     summary: Delete a message
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Can only delete own messages
 *       404:
 *         description: Message not found
 *       500:
 *         description: Internal server error
 */
router.delete('/messages/:messageId', chatController.deleteMessage);

/**
 * @swagger
 * /api/chat/messages/{messageId}:
 *   put:
 *     summary: Update a message
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: Updated message content
 *     responses:
 *       200:
 *         description: Message updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Can only update own messages
 *       404:
 *         description: Message not found
 *       500:
 *         description: Internal server error
 */
router.put('/messages/:messageId', chatController.updateMessage);

/**
 * @swagger
 * /api/chat/{chatId}/participants:
 *   post:
 *     summary: Add participant to group chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID of user to add to the chat
 *     responses:
 *       200:
 *         description: Participant added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: User already in chat or validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only group chat admins can add participants
 *       404:
 *         description: Chat or user not found
 *       500:
 *         description: Internal server error
 */
router.post('/:chatId/participants', chatController.addParticipant);

/**
 * @swagger
 * /api/chat/{chatId}/participants/{participantId}:
 *   delete:
 *     summary: Remove participant from group chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat ID
 *       - in: path
 *         name: participantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Participant ID to remove
 *     responses:
 *       200:
 *         description: Participant removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only group chat admins can remove participants
 *       404:
 *         description: Chat or participant not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:chatId/participants/:participantId', chatController.removeParticipant);

/**
 * @swagger
 * /api/chat/unread/count:
 *   get:
 *     summary: Get total unread messages count
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     result:
 *                       type: object
 *                       properties:
 *                         unreadCount:
 *                           type: integer
 *                           description: Total number of unread messages
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/unread/count', chatController.getUnreadCount);

export default router;
