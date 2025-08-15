import { Request, Response, NextFunction } from 'express';
import { ChatService } from '../services/chat.service';
import { AuthenticatedRequest } from '../types/user.types';
import { ICreateChatRequest, ISendMessageRequest, ChatType, MessageType } from '../types/chat.types';
import { ApiResponse } from '../types/response.types';

export class ChatController {
  private chatService: ChatService;

  constructor() {
    this.chatService = new ChatService();
  }

  // Create a new chat
  createChat = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        res.status(401).json({
          success: false,
          result: null,
          message: 'User not authenticated'
        } as ApiResponse);
        return;
      }

      const chatData: ICreateChatRequest = {
        chatType: req.body.chatType || ChatType.DIRECT,
        participantIds: req.body.participantIds || [],
        title: req.body.title,
        description: req.body.description
      };

      // Validation
      if (!chatData.participantIds || chatData.participantIds.length === 0) {
        res.status(400).json({
          success: false,
          result: null,
          message: 'At least one participant ID is required'
        } as ApiResponse);
        return;
      }

      if (chatData.chatType === ChatType.GROUP && !chatData.title) {
        res.status(400).json({
          success: false,
          result: null,
          message: 'Title is required for group chats'
        } as ApiResponse);
        return;
      }

      const chat = await this.chatService.createChat(userId, chatData);

      res.status(201).json({
        success: true,
        result: chat,
        message: 'Chat created successfully'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  };

  // Send a message
  sendMessage = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        res.status(401).json({
          success: false,
          result: null,
          message: 'User not authenticated'
        } as ApiResponse);
        return;
      }

      const messageData: ISendMessageRequest = {
        chatId: req.body.chatId,
        content: req.body.content,
        messageType: req.body.messageType || MessageType.TEXT,
        receiverId: req.body.receiverId,
        fileUrl: req.body.fileUrl,
        fileName: req.body.fileName,
        replyToMessageId: req.body.replyToMessageId
      };

      // Validation
      if (!messageData.chatId || !messageData.content) {
        res.status(400).json({
          success: false,
          result: null,
          message: 'Chat ID and content are required'
        } as ApiResponse);
        return;
      }

      const message = await this.chatService.sendMessage(userId, messageData);

      res.status(201).json({
        success: true,
        result: message,
        message: 'Message sent successfully'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  };

  // Get user's chats
  getUserChats = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        res.status(401).json({
          success: false,
          result: null,
          message: 'User not authenticated'
        } as ApiResponse);
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const chats = await this.chatService.getUserChats(userId, page, limit);

      res.status(200).json({
        success: true,
        result: {
          chats,
          page,
          limit,
          total: chats.length
        },
        message: 'Chats retrieved successfully'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  };

  // Get chat by ID
  getChatById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        res.status(401).json({
          success: false,
          result: null,
          message: 'User not authenticated'
        } as ApiResponse);
        return;
      }

      const chatId = req.params.chatId;
      if (!chatId) {
        res.status(400).json({
          success: false,
          result: null,
          message: 'Chat ID is required'
        } as ApiResponse);
        return;
      }

      const chat = await this.chatService.getChatById(userId, chatId);

      res.status(200).json({
        success: true,
        result: chat,
        message: 'Chat retrieved successfully'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  };

  // Get chat messages
  getChatMessages = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        res.status(401).json({
          success: false,
          result: null,
          message: 'User not authenticated'
        } as ApiResponse);
        return;
      }

      const chatId = req.params.chatId;
      if (!chatId) {
        res.status(400).json({
          success: false,
          result: null,
          message: 'Chat ID is required'
        } as ApiResponse);
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const messages = await this.chatService.getChatMessages(userId, chatId, page, limit);

      res.status(200).json({
        success: true,
        result: {
          messages,
          page,
          limit,
          total: messages.length
        },
        message: 'Messages retrieved successfully'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  };

  // Mark messages as read
  markMessagesAsRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        res.status(401).json({
          success: false,
          result: null,
          message: 'User not authenticated'
        } as ApiResponse);
        return;
      }

      const chatId = req.params.chatId;
      if (!chatId) {
        res.status(400).json({
          success: false,
          result: null,
          message: 'Chat ID is required'
        } as ApiResponse);
        return;
      }

      await this.chatService.markMessagesAsRead(userId, chatId);

      res.status(200).json({
        success: true,
        result: null,
        message: 'Messages marked as read successfully'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  };

  // Add participant to group chat
  addParticipant = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        res.status(401).json({
          success: false,
          result: null,
          message: 'User not authenticated'
        } as ApiResponse);
        return;
      }

      const chatId = req.params.chatId;
      const participantId = req.body.participantId;

      if (!chatId || !participantId) {
        res.status(400).json({
          success: false,
          result: null,
          message: 'Chat ID and participant ID are required'
        } as ApiResponse);
        return;
      }

      const updatedChat = await this.chatService.addParticipant(userId, chatId, participantId);

      res.status(200).json({
        success: true,
        result: updatedChat,
        message: 'Participant added successfully'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  };

  // Remove participant from group chat
  removeParticipant = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        res.status(401).json({
          success: false,
          result: null,
          message: 'User not authenticated'
        } as ApiResponse);
        return;
      }

      const chatId = req.params.chatId;
      const participantId = req.params.participantId;

      if (!chatId || !participantId) {
        res.status(400).json({
          success: false,
          result: null,
          message: 'Chat ID and participant ID are required'
        } as ApiResponse);
        return;
      }

      const updatedChat = await this.chatService.removeParticipant(userId, chatId, participantId);

      res.status(200).json({
        success: true,
        result: updatedChat,
        message: 'Participant removed successfully'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  };

  // Update chat information
  updateChatInfo = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        res.status(401).json({
          success: false,
          result: null,
          message: 'User not authenticated'
        } as ApiResponse);
        return;
      }

      const chatId = req.params.chatId;
      if (!chatId) {
        res.status(400).json({
          success: false,
          result: null,
          message: 'Chat ID is required'
        } as ApiResponse);
        return;
      }

      const updateData = {
        title: req.body.title,
        description: req.body.description
      };

      const updatedChat = await this.chatService.updateChatInfo(userId, chatId, updateData);

      res.status(200).json({
        success: true,
        result: updatedChat,
        message: 'Chat information updated successfully'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  };

  // Delete chat
  deleteChat = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        res.status(401).json({
          success: false,
          result: null,
          message: 'User not authenticated'
        } as ApiResponse);
        return;
      }

      const chatId = req.params.chatId;
      if (!chatId) {
        res.status(400).json({
          success: false,
          result: null,
          message: 'Chat ID is required'
        } as ApiResponse);
        return;
      }

      await this.chatService.deleteChat(userId, chatId);

      res.status(200).json({
        success: true,
        result: null,
        message: 'Chat deleted successfully'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  };

  // Search messages in a chat
  searchMessages = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        res.status(401).json({
          success: false,
          result: null,
          message: 'User not authenticated'
        } as ApiResponse);
        return;
      }

      const chatId = req.params.chatId;
      const searchTerm = req.query.q as string;

      if (!chatId || !searchTerm) {
        res.status(400).json({
          success: false,
          result: null,
          message: 'Chat ID and search term are required'
        } as ApiResponse);
        return;
      }

      const limit = parseInt(req.query.limit as string) || 20;

      const messages = await this.chatService.searchMessages(userId, chatId, searchTerm, limit);

      res.status(200).json({
        success: true,
        result: {
          messages,
          searchTerm,
          limit
        },
        message: 'Search completed successfully'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  };

  // Get unread messages count
  getUnreadCount = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        res.status(401).json({
          success: false,
          result: null,
          message: 'User not authenticated'
        } as ApiResponse);
        return;
      }

      const unreadCount = await this.chatService.getUnreadMessagesCount(userId);

      res.status(200).json({
        success: true,
        result: { unreadCount },
        message: 'Unread count retrieved successfully'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  };

  // Delete message
  deleteMessage = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        res.status(401).json({
          success: false,
          result: null,
          message: 'User not authenticated'
        } as ApiResponse);
        return;
      }

      const messageId = req.params.messageId;
      if (!messageId) {
        res.status(400).json({
          success: false,
          result: null,
          message: 'Message ID is required'
        } as ApiResponse);
        return;
      }

      await this.chatService.deleteMessage(userId, messageId);

      res.status(200).json({
        success: true,
        result: null,
        message: 'Message deleted successfully'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  };

  // Update message
  updateMessage = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        res.status(401).json({
          success: false,
          result: null,
          message: 'User not authenticated'
        } as ApiResponse);
        return;
      }

      const messageId = req.params.messageId;
      const content = req.body.content;

      if (!messageId || !content) {
        res.status(400).json({
          success: false,
          result: null,
          message: 'Message ID and content are required'
        } as ApiResponse);
        return;
      }

      const updatedMessage = await this.chatService.updateMessage(userId, messageId, content);

      res.status(200).json({
        success: true,
        result: updatedMessage,
        message: 'Message updated successfully'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  };
}
