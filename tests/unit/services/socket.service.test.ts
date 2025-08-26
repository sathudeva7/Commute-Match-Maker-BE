import { Server as HttpServer } from 'http';
import { SocketService } from '../../../src/services/socket.service';
import { UserRepository } from '../../../src/repositories/user.repository';
import { ChatRepository } from '../../../src/repositories/chat.repository';
import { MessageRepository } from '../../../src/repositories/message.repository';
import jwt from 'jsonwebtoken';
import { MessageStatus, MessageType } from '../../../src/types/chat.types';

// Mock dependencies
jest.mock('../../../src/repositories/user.repository');
jest.mock('../../../src/repositories/chat.repository');
jest.mock('../../../src/repositories/message.repository');
jest.mock('jsonwebtoken');
jest.mock('socket.io');

const mockUserRepository = UserRepository as jest.MockedClass<typeof UserRepository>;
const mockChatRepository = ChatRepository as jest.MockedClass<typeof ChatRepository>;
const mockMessageRepository = MessageRepository as jest.MockedClass<typeof MessageRepository>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

// Mock socket.io
const mockSocket = {
  id: 'socket123',
  userId: 'user123',
  userName: 'John Doe',
  handshake: {
    auth: { token: 'valid.jwt.token' },
    headers: {}
  },
  join: jest.fn(),
  leave: jest.fn(),
  emit: jest.fn(),
  on: jest.fn(),
  to: jest.fn(() => ({ emit: jest.fn() }))
};

const mockIo = {
  use: jest.fn(),
  on: jest.fn(),
  to: jest.fn(() => ({ emit: jest.fn() }))
};

// Mock the Socket.IO Server constructor
jest.mock('socket.io', () => ({
  Server: jest.fn().mockImplementation(() => mockIo)
}));

describe('SocketService', () => {
  let socketService: SocketService;
  let mockServer: HttpServer;
  let mockUserRepo: jest.Mocked<UserRepository>;
  let mockChatRepo: jest.Mocked<ChatRepository>;
  let mockMessageRepo: jest.Mocked<MessageRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock HTTP server
    mockServer = {} as HttpServer;
    
    // Setup repository mocks
    mockUserRepo = new mockUserRepository() as jest.Mocked<UserRepository>;
    mockChatRepo = new mockChatRepository() as jest.Mocked<ChatRepository>;
    mockMessageRepo = new mockMessageRepository() as jest.Mocked<MessageRepository>;
    
    // Initialize service
    socketService = new SocketService(mockServer);
    
    // Inject mocked repositories
    (socketService as any).userRepository = mockUserRepo;
    (socketService as any).chatRepository = mockChatRepo;
    (socketService as any).messageRepository = mockMessageRepo;
  });

  describe('Authentication Middleware', () => {
    it('should authenticate user with valid token', async () => {
      const mockUser = {
        _id: 'user123',
        full_name: 'John Doe',
        email: 'john@example.com'
      };

      mockJwt.verify.mockReturnValue({ id: 'user123' } as any);
      mockUserRepo.findById.mockResolvedValue(mockUser);

      // Get the authentication middleware
      const authMiddleware = mockIo.use.mock.calls[0][0];
      const nextFn = jest.fn();

      await authMiddleware(mockSocket, nextFn);

      expect(mockJwt.verify).toHaveBeenCalledWith('valid.jwt.token', process.env.JWT_SECRET);
      expect(mockUserRepo.findById).toHaveBeenCalledWith('user123');
      expect(mockSocket.userId).toBe('user123');
      expect(mockSocket.userName).toBe('John Doe');
      expect(nextFn).toHaveBeenCalledWith();
    });

    it('should reject connection when no token provided', async () => {
      const socketWithoutToken = {
        ...mockSocket,
        handshake: { auth: {}, headers: {} }
      };

      const authMiddleware = mockIo.use.mock.calls[0][0];
      const nextFn = jest.fn();

      await authMiddleware(socketWithoutToken, nextFn);

      expect(nextFn).toHaveBeenCalledWith(new Error('Authentication token required'));
    });

    it('should reject connection with invalid token', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const authMiddleware = mockIo.use.mock.calls[0][0];
      const nextFn = jest.fn();

      await authMiddleware(mockSocket, nextFn);

      expect(nextFn).toHaveBeenCalledWith(new Error('Invalid authentication token'));
    });

    it('should reject connection when user not found', async () => {
      mockJwt.verify.mockReturnValue({ id: 'nonexistent' } as any);
      mockUserRepo.findById.mockResolvedValue(null);

      const authMiddleware = mockIo.use.mock.calls[0][0];
      const nextFn = jest.fn();

      await authMiddleware(mockSocket, nextFn);

      expect(nextFn).toHaveBeenCalledWith(new Error('User not found'));
    });

    it('should extract token from authorization header', async () => {
      const socketWithHeaderToken = {
        ...mockSocket,
        handshake: {
          auth: {},
          headers: { authorization: 'Bearer header.jwt.token' }
        }
      };

      const mockUser = {
        _id: 'user123',
        full_name: 'John Doe',
        email: 'john@example.com'
      };

      mockJwt.verify.mockReturnValue({ id: 'user123' } as any);
      mockUserRepo.findById.mockResolvedValue(mockUser);

      const authMiddleware = mockIo.use.mock.calls[0][0];
      const nextFn = jest.fn();

      await authMiddleware(socketWithHeaderToken, nextFn);

      expect(mockJwt.verify).toHaveBeenCalledWith('header.jwt.token', process.env.JWT_SECRET);
      expect(nextFn).toHaveBeenCalledWith();
    });
  });

  describe('Connection Events', () => {
    let connectionHandler: (socket: any) => void;

    beforeEach(() => {
      // Get the connection handler
      connectionHandler = mockIo.on.mock.calls.find(call => call[0] === 'connection')[1];
    });

    it('should handle user connection', () => {
      connectionHandler(mockSocket);

      // Check if user was added to online users
      const onlineUsers = (socketService as any).onlineUsers;
      expect(onlineUsers.has('user123')).toBe(true);
      expect(mockSocket.join).toHaveBeenCalledWith('user_user123');
    });

    it('should handle joining chat room', async () => {
      const mockChat = {
        _id: 'chat123',
        participants: ['user123', 'user456']
      };

      mockChatRepo.findById.mockResolvedValue(mockChat);

      connectionHandler(mockSocket);

      // Get the join_chat handler
      const joinChatHandler = mockSocket.on.mock.calls.find(call => call[0] === 'join_chat')[1];
      await joinChatHandler('chat123');

      expect(mockChatRepo.findById).toHaveBeenCalledWith('chat123');
      expect(mockSocket.join).toHaveBeenCalledWith('chat_chat123');
    });

    it('should reject joining chat when user is not participant', async () => {
      const mockChat = {
        _id: 'chat123',
        participants: ['user456', 'user789'] // user123 not included
      };

      mockChatRepo.findById.mockResolvedValue(mockChat);

      connectionHandler(mockSocket);

      const joinChatHandler = mockSocket.on.mock.calls.find(call => call[0] === 'join_chat')[1];
      await joinChatHandler('chat123');

      expect(mockSocket.emit).toHaveBeenCalledWith('error', { 
        message: 'You are not a participant in this chat' 
      });
      expect(mockSocket.join).not.toHaveBeenCalledWith('chat_chat123');
    });

    it('should handle leaving chat room', () => {
      connectionHandler(mockSocket);

      const leaveChatHandler = mockSocket.on.mock.calls.find(call => call[0] === 'leave_chat')[1];
      leaveChatHandler('chat123');

      expect(mockSocket.leave).toHaveBeenCalledWith('chat_chat123');
    });
  });

  describe('Message Events', () => {
    let connectionHandler: (socket: any) => void;

    beforeEach(() => {
      connectionHandler = mockIo.on.mock.calls.find(call => call[0] === 'connection')[1];
    });

    it('should handle sending message', async () => {
      const messageData = {
        chatId: 'chat123',
        content: 'Hello world!',
        messageType: MessageType.TEXT,
        receiverId: 'user456'
      };

      const mockMessage = {
        _id: 'message123',
        chatId: 'chat123',
        senderId: 'user123',
        content: 'Hello world!',
        messageType: MessageType.TEXT,
        status: MessageStatus.SENT,
        createdAt: new Date()
      };

      mockMessageRepo.create.mockResolvedValue(mockMessage);
      mockMessageRepo.findById.mockResolvedValue(mockMessage);
      mockChatRepo.updateLastMessage.mockResolvedValue();

      connectionHandler(mockSocket);

      const sendMessageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'send_message')[1];
      await sendMessageHandler(messageData);

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

      expect(mockChatRepo.updateLastMessage).toHaveBeenCalledWith('chat123', {
        content: 'Hello world!',
        senderId: 'user123',
        timestamp: expect.any(Date),
        messageType: MessageType.TEXT
      });
    });

    it('should handle typing indicators', () => {
      connectionHandler(mockSocket);

      const typingStartHandler = mockSocket.on.mock.calls.find(call => call[0] === 'typing_start')[1];
      const typingStopHandler = mockSocket.on.mock.calls.find(call => call[0] === 'typing_stop')[1];

      typingStartHandler({ chatId: 'chat123' });
      typingStopHandler({ chatId: 'chat123' });

      // Verify typing events were handled
      expect(mockSocket.to).toHaveBeenCalledWith('chat_chat123');
    });

    it('should handle message status updates', async () => {
      connectionHandler(mockSocket);

      const messageDeliveredHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message_delivered')[1];
      const messageReadHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message_read')[1];

      mockMessageRepo.updateMessageStatus.mockResolvedValue();
      mockMessageRepo.markAsRead.mockResolvedValue();

      await messageDeliveredHandler({ messageId: 'message123', chatId: 'chat123' });
      await messageReadHandler({ messageId: 'message123', chatId: 'chat123' });

      expect(mockMessageRepo.updateMessageStatus).toHaveBeenCalledWith('message123', MessageStatus.DELIVERED);
      expect(mockMessageRepo.markAsRead).toHaveBeenCalledWith('message123', 'user123');
    });
  });

  describe('Disconnect Events', () => {
    let connectionHandler: (socket: any) => void;

    beforeEach(() => {
      connectionHandler = mockIo.on.mock.calls.find(call => call[0] === 'connection')[1];
    });

    it('should handle user disconnection', () => {
      // First connect the user
      connectionHandler(mockSocket);

      // Check user is online
      const onlineUsers = (socketService as any).onlineUsers;
      expect(onlineUsers.has('user123')).toBe(true);

      // Handle disconnection
      const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')[1];
      disconnectHandler();

      // Check user is removed from online users
      expect(onlineUsers.has('user123')).toBe(false);
    });
  });

  describe('Public Methods', () => {
    it('should emit to specific user', () => {
      socketService.emitToUser('user123', 'test_event', { data: 'test' });

      expect(mockIo.to).toHaveBeenCalledWith('user_user123');
    });

    it('should emit to specific chat', () => {
      socketService.emitToChat('chat123', 'test_event', { data: 'test' });

      expect(mockIo.to).toHaveBeenCalledWith('chat_chat123');
    });

    it('should return online users count', () => {
      // Add some users to online users map
      const onlineUsers = (socketService as any).onlineUsers;
      onlineUsers.set('user1', { userId: 'user1', socketId: 'socket1' });
      onlineUsers.set('user2', { userId: 'user2', socketId: 'socket2' });

      const count = socketService.getOnlineUsersCount();
      expect(count).toBe(2);
    });

    it('should check if user is online', () => {
      const onlineUsers = (socketService as any).onlineUsers;
      onlineUsers.set('user123', { userId: 'user123', socketId: 'socket123' });

      expect(socketService.isUserOnline('user123')).toBe(true);
      expect(socketService.isUserOnline('user456')).toBe(false);
    });
  });

  describe('Helper Methods', () => {
    it('should get online users in chat', async () => {
      const mockChat = {
        _id: 'chat123',
        participants: ['user123', 'user456', 'user789']
      };

      // Add some users to online users map
      const onlineUsers = (socketService as any).onlineUsers;
      onlineUsers.set('user123', { userId: 'user123', socketId: 'socket123' });
      onlineUsers.set('user456', { userId: 'user456', socketId: 'socket456' });
      // user789 is not online

      mockChatRepo.findById.mockResolvedValue(mockChat);

      const result = await (socketService as any).getOnlineUsersInChat('chat123');

      expect(result).toHaveLength(2);
      expect(result).toEqual([
        { userId: 'user123', socketId: 'socket123' },
        { userId: 'user456', socketId: 'socket456' }
      ]);
    });

    it('should handle errors in getOnlineUsersInChat', async () => {
      mockChatRepo.findById.mockRejectedValue(new Error('Database error'));

      const result = await (socketService as any).getOnlineUsersInChat('chat123');

      expect(result).toEqual([]);
    });

    it('should broadcast user online status', async () => {
      const mockChats = [
        { _id: 'chat123' },
        { _id: 'chat456' }
      ];

      mockChatRepo.findUserChats.mockResolvedValue(mockChats);

      await (socketService as any).broadcastUserOnlineStatus('user123', true);

      expect(mockChatRepo.findUserChats).toHaveBeenCalledWith('user123');
      expect(mockIo.to).toHaveBeenCalledWith('chat_chat123');
      expect(mockIo.to).toHaveBeenCalledWith('chat_chat456');
    });

    it('should send notifications to offline users', async () => {
      const mockChat = {
        _id: 'chat123',
        participants: ['user123', 'user456', 'user789']
      };

      const mockMessage = {
        messageId: 'message123',
        chatId: 'chat123',
        senderId: 'user123',
        senderName: 'John Doe',
        content: 'Hello!',
        messageType: MessageType.TEXT,
        timestamp: new Date()
      };

      // Only user456 is online
      const onlineUsers = (socketService as any).onlineUsers;
      onlineUsers.set('user456', { userId: 'user456', socketId: 'socket456' });

      mockChatRepo.findById.mockResolvedValue(mockChat);

      await (socketService as any).sendNotificationToOfflineUsers('chat123', mockMessage);

      expect(mockChatRepo.findById).toHaveBeenCalledWith('chat123');
      // Should identify user789 as offline (user123 is sender, user456 is online)
    });
  });
});