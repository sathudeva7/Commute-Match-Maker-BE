import { ChatService } from '../../../src/services/chat.service';
import { ChatRepository } from '../../../src/repositories/chat.repository';
import { MessageRepository } from '../../../src/repositories/message.repository';
import { UserRepository } from '../../../src/repositories/user.repository';
import { AppError } from '../../../src/utils/appError';
import { ChatType, MessageType, MessageStatus } from '../../../src/types/chat.types';
import { IUser } from '../../../src/types/user.types';

// Mock dependencies
jest.mock('../../../src/repositories/chat.repository');
jest.mock('../../../src/repositories/message.repository');
jest.mock('../../../src/repositories/user.repository');

const mockChatRepository = ChatRepository as jest.MockedClass<typeof ChatRepository>;
const mockMessageRepository = MessageRepository as jest.MockedClass<typeof MessageRepository>;
const mockUserRepository = UserRepository as jest.MockedClass<typeof UserRepository>;

describe('ChatService', () => {
  let chatService: ChatService;
  let mockChatRepo: jest.Mocked<ChatRepository>;
  let mockMessageRepo: jest.Mocked<MessageRepository>;
  let mockUserRepo: jest.Mocked<UserRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    chatService = new ChatService();
    mockChatRepo = new mockChatRepository() as jest.Mocked<ChatRepository>;
    mockMessageRepo = new mockMessageRepository() as jest.Mocked<MessageRepository>;
    mockUserRepo = new mockUserRepository() as jest.Mocked<UserRepository>;
    
    (chatService as any).chatRepository = mockChatRepo;
    (chatService as any).messageRepository = mockMessageRepo;
    (chatService as any).userRepository = mockUserRepo;
  });

  describe('createChat', () => {
    const chatData = {
      chatType: ChatType.DIRECT,
      participantIds: ['user456'],
      title: undefined,
      description: undefined
    };

    it('should create direct chat successfully', async () => {
      const mockUsers = [
        { _id: 'user123', full_name: 'John Doe' },
        { _id: 'user456', full_name: 'Jane Doe' }
      ];
      const mockChat = {
        _id: 'chat123',
        chatType: ChatType.DIRECT,
        participants: ['user123', 'user456'],
        isActive: true
      };

      mockUserRepo.findById
        .mockResolvedValueOnce(mockUsers[1] as IUser)
        .mockResolvedValueOnce(mockUsers[0] as IUser);
      mockChatRepo.findDirectChat.mockResolvedValue(null);
      mockChatRepo.create.mockResolvedValue(mockChat);
      mockChatRepo.findById.mockResolvedValue(mockChat);

      const result = await chatService.createChat('user123', chatData);

      expect(mockUserRepo.findById).toHaveBeenCalledTimes(2);
      expect(mockChatRepo.findDirectChat).toHaveBeenCalledWith('user456', 'user123');
      expect(mockChatRepo.create).toHaveBeenCalledWith({
        chatType: ChatType.DIRECT,
        participants: ['user456', 'user123'],
        title: undefined,
        description: undefined,
        adminIds: undefined,
        isActive: true
      });
      expect(result).toEqual(mockChat);
    });

    it('should return existing direct chat if already exists', async () => {
      const mockUsers = [
        { _id: 'user123', full_name: 'John Doe' },
        { _id: 'user456', full_name: 'Jane Doe' }
      ];
      const existingChat = {
        _id: 'existing_chat',
        chatType: ChatType.DIRECT,
        participants: ['user123', 'user456']
      };

      mockUserRepo.findById
        .mockResolvedValueOnce(mockUsers[1] as IUser)
        .mockResolvedValueOnce(mockUsers[0] as IUser);
      mockChatRepo.findDirectChat.mockResolvedValue(existingChat);

      const result = await chatService.createChat('user123', chatData);

      expect(mockChatRepo.create).not.toHaveBeenCalled();
      expect(result).toEqual(existingChat);
    });

    it('should create group chat with admin privileges', async () => {
      const groupChatData = {
        chatType: ChatType.GROUP,
        participantIds: ['user456', 'user789'],
        title: 'Test Group',
        description: 'A test group'
      };

      const mockUsers = [
        { _id: 'user456', full_name: 'Jane Doe' },
        { _id: 'user789', full_name: 'Bob Smith' },
        { _id: 'user123', full_name: 'John Doe' }
      ];
      const mockChat = {
        _id: 'chat123',
        chatType: ChatType.GROUP,
        participants: ['user456', 'user789', 'user123'],
        title: 'Test Group',
        adminIds: ['user123'],
        isActive: true
      };

      mockUsers.forEach((user, index) => {
        mockUserRepo.findById.mockResolvedValueOnce(user);
      });
      mockChatRepo.create.mockResolvedValue(mockChat);
      mockChatRepo.findById.mockResolvedValue(mockChat);

      const result = await chatService.createChat('user123', groupChatData);

      expect(mockChatRepo.create).toHaveBeenCalledWith({
        chatType: ChatType.GROUP,
        participants: ['user456', 'user789', 'user123'],
        title: 'Test Group',
        description: 'A test group',
        adminIds: ['user123'],
        isActive: true
      });
      expect(result).toEqual(mockChat);
    });

    it('should throw error when participant not found', async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      await expect(chatService.createChat('user123', chatData))
        .rejects
        .toThrow(new AppError('User with ID user456 not found', 404));

      expect(mockChatRepo.create).not.toHaveBeenCalled();
    });

    it('should throw error when less than 2 unique participants', async () => {
      const invalidChatData = {
        chatType: ChatType.DIRECT,
        participantIds: ['user123'], // Same as creator
        title: undefined,
        description: undefined
      };

      const mockUser = { _id: 'user123', full_name: 'John Doe' };
      mockUserRepo.findById.mockResolvedValue(mockUser);

      await expect(chatService.createChat('user123', invalidChatData))
        .rejects
        .toThrow(new AppError('At least 2 participants required for a chat', 400));
    });
  });

  describe('sendMessage', () => {
    const messageData = {
      chatId: 'chat123',
      content: 'Hello world!',
      messageType: MessageType.TEXT,
      receiverId: undefined,
      fileUrl: undefined,
      fileName: undefined,
      replyToMessageId: undefined
    };

    it('should send message successfully', async () => {
      const mockChat = {
        _id: 'chat123',
        chatType: ChatType.DIRECT,
        participants: ['user123', 'user456'],
        isActive: true
      };
      const mockMessage = {
        _id: 'message123',
        chatId: 'chat123',
        senderId: 'user123',
        receiverId: 'user456',
        content: 'Hello world!',
        messageType: MessageType.TEXT,
        status: MessageStatus.SENT
      };

      mockChatRepo.findById.mockResolvedValue(mockChat);
      mockMessageRepo.create.mockResolvedValue(mockMessage);
      mockMessageRepo.findById.mockResolvedValue(mockMessage);
      mockChatRepo.updateLastMessage.mockResolvedValue();

      const result = await chatService.sendMessage('user123', messageData);

      expect(mockChatRepo.findById).toHaveBeenCalledWith('chat123');
      expect(mockMessageRepo.create).toHaveBeenCalledWith({
        chatId: 'chat123',
        senderId: 'user123',
        receiverId: 'user456',
        content: 'Hello world!',
        messageType: MessageType.TEXT,
        status: MessageStatus.SENT,
        fileUrl: undefined,
        fileName: undefined,
        replyToMessageId: undefined
      });
      expect(mockChatRepo.updateLastMessage).toHaveBeenCalled();
      expect(result).toEqual(mockMessage);
    });

    it('should throw error when chat not found', async () => {
      mockChatRepo.findById.mockResolvedValue(null);

      await expect(chatService.sendMessage('user123', messageData))
        .rejects
        .toThrow(new AppError('Chat not found', 404));

      expect(mockMessageRepo.create).not.toHaveBeenCalled();
    });

    it('should throw error when user not participant', async () => {
      const mockChat = {
        _id: 'chat123',
        chatType: ChatType.DIRECT,
        participants: ['user456', 'user789'], // user123 not included
        isActive: true
      };

      mockChatRepo.findById.mockResolvedValue(mockChat);

      await expect(chatService.sendMessage('user123', messageData))
        .rejects
        .toThrow(new AppError('You are not a participant in this chat', 403));
    });

    it('should throw error when chat is inactive', async () => {
      const mockChat = {
        _id: 'chat123',
        participants: ['user123', 'user456'],
        isActive: false
      };

      mockChatRepo.findById.mockResolvedValue(mockChat);

      await expect(chatService.sendMessage('user123', messageData))
        .rejects
        .toThrow(new AppError('Chat is inactive', 400));
    });
  });

  describe('getChatMessages', () => {
    it('should get chat messages successfully', async () => {
      const mockChat = {
        _id: 'chat123',
        participants: ['user123', 'user456']
      };
      const mockMessages = [
        { _id: 'message1', content: 'Hello' },
        { _id: 'message2', content: 'Hi there' }
      ];

      mockChatRepo.findById.mockResolvedValue(mockChat);
      mockMessageRepo.findChatMessages.mockResolvedValue(mockMessages);

      const result = await chatService.getChatMessages('user123', 'chat123', 1, 50);

      expect(mockChatRepo.findById).toHaveBeenCalledWith('chat123');
      expect(mockMessageRepo.findChatMessages).toHaveBeenCalledWith('chat123', 1, 50);
      expect(result).toEqual(mockMessages);
    });

    it('should throw error when user not participant', async () => {
      const mockChat = {
        _id: 'chat123',
        participants: ['user456', 'user789'] // user123 not included
      };

      mockChatRepo.findById.mockResolvedValue(mockChat);

      await expect(chatService.getChatMessages('user123', 'chat123'))
        .rejects
        .toThrow(new AppError('You are not a participant in this chat', 403));

      expect(mockMessageRepo.findChatMessages).not.toHaveBeenCalled();
    });
  });

  describe('addParticipant', () => {
    it('should add participant to group chat successfully', async () => {
      const mockChat = {
        _id: 'chat123',
        chatType: ChatType.GROUP,
        participants: ['user123', 'user456'],
        adminIds: ['user123']
      };
      const mockParticipant = { _id: 'user789', full_name: 'New User' };
      const mockUpdatedChat = {
        ...mockChat,
        participants: ['user123', 'user456', 'user789']
      };

      mockChatRepo.findById.mockResolvedValue(mockChat);
      mockUserRepo.findById.mockResolvedValue(mockParticipant);
      mockChatRepo.addParticipant.mockResolvedValue(mockUpdatedChat);

      const result = await chatService.addParticipant('user123', 'chat123', 'user789');

      expect(mockChatRepo.findById).toHaveBeenCalledWith('chat123');
      expect(mockUserRepo.findById).toHaveBeenCalledWith('user789');
      expect(mockChatRepo.addParticipant).toHaveBeenCalledWith('chat123', 'user789');
      expect(result).toEqual(mockUpdatedChat);
    });

    it('should throw error when trying to add participant to direct chat', async () => {
      const mockChat = {
        _id: 'chat123',
        chatType: ChatType.DIRECT,
        participants: ['user123', 'user456']
      };

      mockChatRepo.findById.mockResolvedValue(mockChat);

      await expect(chatService.addParticipant('user123', 'chat123', 'user789'))
        .rejects
        .toThrow(new AppError('Cannot add participants to direct chats', 400));
    });

    it('should throw error when non-admin tries to add participant', async () => {
      const mockChat = {
        _id: 'chat123',
        chatType: ChatType.GROUP,
        participants: ['user123', 'user456'],
        adminIds: ['user456'] // user123 is not admin
      };

      mockChatRepo.findById.mockResolvedValue(mockChat);

      await expect(chatService.addParticipant('user123', 'chat123', 'user789'))
        .rejects
        .toThrow(new AppError('Only admins can add participants', 403));
    });

    it('should throw error when participant already exists', async () => {
      const mockChat = {
        _id: 'chat123',
        chatType: ChatType.GROUP,
        participants: ['user123', 'user456', 'user789'], // user789 already exists
        adminIds: ['user123']
      };
      const mockParticipant = { _id: 'user789', full_name: 'Existing User' };

      mockChatRepo.findById.mockResolvedValue(mockChat);
      mockUserRepo.findById.mockResolvedValue(mockParticipant);

      await expect(chatService.addParticipant('user123', 'chat123', 'user789'))
        .rejects
        .toThrow(new AppError('User is already a participant', 400));
    });
  });

  describe('deleteMessage', () => {
    it('should delete own message successfully', async () => {
      const mockMessage = {
        _id: 'message123',
        senderId: 'user123',
        content: 'Hello world'
      };

      mockMessageRepo.findById.mockResolvedValue(mockMessage);
      mockMessageRepo.deleteMessage.mockResolvedValue();

      await chatService.deleteMessage('user123', 'message123');

      expect(mockMessageRepo.findById).toHaveBeenCalledWith('message123');
      expect(mockMessageRepo.deleteMessage).toHaveBeenCalledWith('message123');
    });

    it('should throw error when trying to delete others message', async () => {
      const mockMessage = {
        _id: 'message123',
        senderId: 'user456', // Different from user123
        content: 'Hello world'
      };

      mockMessageRepo.findById.mockResolvedValue(mockMessage);

      await expect(chatService.deleteMessage('user123', 'message123'))
        .rejects
        .toThrow(new AppError('You can only delete your own messages', 403));

      expect(mockMessageRepo.deleteMessage).not.toHaveBeenCalled();
    });

    it('should throw error when message not found', async () => {
      mockMessageRepo.findById.mockResolvedValue(null);

      await expect(chatService.deleteMessage('user123', 'message123'))
        .rejects
        .toThrow(new AppError('Message not found', 404));
    });
  });

  describe('updateMessage', () => {
    it('should update own text message successfully', async () => {
      const mockMessage = {
        _id: 'message123',
        senderId: 'user123',
        messageType: MessageType.TEXT,
        content: 'Original content'
      };
      const updatedMessage = {
        ...mockMessage,
        content: 'Updated content'
      };

      mockMessageRepo.findById.mockResolvedValue(mockMessage);
      mockMessageRepo.updateMessage.mockResolvedValue(updatedMessage);

      const result = await chatService.updateMessage('user123', 'message123', 'Updated content');

      expect(mockMessageRepo.findById).toHaveBeenCalledWith('message123');
      expect(mockMessageRepo.updateMessage).toHaveBeenCalledWith('message123', { content: 'Updated content' });
      expect(result).toEqual(updatedMessage);
    });

    it('should throw error when trying to update others message', async () => {
      const mockMessage = {
        _id: 'message123',
        senderId: 'user456', // Different from user123
        messageType: MessageType.TEXT,
        content: 'Original content'
      };

      mockMessageRepo.findById.mockResolvedValue(mockMessage);

      await expect(chatService.updateMessage('user123', 'message123', 'Updated content'))
        .rejects
        .toThrow(new AppError('You can only edit your own messages', 403));
    });

    it('should throw error when trying to update non-text message', async () => {
      const mockMessage = {
        _id: 'message123',
        senderId: 'user123',
        messageType: MessageType.IMAGE, // Not text
        content: 'Image caption'
      };

      mockMessageRepo.findById.mockResolvedValue(mockMessage);

      await expect(chatService.updateMessage('user123', 'message123', 'Updated content'))
        .rejects
        .toThrow(new AppError('Only text messages can be edited', 400));
    });
  });
});