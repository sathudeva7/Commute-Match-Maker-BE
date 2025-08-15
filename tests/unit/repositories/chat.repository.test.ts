import Chat from '../../../src/models/Chat';
import { ChatRepository } from '../../../src/repositories/chat.repository';


import { ChatType } from '../../../src/types/chat.types';

// Mock Mongoose model
jest.mock('../../../src/models/Chat');

const mockChat = Chat as jest.MockedClass<typeof Chat>;

describe('ChatRepository', () => {
  let chatRepository: ChatRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    chatRepository = new ChatRepository();
  });

  describe('create', () => {
    const chatData = {
      chatType: ChatType.DIRECT,
      participants: ['user123', 'user456'],
      title: undefined,
      description: undefined,
      adminIds: undefined,
      isActive: true
    };

    it('should create chat successfully', async () => {
      const mockCreatedChat = {
        _id: 'chat123',
        ...chatData,
        save: jest.fn()
      };

      // The save method should return the chat object itself
      mockCreatedChat.save.mockResolvedValue(mockCreatedChat);

      mockChat.mockImplementation(() => mockCreatedChat as any);

      const result = await chatRepository.create(chatData);

      expect(mockChat).toHaveBeenCalledWith(chatData);
      expect(mockCreatedChat.save).toHaveBeenCalled();
      expect(result).toEqual(mockCreatedChat);
    });

    it('should handle database errors during creation', async () => {
      const mockCreatedChat = {
        save: jest.fn().mockRejectedValue(new Error('Database error'))
      };

      mockChat.mockImplementation(() => mockCreatedChat as any);

      await expect(chatRepository.create(chatData))
        .rejects
        .toThrow('Database error');
    });
  });

  describe('findById', () => {
    it('should find chat by ID successfully', async () => {
      const mockFoundChat = {
        _id: 'chat123',
        chatType: ChatType.DIRECT,
        participants: ['user123', 'user456'],
        isActive: true
      };

      const mockQuery = {
        populate: jest.fn().mockReturnThis()
      };

      // Mock the chained populate calls
      mockQuery.populate
        .mockReturnValueOnce(mockQuery) // First populate call returns query
        .mockReturnValueOnce(mockQuery) // Second populate call returns query
        .mockResolvedValueOnce(mockFoundChat); // Final populate resolves with data

      mockChat.findById = jest.fn().mockReturnValue(mockQuery);

      const result = await chatRepository.findById('chat123');

      expect(mockChat.findById).toHaveBeenCalledWith('chat123');
      expect(mockQuery.populate).toHaveBeenCalledWith('participantDetails');
      expect(mockQuery.populate).toHaveBeenCalledWith('adminDetails');
      expect(mockQuery.populate).toHaveBeenCalledWith('lastMessageSender');
      expect(result).toEqual(mockFoundChat);
    });

    it('should return null when chat not found', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis()
      };

      mockQuery.populate
        .mockReturnValueOnce(mockQuery)
        .mockReturnValueOnce(mockQuery)
        .mockResolvedValueOnce(null);

      mockChat.findById = jest.fn().mockReturnValue(mockQuery);

      const result = await chatRepository.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis()
      };

      mockQuery.populate
        .mockReturnValueOnce(mockQuery)
        .mockReturnValueOnce(mockQuery)
        .mockRejectedValueOnce(new Error('Database connection failed'));

      mockChat.findById = jest.fn().mockReturnValue(mockQuery);

      await expect(chatRepository.findById('chat123'))
        .rejects
        .toThrow('Database connection failed');
    });
  });

  describe('findUserChats', () => {
    it('should find user chats with default pagination', async () => {
      const mockChats = [
        {
          _id: 'chat123',
          chatType: ChatType.DIRECT,
          participants: ['user123', 'user456'],
          participantDetails: [
            { _id: 'user123', full_name: 'John Doe' },
            { _id: 'user456', full_name: 'Jane Doe' }
          ]
        },
        {
          _id: 'chat456',
          chatType: ChatType.GROUP,
          participants: ['user123', 'user789'],
          title: 'Work Group'
        }
      ];

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockChats)
      };

      mockChat.find = jest.fn().mockReturnValue(mockQuery);

      const result = await chatRepository.findUserChats('user123');

      expect(mockChat.find).toHaveBeenCalledWith({
        participants: 'user123',
        isActive: true
      });
      expect(mockQuery.populate).toHaveBeenCalledWith('participantDetails');
      expect(mockQuery.populate).toHaveBeenCalledWith('adminDetails');
      expect(mockQuery.populate).toHaveBeenCalledWith('lastMessageSender');
      expect(mockQuery.sort).toHaveBeenCalledWith({ 'lastMessage.timestamp': -1, updatedAt: -1 });
      expect(mockQuery.skip).toHaveBeenCalledWith(0);
      expect(mockQuery.limit).toHaveBeenCalledWith(20);
      expect(result).toEqual(mockChats);
    });

    it('should find user chats with custom pagination', async () => {
      const mockChats = [];

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockChats)
      };

      mockChat.find = jest.fn().mockReturnValue(mockQuery);

      const result = await chatRepository.findUserChats('user123', 2, 10);

      expect(mockQuery.populate).toHaveBeenCalledWith('participantDetails');
      expect(mockQuery.populate).toHaveBeenCalledWith('adminDetails');
      expect(mockQuery.populate).toHaveBeenCalledWith('lastMessageSender');
      expect(mockQuery.sort).toHaveBeenCalledWith({ 'lastMessage.timestamp': -1, updatedAt: -1 });
      expect(mockQuery.skip).toHaveBeenCalledWith(10); // (page - 1) * limit
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
      expect(result).toEqual(mockChats);
    });
  });

  describe('findDirectChat', () => {
    it('should find existing direct chat between two users', async () => {
      const mockDirectChat = {
        _id: 'chat123',
        chatType: ChatType.DIRECT,
        participants: ['user123', 'user456']
      };

      const mockQuery = {
        populate: jest.fn().mockResolvedValue(mockDirectChat)
      };

      mockChat.findOne = jest.fn().mockReturnValue(mockQuery);

      const result = await chatRepository.findDirectChat('user123', 'user456');

      expect(mockChat.findOne).toHaveBeenCalledWith({
        chatType: ChatType.DIRECT,
        participants: { $all: ['user123', 'user456'] },
        isActive: true
      });
      expect(mockQuery.populate).toHaveBeenCalledWith('participantDetails');
      expect(result).toEqual(mockDirectChat);
    });

    it('should return null when no direct chat exists', async () => {
      const mockQuery = {
        populate: jest.fn().mockResolvedValue(null)
      };

      mockChat.findOne = jest.fn().mockReturnValue(mockQuery);

      const result = await chatRepository.findDirectChat('user123', 'user789');

      expect(result).toBeNull();
    });
  });

  describe('addParticipant', () => {
    it('should add participant to chat successfully', async () => {
      const mockUpdatedChat = {
        _id: 'chat123',
        participants: ['user123', 'user456', 'user789']
      };

      mockChat.findByIdAndUpdate = jest.fn().mockResolvedValue(mockUpdatedChat);

      const result = await chatRepository.addParticipant('chat123', 'user789');

      expect(mockChat.findByIdAndUpdate).toHaveBeenCalledWith(
        'chat123',
        { 
          $addToSet: { participants: 'user789' },
          updatedAt: expect.any(Date)
        },
        { new: true }
      );
      expect(result).toEqual(mockUpdatedChat);
    });

    it('should return null when chat not found', async () => {
      mockChat.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

      const result = await chatRepository.addParticipant('nonexistent', 'user789');

      expect(result).toBeNull();
    });
  });

  describe('removeParticipant', () => {
    it('should remove participant from chat successfully', async () => {
      const mockUpdatedChat = {
        _id: 'chat123',
        participants: ['user123', 'user456']
      };

      mockChat.findByIdAndUpdate = jest.fn().mockResolvedValue(mockUpdatedChat);

      const result = await chatRepository.removeParticipant('chat123', 'user789');

      expect(mockChat.findByIdAndUpdate).toHaveBeenCalledWith(
        'chat123',
        { 
          $pull: { participants: 'user789' },
          updatedAt: expect.any(Date)
        },
        { new: true }
      );
      expect(result).toEqual(mockUpdatedChat);
    });

    it('should return null when chat not found', async () => {
      mockChat.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

      const result = await chatRepository.removeParticipant('nonexistent', 'user789');

      expect(result).toBeNull();
    });
  });

  describe('updateChatInfo', () => {
    const updateData = {
      title: 'Updated Group Title',
      description: 'Updated description'
    };

    it('should update chat information successfully', async () => {
      const mockUpdatedChat = {
        _id: 'chat123',
        title: 'Updated Group Title',
        description: 'Updated description',
        chatType: ChatType.GROUP
      };

      const mockQuery = {
        populate: jest.fn().mockReturnThis()
      };

      mockQuery.populate
        .mockReturnValueOnce(mockQuery)
        .mockResolvedValueOnce(mockUpdatedChat);

      mockChat.findByIdAndUpdate = jest.fn().mockReturnValue(mockQuery);

      const result = await chatRepository.updateChatInfo('chat123', updateData);

      expect(mockChat.findByIdAndUpdate).toHaveBeenCalledWith(
        'chat123',
        { 
          ...updateData,
          updatedAt: expect.any(Date)
        },
        { new: true }
      );
      expect(mockQuery.populate).toHaveBeenCalledWith('participantDetails');
      expect(mockQuery.populate).toHaveBeenCalledWith('adminDetails');
      expect(result).toEqual(mockUpdatedChat);
    });

    it('should return null when chat not found', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis()
      };

      mockQuery.populate
        .mockReturnValueOnce(mockQuery)
        .mockResolvedValueOnce(null);

      mockChat.findByIdAndUpdate = jest.fn().mockReturnValue(mockQuery);

      const result = await chatRepository.updateChatInfo('nonexistent', updateData);

      expect(result).toBeNull();
    });

    it('should handle validation errors', async () => {
      const validationError = new Error('Validation failed');
      const mockQuery = {
        populate: jest.fn().mockReturnThis()
      };

      mockQuery.populate
        .mockReturnValueOnce(mockQuery)
        .mockRejectedValueOnce(validationError);

      mockChat.findByIdAndUpdate = jest.fn().mockReturnValue(mockQuery);

      await expect(chatRepository.updateChatInfo('chat123', updateData))
        .rejects
        .toThrow('Validation failed');
    });
  });

  describe('updateLastMessage', () => {
    const lastMessageData = {
      content: 'Latest message content',
      senderId: 'user123',
      timestamp: new Date(),
      messageType: 'TEXT' as any
    };

    it('should update last message successfully', async () => {
      const mockUpdatedChat = {
        _id: 'chat123',
        lastMessage: lastMessageData
      };

      mockChat.findByIdAndUpdate = jest.fn().mockResolvedValue(mockUpdatedChat);

      const result = await chatRepository.updateLastMessage('chat123', lastMessageData);

      expect(mockChat.findByIdAndUpdate).toHaveBeenCalledWith(
        'chat123',
        { 
          lastMessage: lastMessageData,
          updatedAt: expect.any(Date)
        },
        { new: true }
      );
      expect(result).toEqual(mockUpdatedChat);
    });

    it('should return null when chat not found', async () => {
      mockChat.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

      const result = await chatRepository.updateLastMessage('nonexistent', lastMessageData);

      expect(result).toBeNull();
    });
  });

  describe('softDeleteChat', () => {
    it('should soft delete chat successfully', async () => {
      const mockDeletedChat = {
        _id: 'chat123',
        isActive: false,
        deletedAt: new Date()
      };

      mockChat.findByIdAndUpdate = jest.fn().mockResolvedValue(mockDeletedChat);

      const result = await chatRepository.softDeleteChat('chat123');

      expect(mockChat.findByIdAndUpdate).toHaveBeenCalledWith(
        'chat123',
        {
          isActive: false,
          updatedAt: expect.any(Date)
        },
        { new: true }
      );
      expect(result).toEqual(mockDeletedChat);
    });

    it('should return null when chat not found', async () => {
      mockChat.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

      const result = await chatRepository.softDeleteChat('nonexistent');

      expect(result).toBeNull();
    });
  });


});