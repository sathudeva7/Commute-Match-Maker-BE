import { Server as HttpServer } from 'http';
import { AddressInfo } from 'net';
import express from 'express';
import { Server as SocketIOServer, Socket } from 'socket.io';
import Client from 'socket.io-client';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { UserRepository } from '../../src/repositories/user.repository';
import { ChatRepository } from '../../src/repositories/chat.repository';
import { MessageRepository } from '../../src/repositories/message.repository';
import { ChatType, MessageType, MessageStatus } from '../../src/types/chat.types';

// Create test users and chats in database before tests
const testUser1 = {
  email: 'user1@test.com',
  full_name: 'User One',
  password: 'hashedpassword'
};

const testUser2 = {
  email: 'user2@test.com',
  full_name: 'User Two',
  password: 'hashedpassword'
};

describe('Socket.IO Integration Tests', () => {
  let httpServer: HttpServer;
  let io: SocketIOServer;
  let userRepo: UserRepository;
  let chatRepo: ChatRepository;
  let messageRepo: MessageRepository;
  let port: number;
  let createdUser1: any;
  let createdUser2: any;
  let createdChat: any;

  beforeAll(async () => {
    // Setup repositories
    userRepo = new UserRepository();
    chatRepo = new ChatRepository();
    messageRepo = new MessageRepository();

    // Setup server once for all tests
    const app = express();
    httpServer = new HttpServer(app);
    
    io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    // Setup authentication middleware
    io.use(async (socket: Socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        console.log('JWT decoded:', decoded);
        
        const user = await userRepo.findById(decoded.id);
        console.log('User found:', user ? user._id : 'null');
        
        if (!user) {
          return next(new Error('User not found'));
        }

        (socket as any).userId = user._id;
        (socket as any).userName = user.full_name;
        next();
      } catch (error) {
        console.error('Auth middleware error:', error);
        next(new Error('Invalid authentication token'));
      }
    });

    // Setup basic event handlers
    io.on('connection', (socket: Socket) => {
      const authenticatedSocket = socket as any;
      console.log(`User connected: ${authenticatedSocket.userName} (${authenticatedSocket.userId})`);
      
      socket.join(`user_${authenticatedSocket.userId}`);

      socket.on('join_chat', async (chatId: string) => {
        try {
          const chat = await chatRepo.findById(chatId);
          if (!chat) {
            socket.emit('error', { message: 'Failed to join chat' });
            return;
          }
          if (!chat.participants.includes(authenticatedSocket.userId!)) {
            socket.emit('error', { message: 'You are not a participant in this chat' });
            return;
          }
          socket.join(`chat_${chatId}`);
          socket.to(`chat_${chatId}`).emit('user_joined_chat', {
            userId: authenticatedSocket.userId,
            userName: authenticatedSocket.userName,
            chatId
          });
        } catch (error) {
          socket.emit('error', { message: 'Failed to join chat' });
        }
      });

      socket.on('send_message', async (data: {
        chatId: string;
        content: string;
        messageType: string;
        receiverId?: string;
      }) => {
        try {
          const chat = await chatRepo.findById(data.chatId);
          if (!chat) {
            socket.emit('error', { message: 'Failed to send message' });
            return;
          }

          const message = await messageRepo.create({
            chatId: data.chatId,
            senderId: authenticatedSocket.userId!,
            receiverId: data.receiverId,
            content: data.content,
            messageType: data.messageType as any,
            status: MessageStatus.SENT
          });

          await chatRepo.updateLastMessage(data.chatId, {
            content: data.content,
            senderId: authenticatedSocket.userId!,
            timestamp: new Date(),
            messageType: data.messageType as any
          });

          const socketMessage = {
            messageId: message._id,
            chatId: data.chatId,
            senderId: authenticatedSocket.userId,
            senderName: authenticatedSocket.userName,
            content: data.content,
            messageType: data.messageType,
            timestamp: message.createdAt,
            receiverId: data.receiverId
          };

          io.to(`chat_${data.chatId}`).emit('new_message', socketMessage);
        } catch (error) {
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      socket.on('typing_start', (data: { chatId: string }) => {
        socket.to(`chat_${data.chatId}`).emit('user_typing', {
          chatId: data.chatId,
          userId: authenticatedSocket.userId,
          userName: authenticatedSocket.userName,
          isTyping: true
        });
      });

      socket.on('typing_stop', (data: { chatId: string }) => {
        socket.to(`chat_${data.chatId}`).emit('user_typing', {
          chatId: data.chatId,
          userId: authenticatedSocket.userId,
          userName: authenticatedSocket.userName,
          isTyping: false
        });
      });

      socket.on('disconnect', () => {
        console.log(`User disconnected: ${authenticatedSocket.userName} (${authenticatedSocket.userId})`);
      });
    });

    // Start server
    return new Promise<void>((resolve) => {
      httpServer.listen(() => {
        port = (httpServer.address() as AddressInfo).port;
        console.log(`Test server listening on port ${port}`);
        resolve();
      });
    });
  }, 30000); // Increase timeout for setup

  beforeEach(async () => {
    // Create test data for each test (since global beforeEach clears collections)
    try {
      console.log('Creating test users for this test...');
      createdUser1 = await userRepo.create(testUser1);
      console.log('User 1 created:', createdUser1._id);
      
      createdUser2 = await userRepo.create(testUser2);
      console.log('User 2 created:', createdUser2._id);
      
      console.log('Creating test chat for this test...');
      createdChat = await chatRepo.create({
        chatType: ChatType.DIRECT,
        participants: [createdUser1._id, createdUser2._id],
        isActive: true
      });
      console.log('Chat created:', createdChat._id);
    } catch (error) {
      console.error('Failed to create test data:', error);
      throw error;
    }
  });

  afterAll(async () => {
    // Cleanup test data and close server
    try {
      if (io) {
        io.close();
      }
      if (httpServer) {
        httpServer.close();
      }
      
      await messageRepo.deleteMany({});
      await chatRepo.deleteMany({});
      await userRepo.deleteMany({});
    } catch (error) {
      console.error('Failed to cleanup test data:', error);
    }
  });

  describe('Authentication', () => {
    it('should connect successfully with valid token', (done) => {
      const token = jwt.sign({ id: createdUser1._id }, process.env.JWT_SECRET!);
      console.log('Testing with token for user:', createdUser1._id);
      
      const client = Client(`http://localhost:${port}`, {
        auth: { token },
        timeout: 10000
      });

      client.on('connect', () => {
        console.log('Client connected successfully');
        expect(client.connected).toBe(true);
        client.disconnect();
        done();
      });

      client.on('connect_error', (error) => {
        console.error('Connection error:', error);
        done(error);
      });

      client.on('error', (error) => {
        console.error('Socket error:', error);
        done(error);
      });
    }, 15000);

    it('should reject connection without token', (done) => {
      const client = Client(`http://localhost:${port}`, {
        timeout: 10000
      });

      client.on('connect_error', (error) => {
        expect(error.message).toBe('Authentication token required');
        done();
      });

      client.on('connect', () => {
        done(new Error('Should not connect without token'));
      });
    }, 15000);

    it('should reject connection with invalid token', (done) => {
      const client = Client(`http://localhost:${port}`, {
        auth: { token: 'invalid.token.here' },
        timeout: 10000
      });

      client.on('connect_error', (error) => {
        expect(error.message).toBe('Invalid authentication token');
        done();
      });

      client.on('connect', () => {
        done(new Error('Should not connect with invalid token'));
      });
    }, 15000);
  });

  describe('Chat Operations', () => {
    let client1: any;
    let client2: any;
    let token1: string;
    let token2: string;

    beforeEach((done) => {
      token1 = jwt.sign({ id: createdUser1._id }, process.env.JWT_SECRET!);
      token2 = jwt.sign({ id: createdUser2._id }, process.env.JWT_SECRET!);

      client1 = Client(`http://localhost:${port}`, { 
        auth: { token: token1 },
        timeout: 10000
      });
      client2 = Client(`http://localhost:${port}`, { 
        auth: { token: token2 },
        timeout: 10000
      });

      let connected = 0;
      const onConnect = () => {
        connected++;
        console.log(`Client ${connected} connected`);
        if (connected === 2) done();
      };

      client1.on('connect', onConnect);
      client2.on('connect', onConnect);

      client1.on('connect_error', (error) => {
        console.error('Client 1 connection error:', error);
        done(error);
      });

      client2.on('connect_error', (error) => {
        console.error('Client 2 connection error:', error);
        done(error);
      });
    }, 20000);

    afterEach(() => {
      if (client1) client1.disconnect();
      if (client2) client2.disconnect();
    });

    it('should allow users to join chat room', (done) => {
      // First, both users join the chat
      client1.emit('join_chat', createdChat._id);
      client2.emit('join_chat', createdChat._id);

      // Wait a moment for joins to complete, then trigger the event
      setTimeout(() => {
        client1.emit('join_chat', createdChat._id);
      }, 100);

      client2.on('user_joined_chat', (data) => {
        expect(data.userId.toString()).toBe(createdUser1._id.toString());
        expect(data.userName).toBe('User One');
        expect(data.chatId.toString()).toBe(createdChat._id.toString());
        done();
      });
    }, 15000);

    it('should reject joining chat for non-participants', (done) => {
      // Create a real user that is not a participant in the chat
      const nonParticipantUser = {
        email: 'nonparticipant@test.com',
        full_name: 'Non Participant',
        password: 'hashedpassword'
      };

      // Create the user first
      userRepo.create(nonParticipantUser).then(async (createdNonParticipant) => {
        if (!createdNonParticipant._id) {
          done(new Error('Failed to create non-participant user'));
          return;
        }

        const token3 = jwt.sign({ id: createdNonParticipant._id }, process.env.JWT_SECRET!);
        
        const client3 = Client(`http://localhost:${port}`, { 
          auth: { token: token3 },
          timeout: 10000
        });

        client3.on('connect', () => {
          // Wait a moment for connection to stabilize
          setTimeout(() => {
            client3.emit('join_chat', createdChat._id);
          }, 100);
        });

        client3.on('error', (error) => {
          expect(error.message).toBe('You are not a participant in this chat');
          client3.disconnect();
          // Clean up the created user
          userRepo.delete(createdNonParticipant._id!).then(() => {
            done();
          }).catch(() => {
            done(); // Continue even if cleanup fails
          });
        });

        // Add a timeout to prevent hanging
        setTimeout(() => {
          if (!client3.disconnected) {
            client3.disconnect();
            userRepo.delete(createdNonParticipant._id!).then(() => {
              done(new Error('Test timed out waiting for error event'));
            }).catch(() => {
              done(new Error('Test timed out waiting for error event'));
            });
          }
        }, 10000);
      }).catch((error) => {
        done(error);
      });
    }, 15000);

    it('should broadcast messages between users', (done) => {
      const messageContent = 'Hello from integration test!';

      client2.on('new_message', (message) => {
        expect(message.content).toBe(messageContent);
        expect(message.senderId.toString()).toBe(createdUser1._id.toString());
        expect(message.senderName).toBe('User One');
        expect(message.chatId.toString()).toBe(createdChat._id.toString());
        expect(message.messageType).toBe(MessageType.TEXT);
        done();
      });

      // Both users join the chat first
      client1.emit('join_chat', createdChat._id);
      client2.emit('join_chat', createdChat._id);

      // Wait a moment for joins to complete, then send message
      setTimeout(() => {
        client1.emit('send_message', {
          chatId: createdChat._id,
          content: messageContent,
          messageType: MessageType.TEXT,
          receiverId: createdUser2._id
        });
      }, 100);
    }, 15000);

    it('should handle typing indicators', (done) => {
      let typingStartReceived = false;

      client2.on('user_typing', (data) => {
        expect(data.userId.toString()).toBe(createdUser1._id.toString());
        expect(data.userName).toBe('User One');
        expect(data.chatId.toString()).toBe(createdChat._id.toString());

        if (!typingStartReceived) {
          expect(data.isTyping).toBe(true);
          typingStartReceived = true;
          
          // Send typing stop
          client1.emit('typing_stop', { chatId: createdChat._id });
        } else {
          expect(data.isTyping).toBe(false);
          done();
        }
      });

      // Both users join the chat first
      client1.emit('join_chat', createdChat._id);
      client2.emit('join_chat', createdChat._id);

      // Wait a moment for joins to complete, then start typing
      setTimeout(() => {
        client1.emit('typing_start', { chatId: createdChat._id });
      }, 100);
    }, 15000);
  });

  describe('Real-time Message Flow', () => {
    let client1: any;
    let client2: any;

    beforeEach((done) => {
      const token1 = jwt.sign({ id: createdUser1._id }, process.env.JWT_SECRET!);
      const token2 = jwt.sign({ id: createdUser2._id }, process.env.JWT_SECRET!);

      client1 = Client(`http://localhost:${port}`, { 
        auth: { token: token1 },
        timeout: 10000
      });
      client2 = Client(`http://localhost:${port}`, { 
        auth: { token: token2 },
        timeout: 10000
      });

      let connected = 0;
      const onConnect = () => {
        connected++;
        console.log(`Message flow client ${connected} connected`);
        if (connected === 2) {
          // Both users join the chat
          client1.emit('join_chat', createdChat._id);
          client2.emit('join_chat', createdChat._id);
          setTimeout(done, 100); // Wait for joins to complete
        }
      };

      client1.on('connect', onConnect);
      client2.on('connect', onConnect);
    }, 20000);

    afterEach(() => {
      if (client1) client1.disconnect();
      if (client2) client2.disconnect();
    });

    it('should handle bidirectional messaging', (done) => {
      const message1 = 'Hello from user1';
      const message2 = 'Hello back from user2';
      let messagesReceived = 0;

      // Set up event listeners first
      client1.on('new_message', (message) => {
        if (message.senderId.toString() === createdUser2._id.toString()) {
          expect(message.content).toBe(message2);
          expect(message.senderId.toString()).toBe(createdUser2._id.toString());
          messagesReceived++;
          if (messagesReceived === 2) done();
        }
      });

      client2.on('new_message', (message) => {
        if (message.senderId.toString() === createdUser1._id.toString()) {
          expect(message.content).toBe(message1);
          expect(message.senderId.toString()).toBe(createdUser1._id.toString());
          messagesReceived++;
          
          // Reply with second message
          setTimeout(() => {
            client2.emit('send_message', {
              chatId: createdChat._id,
              content: message2,
              messageType: MessageType.TEXT,
              receiverId: createdUser1._id
            });
          }, 100);
        }
      });

      // Send first message
      setTimeout(() => {
        client1.emit('send_message', {
          chatId: createdChat._id,
          content: message1,
          messageType: MessageType.TEXT,
          receiverId: createdUser2._id
        });
      }, 100);
    }, 15000);

    it('should persist messages in database', (done) => {
      const messageContent = 'Message to be persisted';

      client2.on('new_message', async (message) => {
        try {
          // Check if message was persisted
          const savedMessage = await messageRepo.findById(message.messageId);
          expect(savedMessage).toBeTruthy();
          expect(savedMessage!.content).toBe(messageContent);
          expect(savedMessage!.senderId.toString()).toBe(createdUser1._id.toString());
          expect(savedMessage!.chatId.toString()).toBe(createdChat._id.toString());
          done();
        } catch (error) {
          done(error);
        }
      });

      client1.emit('send_message', {
        chatId: createdChat._id,
        content: messageContent,
        messageType: MessageType.TEXT,
        receiverId: createdUser2._id
      });
    }, 15000);
  });

  describe('Error Handling', () => {
    let client: any;

    beforeEach((done) => {
      const token = jwt.sign({ id: createdUser1._id }, process.env.JWT_SECRET!);
      client = Client(`http://localhost:${port}`, { 
        auth: { token },
        timeout: 10000
      });
      client.on('connect', done);
    }, 15000);

    afterEach(() => {
      if (client) client.disconnect();
    });

    it('should handle sending message to non-existent chat', (done) => {
      client.on('error', (error) => {
        expect(error.message).toBe('Failed to send message');
        done();
      });

      client.emit('send_message', {
        chatId: new mongoose.Types.ObjectId().toString(),
        content: 'This should fail',
        messageType: MessageType.TEXT
      });
    }, 15000);

    it('should handle joining non-existent chat', (done) => {
      client.on('error', (error) => {
        expect(error.message).toBe('Failed to join chat');
        done();
      });

      client.emit('join_chat', new mongoose.Types.ObjectId().toString());
    }, 15000);
  });
});