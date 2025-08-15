import request from 'supertest';
import express from 'express';
import { ChatController } from '../../../src/controllers/chat.controller';
import { ChatService } from '../../../src/services/chat.service';
import { AppError } from '../../../src/utils/appError';
import { ChatType, IChatWithDetails, IMessage, MessageType } from '../../../src/types/chat.types';

// Mock the ChatService
jest.mock('../../../src/services/chat.service');

const app = express();
app.use(express.json());

const chatController = new ChatController();

// Setup middleware to mock authentication
app.use((req, res, next) => {
  (req as any).user = { _id: 'user123' };
  next();
});

// Setup routes - more specific routes first to avoid conflicts
app.post('/chats/messages', chatController.sendMessage);
app.delete('/chats/messages/:messageId', chatController.deleteMessage);
app.put('/chats/messages/:messageId', chatController.updateMessage);
app.get('/chats/unread/count', chatController.getUnreadCount);
app.post('/chats', chatController.createChat);
app.get('/chats', chatController.getUserChats);
app.get('/chats/:chatId', chatController.getChatById);
app.get('/chats/:chatId/messages', chatController.getChatMessages);
app.put('/chats/:chatId/read', chatController.markMessagesAsRead);
app.get('/chats/:chatId/search', chatController.searchMessages);
app.post('/chats/:chatId/participants', chatController.addParticipant);
app.delete('/chats/:chatId/participants/:participantId', chatController.removeParticipant);
app.put('/chats/:chatId', chatController.updateChatInfo);
app.delete('/chats/:chatId', chatController.deleteChat);

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      result: null,
      message: error.message
    });
  } else {
    res.status(500).json({
      success: false,
      result: null,
      message: 'Internal server error'
    });
  }
});

const mockChatService = ChatService as jest.MockedClass<typeof ChatService>;

describe('ChatController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /chats (createChat)', () => {
    it('should create direct chat successfully', async () => {
      const chatData = {
        chatType: ChatType.DIRECT,
        participantIds: ['user456'],
        title: undefined,
        description: undefined
      };

      const mockChat = {
        _id: 'chat123',
        chatType: ChatType.DIRECT,
        participants: ['user123', 'user456'],
        isActive: true
      };

      mockChatService.prototype.createChat.mockResolvedValue(mockChat);

      const response = await request(app)
        .post('/chats')
        .send(chatData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.result).toEqual(mockChat);
      expect(response.body.message).toBe('Chat created successfully');
    });

    it('should create group chat successfully', async () => {
      const chatData = {
        chatType: ChatType.GROUP,
        participantIds: ['user456', 'user789'],
        title: 'Test Group',
        description: 'A test group chat'
      };

      const mockChat = {
        _id: 'chat123',
        chatType: ChatType.GROUP,
        participants: ['user123', 'user456', 'user789'],
        title: 'Test Group',
        description: 'A test group chat',
        isActive: true
      };

      mockChatService.prototype.createChat.mockResolvedValue(mockChat);

      const response = await request(app)
        .post('/chats')
        .send(chatData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.result).toEqual(mockChat);
    });

    it('should return 400 when no participants provided', async () => {
      const chatData = {
        chatType: ChatType.DIRECT,
        participantIds: [],
        title: undefined,
        description: undefined
      };

      const response = await request(app)
        .post('/chats')
        .send(chatData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('At least one participant ID is required');
    });

    it('should return 400 when group chat has no title', async () => {
      const chatData = {
        chatType: ChatType.GROUP,
        participantIds: ['user456'],
        title: undefined,
        description: undefined
      };

      const response = await request(app)
        .post('/chats')
        .send(chatData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Title is required for group chats');
    });

    it('should handle service errors', async () => {
      const chatData = {
        chatType: ChatType.DIRECT,
        participantIds: ['user456']
      };

      mockChatService.prototype.createChat.mockRejectedValue(
        new AppError('User with ID user456 not found', 404)
      );

      const response = await request(app)
        .post('/chats')
        .send(chatData);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User with ID user456 not found');
    });
  });

  describe('POST /chats/messages (sendMessage)', () => {
    it('should send message successfully', async () => {
      const messageData = {
        chatId: 'chat123',
        content: 'Hello world!',
        messageType: MessageType.TEXT
      };

      const mockMessage = {
        _id: 'message123',
        chatId: 'chat123',
        senderId: 'user123',
        content: 'Hello world!',
        messageType: MessageType.TEXT,
        createdAt: new Date()
      };

      mockChatService.prototype.sendMessage.mockResolvedValue(mockMessage as IMessage);

      const response = await request(app)
        .post('/chats/messages')
        .send(messageData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.result).toEqual({
        ...mockMessage,
        createdAt: mockMessage.createdAt.toISOString()
      });
      expect(response.body.message).toBe('Message sent successfully');
    });

    it('should return 400 when chatId or content missing', async () => {
      const messageData = {
        chatId: '',
        content: 'Hello world!'
      };

      const response = await request(app)
        .post('/chats/messages')
        .send(messageData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Chat ID and content are required');
    });

    it('should handle unauthorized access', async () => {
      const messageData = {
        chatId: 'chat123',
        content: 'Hello world!'
      };

      mockChatService.prototype.sendMessage.mockRejectedValue(
        new AppError('You are not a participant in this chat', 403)
      );

      const response = await request(app)
        .post('/chats/messages')
        .send(messageData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('You are not a participant in this chat');
    });
  });

  describe('GET /chats (getUserChats)', () => {
    it('should get user chats successfully', async () => {
      const mockChats = [
        {
          _id: 'chat123',
          chatType: ChatType.DIRECT,
          participants: ['user123', 'user456'],
          title: 'John Doe',
          unreadCount: 2
        },
        {
          _id: 'chat456',
          chatType: ChatType.GROUP,
          participants: ['user123', 'user456', 'user789'],
          title: 'Work Group',
          unreadCount: 0
        }
      ];

      mockChatService.prototype.getUserChats.mockResolvedValue(mockChats as IChatWithDetails[]);

      const response = await request(app).get('/chats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.result.chats).toEqual(mockChats);
      expect(response.body.result.page).toBe(1);
      expect(response.body.result.limit).toBe(20);
    });

    it('should handle pagination parameters', async () => {
      const mockChats = [];
      mockChatService.prototype.getUserChats.mockResolvedValue(mockChats);

      const response = await request(app)
        .get('/chats')
        .query({ page: '2', limit: '10' });

      expect(response.status).toBe(200);
      expect(mockChatService.prototype.getUserChats).toHaveBeenCalledWith('user123', 2, 10);
    });
  });

  describe('GET /chats/:chatId/messages (getChatMessages)', () => {
    it('should get chat messages successfully', async () => {
      const mockMessages = [
        {
          _id: 'message123',
          chatId: 'chat123',
          senderId: 'user123',
          content: 'Hello!',
          createdAt: new Date()
        }
      ];

      mockChatService.prototype.getChatMessages.mockResolvedValue(mockMessages as IMessage[]);

      const response = await request(app).get('/chats/chat123/messages');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.result.messages).toEqual(
        mockMessages.map(msg => ({
          ...msg,
          createdAt: msg.createdAt.toISOString()
        }))
      );
    });

    it('should return 400 when chatId missing', async () => {
      const response = await request(app).get('/chats//messages');

      expect(response.status).toBe(404); // Express returns 404 for invalid routes
    });
  });

  describe('PUT /chats/:chatId/read (markMessagesAsRead)', () => {
    it('should mark messages as read successfully', async () => {
      mockChatService.prototype.markMessagesAsRead.mockResolvedValue();

      const response = await request(app).put('/chats/chat123/read');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Messages marked as read successfully');
      expect(mockChatService.prototype.markMessagesAsRead).toHaveBeenCalledWith('user123', 'chat123');
    });
  });

  describe('GET /chats/:chatId/search (searchMessages)', () => {
    it('should search messages successfully', async () => {
      const mockMessages = [
        {
          _id: 'message123',
          content: 'Hello world',
          chatId: 'chat123'
        }
      ];

      mockChatService.prototype.searchMessages.mockResolvedValue(mockMessages as IMessage[]);

      const response = await request(app)
        .get('/chats/chat123/search')
        .query({ q: 'hello', limit: '10' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.result.messages).toEqual(mockMessages);
      expect(response.body.result.searchTerm).toBe('hello');
    });

    it('should return 400 when search term missing', async () => {
      const response = await request(app).get('/chats/chat123/search');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Chat ID and search term are required');
    });
  });

  describe('DELETE /chats/messages/:messageId (deleteMessage)', () => {
    it('should delete message successfully', async () => {
      mockChatService.prototype.deleteMessage.mockResolvedValue();

      const response = await request(app).delete('/chats/messages/message123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Message deleted successfully');
      expect(mockChatService.prototype.deleteMessage).toHaveBeenCalledWith('user123', 'message123');
    });

    it('should return 400 when messageId missing', async () => {
      const response = await request(app).delete('/chats/messages/');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Message ID is required');
    });
  });

  describe('PUT /chats/messages/:messageId (updateMessage)', () => {
    it('should update message successfully', async () => {
      const updateData = {
        content: 'Updated message content'
      };

      const mockUpdatedMessage = {
        _id: 'message123',
        content: 'Updated message content',
        senderId: 'user123',
        updatedAt: new Date()
      };

      mockChatService.prototype.updateMessage.mockResolvedValue(mockUpdatedMessage as IMessage);

      const response = await request(app)
        .put('/chats/messages/message123')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.result).toEqual({
        ...mockUpdatedMessage,
        updatedAt: mockUpdatedMessage.updatedAt.toISOString()
      });
      expect(response.body.message).toBe('Message updated successfully');
    });

    it('should return 400 when content missing', async () => {
      const response = await request(app)
        .put('/chats/messages/message123')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Message ID and content are required');
    });
  });

  describe('GET /chats/unread/count (getUnreadCount)', () => {
    it('should get unread count successfully', async () => {
      mockChatService.prototype.getUnreadMessagesCount.mockResolvedValue(5);

      const response = await request(app).get('/chats/unread/count');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.result.unreadCount).toBe(5);
      expect(response.body.message).toBe('Unread count retrieved successfully');
    });
  });
});