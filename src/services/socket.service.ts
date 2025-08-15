import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/user.repository';
import { ChatRepository } from '../repositories/chat.repository';
import { MessageRepository } from '../repositories/message.repository';
import { 
  IOnlineUser, 
  ITypingIndicator, 
  ISocketMessage, 
  IMessageDeliveryStatus,
  MessageStatus 
} from '../types/chat.types';

// Using any temporarily to avoid type issues until socket.io is installed
interface AuthenticatedSocket {
  userId?: string;
  userName?: string;
  handshake: any;
  id: string;
  join: (room: string) => void;
  leave: (room: string) => void;
  emit: (event: string, data?: any) => void;
  on: (event: string, handler: (...args: any[]) => void) => void;
  to: (room: string) => any;
}

export class SocketService {
  private io: any; // SocketIOServer
  private onlineUsers: Map<string, IOnlineUser> = new Map();
  private userRepository: UserRepository;
  private chatRepository: ChatRepository;
  private messageRepository: MessageRepository;

  constructor(server: HttpServer) {
    // Import socket.io dynamically to avoid type errors
    const { Server } = require('socket.io');
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.userRepository = new UserRepository();
    this.chatRepository = new ChatRepository();
    this.messageRepository = new MessageRepository();

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
        const user = await this.userRepository.findById(decoded.id);
        
        if (!user) {
          return next(new Error('User not found'));
        }

        socket.userId = user._id;
        socket.userName = user.full_name;
        next();
      } catch (error) {
        next(new Error('Invalid authentication token'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`User connected: ${socket.userName} (${socket.userId})`);
      
      // Add user to online users
      if (socket.userId) {
        this.onlineUsers.set(socket.userId, {
          userId: socket.userId,
          socketId: socket.id,
          lastSeen: new Date()
        });

        // Join user to their personal room
        socket.join(`user_${socket.userId}`);

        // Notify user's contacts about online status
        this.broadcastUserOnlineStatus(socket.userId, true);
      }

      // Handle joining chat rooms
      socket.on('join_chat', async (chatId: string) => {
        try {
          if (!socket.userId) return;

          // Verify user is participant in the chat
          const chat = await this.chatRepository.findById(chatId);
          if (!chat || !chat.participants.includes(socket.userId)) {
            socket.emit('error', { message: 'You are not a participant in this chat' });
            return;
          }

          socket.join(`chat_${chatId}`);
          console.log(`${socket.userName} joined chat ${chatId}`);

          // Notify other participants that user joined
          socket.to(`chat_${chatId}`).emit('user_joined_chat', {
            userId: socket.userId,
            userName: socket.userName,
            chatId
          });
        } catch (error) {
          socket.emit('error', { message: 'Failed to join chat' });
        }
      });

      // Handle leaving chat rooms
      socket.on('leave_chat', (chatId: string) => {
        socket.leave(`chat_${chatId}`);
        console.log(`${socket.userName} left chat ${chatId}`);

        // Notify other participants that user left
        socket.to(`chat_${chatId}`).emit('user_left_chat', {
          userId: socket.userId,
          userName: socket.userName,
          chatId
        });
      });

      // Handle sending messages
      socket.on('send_message', async (data: {
        chatId: string;
        content: string;
        messageType: string;
        receiverId?: string;
        fileUrl?: string;
        fileName?: string;
        replyToMessageId?: string;
      }) => {
        try {
          if (!socket.userId) return;

          // Create message in database (using the chat service would be better)
          const message = await this.messageRepository.create({
            chatId: data.chatId,
            senderId: socket.userId,
            receiverId: data.receiverId,
            content: data.content,
            messageType: data.messageType as any,
            status: MessageStatus.SENT,
            fileUrl: data.fileUrl,
            fileName: data.fileName,
            replyToMessageId: data.replyToMessageId
          });

          // Update chat's last message
          await this.chatRepository.updateLastMessage(data.chatId, {
            content: data.content,
            senderId: socket.userId,
            timestamp: new Date(),
            messageType: data.messageType as any
          });

          // Get complete message with populated fields
          const completeMessage = await this.messageRepository.findById(message._id!);

          if (completeMessage) {
            const socketMessage: ISocketMessage = {
              messageId: completeMessage._id!,
              chatId: data.chatId,
              senderId: socket.userId,
              senderName: socket.userName!,
              content: data.content,
              messageType: data.messageType as any,
              timestamp: completeMessage.createdAt!,
              receiverId: data.receiverId,
              fileUrl: data.fileUrl,
              fileName: data.fileName,
              replyToMessageId: data.replyToMessageId
            };

            // Emit to chat room
            this.io.to(`chat_${data.chatId}`).emit('new_message', socketMessage);

            // Send push notification to offline users
            await this.sendNotificationToOfflineUsers(data.chatId, socketMessage);
          }
        } catch (error) {
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      // Handle typing indicators
      socket.on('typing_start', (data: { chatId: string }) => {
        if (!socket.userId || !socket.userName) return;

        const typingData: ITypingIndicator = {
          chatId: data.chatId,
          userId: socket.userId,
          userName: socket.userName,
          isTyping: true
        };

        socket.to(`chat_${data.chatId}`).emit('user_typing', typingData);
      });

      socket.on('typing_stop', (data: { chatId: string }) => {
        if (!socket.userId || !socket.userName) return;

        const typingData: ITypingIndicator = {
          chatId: data.chatId,
          userId: socket.userId,
          userName: socket.userName,
          isTyping: false
        };

        socket.to(`chat_${data.chatId}`).emit('user_typing', typingData);
      });

      // Handle message status updates
      socket.on('message_delivered', async (data: { messageId: string; chatId: string }) => {
        try {
          await this.messageRepository.updateMessageStatus(data.messageId, MessageStatus.DELIVERED);
          
          const statusUpdate: IMessageDeliveryStatus = {
            messageId: data.messageId,
            chatId: data.chatId,
            status: MessageStatus.DELIVERED,
            timestamp: new Date()
          };

          socket.to(`chat_${data.chatId}`).emit('message_status_update', statusUpdate);
        } catch (error) {
          console.error('Failed to update message delivery status:', error);
        }
      });

      socket.on('message_read', async (data: { messageId: string; chatId: string }) => {
        try {
          if (!socket.userId) return;

          await this.messageRepository.markAsRead(data.messageId, socket.userId);
          
          const statusUpdate: IMessageDeliveryStatus = {
            messageId: data.messageId,
            chatId: data.chatId,
            status: MessageStatus.READ,
            timestamp: new Date()
          };

          socket.to(`chat_${data.chatId}`).emit('message_status_update', statusUpdate);
        } catch (error) {
          console.error('Failed to update message read status:', error);
        }
      });

      // Handle requesting online users
      socket.on('get_online_users', (chatId: string) => {
        this.getOnlineUsersInChat(chatId).then(onlineUsers => {
          socket.emit('online_users', { chatId, onlineUsers });
        });
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.userName} (${socket.userId})`);
        
        if (socket.userId) {
          this.onlineUsers.delete(socket.userId);
          this.broadcastUserOnlineStatus(socket.userId, false);
        }
      });
    });
  }

  private async broadcastUserOnlineStatus(userId: string, isOnline: boolean) {
    try {
      // Get user's chats to notify participants
      const userChats = await this.chatRepository.findUserChats(userId);
      
      userChats.forEach(chat => {
        this.io.to(`chat_${chat._id}`).emit('user_online_status', {
          userId,
          isOnline,
          timestamp: new Date()
        });
      });
    } catch (error) {
      console.error('Failed to broadcast user online status:', error);
    }
  }

  private async getOnlineUsersInChat(chatId: string): Promise<IOnlineUser[]> {
    try {
      const chat = await this.chatRepository.findById(chatId);
      if (!chat) return [];

      const onlineUsersInChat: IOnlineUser[] = [];
      
      chat.participants.forEach(participantId => {
        const onlineUser = this.onlineUsers.get(participantId);
        if (onlineUser) {
          onlineUsersInChat.push(onlineUser);
        }
      });

      return onlineUsersInChat;
    } catch (error) {
      console.error('Failed to get online users in chat:', error);
      return [];
    }
  }

  private async sendNotificationToOfflineUsers(chatId: string, message: ISocketMessage) {
    try {
      const chat = await this.chatRepository.findById(chatId);
      if (!chat) return;

      const offlineParticipants = chat.participants.filter(participantId => 
        !this.onlineUsers.has(participantId) && participantId !== message.senderId
      );

      // Here you could integrate with a push notification service
      // For now, we'll just log the offline users
      if (offlineParticipants.length > 0) {
        console.log(`Sending push notification to offline users: ${offlineParticipants.join(', ')}`);
        // TODO: Implement push notification logic
      }
    } catch (error) {
      console.error('Failed to send notifications to offline users:', error);
    }
  }

  // Public method to emit events from outside the socket service
  public emitToUser(userId: string, event: string, data: any) {
    this.io.to(`user_${userId}`).emit(event, data);
  }

  public emitToChat(chatId: string, event: string, data: any) {
    this.io.to(`chat_${chatId}`).emit(event, data);
  }

  public getOnlineUsersCount(): number {
    return this.onlineUsers.size;
  }

  public isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }
}
