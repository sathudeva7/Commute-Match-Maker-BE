import { MessageRepository } from '../../../src/repositories/message.repository';
import { Message } from '../../../src/models/Message';
import { MessageType, MessageStatus } from '../../../src/types/chat.types';

// Mock Mongoose model
jest.mock('../../../src/models/Message');

const mockMessage = Message as jest.MockedClass<typeof Message>;

describe('MessageRepository', () => {
  let messageRepository: MessageRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    messageRepository = new MessageRepository();
  });

  describe('create', () => {
    const messageData = {
      chatId: 'chat123',
      senderId: 'user123',
      receiverId: 'user456',
      content: 'Hello world!',
      messageType: MessageType.TEXT,
      status: MessageStatus.SENT,
      fileUrl: undefined,
      fileName: undefined,
      replyToMessageId: undefined
    };

    it('should create message successfully', async () => {
      const mockCreatedMessage = {
        _id: 'message123',
        ...messageData,
        save: jest.fn().mockResolvedValue(true)
      };

      mockMessage.mockImplementation(() => mockCreatedMessage as any);

      const result = await messageRepository.create(messageData);

      expect(mockMessage).toHaveBeenCalledWith(messageData);
      expect(mockCreatedMessage.save).toHaveBeenCalled();
      expect(result).toEqual(mockCreatedMessage);
    });

    it('should handle database errors during creation', async () => {
      const mockCreatedMessage = {
        save: jest.fn().mockRejectedValue(new Error('Database error'))
      };

      mockMessage.mockImplementation(() => mockCreatedMessage as any);

      await expect(messageRepository.create(messageData))
        .rejects
        .toThrow('Database error');
    });
  });

  describe('findById', () => {
    it('should find message by ID successfully', async () => {
      const mockFoundMessage = {
        _id: 'message123',
        chatId: 'chat123',
        senderId: 'user123',
        content: 'Hello world!',
        messageType: MessageType.TEXT
      };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockFoundMessage)
      };

      mockMessage.findById = jest.fn().mockReturnValue(mockQuery);

      const result = await messageRepository.findById('message123');

      expect(mockMessage.findById).toHaveBeenCalledWith('message123');
      expect(mockQuery.populate).toHaveBeenCalledWith([
        { path: 'sender', select: 'full_name profile_image_url email' },
        { path: 'receiver', select: 'full_name profile_image_url email' },
        { path: 'replyToMessage', select: 'content senderId messageType createdAt' }
      ]);
      expect(result).toEqual(mockFoundMessage);
    });

    it('should return null when message not found', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null)
      };

      mockMessage.findById = jest.fn().mockReturnValue(mockQuery);

      const result = await messageRepository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findChatMessages', () => {
    it('should find chat messages with default pagination', async () => {
      const mockMessages = [
        {
          _id: 'message1',
          chatId: 'chat123',
          content: 'Hello!',
          createdAt: new Date()
        },
        {
          _id: 'message2',
          chatId: 'chat123',
          content: 'Hi there!',
          createdAt: new Date()
        }
      ];

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockMessages)
      };

      mockMessage.find = jest.fn().mockReturnValue(mockQuery);

      const result = await messageRepository.findChatMessages('chat123');

      expect(mockMessage.find).toHaveBeenCalledWith({
        chatId: 'chat123'
      });
      expect(mockQuery.populate).toHaveBeenCalledWith([
        { path: 'sender', select: 'full_name profile_image_url email' },
        { path: 'receiver', select: 'full_name profile_image_url email' },
        { path: 'replyToMessage', select: 'content senderId messageType createdAt' }
      ]);
      expect(mockQuery.limit).toHaveBeenCalledWith(50);
      expect(mockQuery.skip).toHaveBeenCalledWith(0);
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual(mockMessages);
    });

    it('should find chat messages with custom pagination', async () => {
      const mockMessages = [];

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockMessages)
      };

      mockMessage.find = jest.fn().mockReturnValue(mockQuery);

      const result = await messageRepository.findChatMessages('chat123', 2, 20);

      expect(mockQuery.limit).toHaveBeenCalledWith(20);
      expect(mockQuery.skip).toHaveBeenCalledWith(20); // (page - 1) * limit
      expect(result).toEqual(mockMessages);
    });
  });

  describe('updateMessage', () => {
    const updateData = {
      content: 'Updated message content'
    };

    it('should update message successfully', async () => {
      const mockUpdatedMessage = {
        _id: 'message123',
        content: 'Updated message content',
        updatedAt: new Date()
      };

      mockMessage.findByIdAndUpdate = jest.fn().mockResolvedValue(mockUpdatedMessage);

      const result = await messageRepository.updateMessage('message123', updateData);

      expect(mockMessage.findByIdAndUpdate).toHaveBeenCalledWith(
        'message123',
        { ...updateData, updatedAt: expect.any(Date) },
        { new: true, runValidators: true }
      );
      expect(result).toEqual(mockUpdatedMessage);
    });

    it('should return null when message not found', async () => {
      mockMessage.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

      const result = await messageRepository.updateMessage('nonexistent', updateData);

      expect(result).toBeNull();
    });
  });

  describe('deleteMessage', () => {
    it('should delete message successfully', async () => {
      mockMessage.findByIdAndDelete = jest.fn().mockResolvedValue({ _id: 'message123' });

      const result = await messageRepository.deleteMessage('message123');

      expect(mockMessage.findByIdAndDelete).toHaveBeenCalledWith('message123');
      expect(result).toBe(true);
    });

    it('should return null when message not found', async () => {
      mockMessage.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

      const result = await messageRepository.deleteMessage('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('markChatMessagesAsRead', () => {
    it('should mark chat messages as read for user', async () => {
      mockMessage.updateMany = jest.fn().mockResolvedValue({ modifiedCount: 5 });

      await messageRepository.markChatMessagesAsRead('chat123', 'user456');

      expect(mockMessage.updateMany).toHaveBeenCalledWith(
        {
          chatId: 'chat123',
          senderId: { $ne: 'user456' },
          status: { $ne: MessageStatus.READ },
          'readBy.userId': { $ne: 'user456' }
        },
        {
          status: MessageStatus.READ,
          $addToSet: {
            readBy: {
              userId: 'user456',
              readAt: expect.any(Date)
            }
          },
          updatedAt: expect.any(Date)
        }
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark specific message as read by user', async () => {
      const mockUpdatedMessage = {
        _id: 'message123',
        readBy: [
          { userId: 'user456', readAt: new Date() }
        ]
      };

      mockMessage.findByIdAndUpdate = jest.fn().mockResolvedValue(mockUpdatedMessage);

      const result = await messageRepository.markAsRead('message123', 'user456');

      expect(mockMessage.findByIdAndUpdate).toHaveBeenCalledWith(
        'message123',
        {
          status: MessageStatus.READ,
          $addToSet: {
            readBy: {
              userId: 'user456',
              readAt: expect.any(Date)
            }
          },
          updatedAt: expect.any(Date)
        },
        { new: true }
      );
      expect(result).toEqual(mockUpdatedMessage);
    });
  });

  describe('updateMessageStatus', () => {
    it('should update message status successfully', async () => {
      const mockUpdatedMessage = {
        _id: 'message123',
        status: MessageStatus.DELIVERED
      };

      mockMessage.findByIdAndUpdate = jest.fn().mockResolvedValue(mockUpdatedMessage);

      const result = await messageRepository.updateMessageStatus('message123', MessageStatus.DELIVERED);

      expect(mockMessage.findByIdAndUpdate).toHaveBeenCalledWith(
        'message123',
        { status: MessageStatus.DELIVERED },
        { new: true }
      );
      expect(result).toEqual(mockUpdatedMessage);
    });
  });

  describe('getUnreadMessagesCount', () => {
    it('should get unread messages count for chat and user', async () => {
      mockMessage.countDocuments = jest.fn().mockResolvedValue(3);

      const result = await messageRepository.getUnreadMessagesCount('chat123', 'user456');

      expect(mockMessage.countDocuments).toHaveBeenCalledWith({
        chatId: 'chat123',
        senderId: { $ne: 'user456' },
        status: { $ne: MessageStatus.READ },
        'readBy.userId': { $ne: 'user456' }
      });
      expect(result).toBe(3);
    });
  });

  describe('getUserUnreadMessagesCount', () => {
    it('should get total unread messages count for user across all chats', async () => {
      mockMessage.countDocuments = jest.fn().mockResolvedValue(15);

      const result = await messageRepository.getUserUnreadMessagesCount('user456');

      expect(mockMessage.countDocuments).toHaveBeenCalledWith({
        receiverId: 'user456',
        status: { $ne: MessageStatus.READ },
        'readBy.userId': { $ne: 'user456' }
      });
      expect(result).toBe(15);
    });
  });

  describe('searchMessages', () => {
    it('should search messages in chat with default limit', async () => {
      const searchTerm = 'hello';
      const mockMessages = [
        {
          _id: 'message1',
          content: 'Hello world!',
          chatId: 'chat123'
        },
        {
          _id: 'message2',
          content: 'Say hello to everyone',
          chatId: 'chat123'
        }
      ];

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockMessages)
      };

      mockMessage.find = jest.fn().mockReturnValue(mockQuery);

      const result = await messageRepository.searchMessages('chat123', searchTerm);

      expect(mockMessage.find).toHaveBeenCalledWith({
        chatId: 'chat123',
        content: { $regex: searchTerm, $options: 'i' }
      });
      expect(mockQuery.populate).toHaveBeenCalledWith([
        { path: 'sender', select: 'full_name profile_image_url email' },
        { path: 'receiver', select: 'full_name profile_image_url email' }
      ]);
      expect(mockQuery.limit).toHaveBeenCalledWith(20);
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual(mockMessages);
    });

    it('should search messages with custom limit', async () => {
      const searchTerm = 'test';
      const mockMessages = [];

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockMessages)
      };

      mockMessage.find = jest.fn().mockReturnValue(mockQuery);

      const result = await messageRepository.searchMessages('chat123', searchTerm, 50);

      expect(mockQuery.limit).toHaveBeenCalledWith(50);
      expect(result).toEqual(mockMessages);
    });
  });

  describe('findUserMessages', () => {
    it('should find messages for specific user', async () => {
      const mockMessages = [
        {
          _id: 'message1',
          senderId: 'user123',
          content: 'Message from user123'
        },
        {
          _id: 'message2',
          receiverId: 'user123',
          content: 'Message to user123'
        }
      ];

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockMessages)
      };

      mockMessage.find = jest.fn().mockReturnValue(mockQuery);

      const result = await messageRepository.findUserMessages('user123');

      expect(mockMessage.find).toHaveBeenCalledWith({
        $or: [
          { senderId: 'user123' },
          { receiverId: 'user123' }
        ]
      });
      expect(mockQuery.limit).toHaveBeenCalledWith(50);
      expect(mockQuery.skip).toHaveBeenCalledWith(0);
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual(mockMessages);
    });

    it('should find messages by user with pagination', async () => {
      const mockMessages = [];

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockMessages)
      };

      mockMessage.find = jest.fn().mockReturnValue(mockQuery);

      const result = await messageRepository.findUserMessages('user123', 2, 20);

      expect(mockQuery.limit).toHaveBeenCalledWith(20);
      expect(mockQuery.skip).toHaveBeenCalledWith(20);
      expect(result).toEqual(mockMessages);
    });
  });






});