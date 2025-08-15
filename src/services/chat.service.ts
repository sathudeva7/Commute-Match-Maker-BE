import { ChatRepository } from '../repositories/chat.repository';
import { MessageRepository } from '../repositories/message.repository';
import { UserRepository } from '../repositories/user.repository';
import { 
  IChat, 
  IMessage, 
  IChatWithDetails,
  ICreateChatRequest, 
  ISendMessageRequest,
  ChatType,
  MessageType,
  MessageStatus
} from '../types/chat.types';
import { AppError } from '../utils/appError';

export class ChatService {
  private chatRepository: ChatRepository;
  private messageRepository: MessageRepository;
  private userRepository: UserRepository;

  constructor() {
    this.chatRepository = new ChatRepository();
    this.messageRepository = new MessageRepository();
    this.userRepository = new UserRepository();
  }

  async createChat(userId: string, chatData: ICreateChatRequest): Promise<IChat> {
    try {
      // Validate participants exist
      const participantIds = [...chatData.participantIds, userId];
      const uniqueParticipantIds = [...new Set(participantIds)];
      
      if (uniqueParticipantIds.length < 2) {
        throw new AppError('At least 2 participants required for a chat', 400);
      }

      // Check if all participants exist
      for (const participantId of uniqueParticipantIds) {
        const user = await this.userRepository.findById(participantId);
        if (!user) {
          throw new AppError(`User with ID ${participantId} not found`, 404);
        }
      }

      // For direct chats, check if chat already exists
      if (chatData.chatType === ChatType.DIRECT && uniqueParticipantIds.length === 2) {
        const existingChat = await this.chatRepository.findDirectChat(
          uniqueParticipantIds[0], 
          uniqueParticipantIds[1]
        );
        
        if (existingChat) {
          return existingChat;
        }
      }

      // Create new chat
      const newChat = await this.chatRepository.create({
        chatType: chatData.chatType,
        participants: uniqueParticipantIds,
        title: chatData.title,
        description: chatData.description,
        adminIds: chatData.chatType === ChatType.GROUP ? [userId] : undefined,
        isActive: true
      });

      return await this.chatRepository.findById(newChat._id!) || newChat;
    } catch (error) {
      throw error;
    }
  }

  async sendMessage(userId: string, messageData: ISendMessageRequest): Promise<IMessage> {
    try {
      // Validate chat exists and user is participant
      const chat = await this.chatRepository.findById(messageData.chatId);
      if (!chat) {
        throw new AppError('Chat not found', 404);
      }

      if (!chat.participants.includes(userId)) {
        throw new AppError('You are not a participant in this chat', 403);
      }

      if (!chat.isActive) {
        throw new AppError('Chat is inactive', 400);
      }

      // Validate receiver for direct messages
      let receiverId = messageData.receiverId;
      if (chat.chatType === ChatType.DIRECT && !receiverId) {
        receiverId = chat.participants.find(id => id !== userId);
      }

      // Create message
      const message = await this.messageRepository.create({
        chatId: messageData.chatId,
        senderId: userId,
        receiverId,
        content: messageData.content,
        messageType: messageData.messageType,
        status: MessageStatus.SENT,
        fileUrl: messageData.fileUrl,
        fileName: messageData.fileName,
        replyToMessageId: messageData.replyToMessageId
      });

      // Update chat's last message
      await this.chatRepository.updateLastMessage(messageData.chatId, {
        content: messageData.content,
        senderId: userId,
        timestamp: new Date(),
        messageType: messageData.messageType
      });

      return await this.messageRepository.findById(message._id!) || message;
    } catch (error) {
      throw error;
    }
  }

  async getChatMessages(
    userId: string, 
    chatId: string, 
    page: number = 1, 
    limit: number = 50
  ): Promise<IMessage[]> {
    try {
      // Validate chat exists and user is participant
      const chat = await this.chatRepository.findById(chatId);
      if (!chat) {
        throw new AppError('Chat not found', 404);
      }

      if (!chat.participants.includes(userId)) {
        throw new AppError('You are not a participant in this chat', 403);
      }

      return await this.messageRepository.findChatMessages(chatId, page, limit);
    } catch (error) {
      throw error;
    }
  }

  async getUserChats(userId: string, page: number = 1, limit: number = 20): Promise<IChatWithDetails[]> {
    try {
      const chats = await this.chatRepository.findUserChats(userId, page, limit);
      
      // Add unread count for each chat
      const chatsWithUnreadCount = await Promise.all(
        chats.map(async (chat) => {
          const unreadCount = await this.messageRepository.getUnreadMessagesCount(chat._id!, userId);
          
          // Set dynamic title for direct chats
          let chatTitle = chat.title;
          if (chat.chatType === ChatType.DIRECT && chat.participantDetails) {
            const otherParticipant = chat.participantDetails.find(p => p._id !== userId);
            chatTitle = otherParticipant?.full_name || 'Unknown User';
          }

          return {
            ...chat,
            title: chatTitle,
            unreadCount
          } as IChatWithDetails;
        })
      );

      return chatsWithUnreadCount;
    } catch (error) {
      throw error;
    }
  }

  async getChatById(userId: string, chatId: string): Promise<IChat> {
    try {
      const chat = await this.chatRepository.findById(chatId);
      if (!chat) {
        throw new AppError('Chat not found', 404);
      }

      if (!chat.participants.includes(userId)) {
        throw new AppError('You are not a participant in this chat', 403);
      }

      return chat;
    } catch (error) {
      throw error;
    }
  }

  async markMessagesAsRead(userId: string, chatId: string): Promise<void> {
    try {
      // Validate chat exists and user is participant
      const chat = await this.chatRepository.findById(chatId);
      if (!chat) {
        throw new AppError('Chat not found', 404);
      }

      if (!chat.participants.includes(userId)) {
        throw new AppError('You are not a participant in this chat', 403);
      }

      await this.messageRepository.markChatMessagesAsRead(chatId, userId);
    } catch (error) {
      throw error;
    }
  }

  async addParticipant(userId: string, chatId: string, participantId: string): Promise<IChat> {
    try {
      const chat = await this.chatRepository.findById(chatId);
      if (!chat) {
        throw new AppError('Chat not found', 404);
      }

      // Only group chat admins can add participants
      if (chat.chatType === ChatType.DIRECT) {
        throw new AppError('Cannot add participants to direct chats', 400);
      }

      if (!chat.adminIds?.includes(userId)) {
        throw new AppError('Only admins can add participants', 403);
      }

      // Check if participant exists
      const participant = await this.userRepository.findById(participantId);
      if (!participant) {
        throw new AppError('User not found', 404);
      }

      // Check if user is already a participant
      if (chat.participants.includes(participantId)) {
        throw new AppError('User is already a participant', 400);
      }

      const updatedChat = await this.chatRepository.addParticipant(chatId, participantId);
      if (!updatedChat) {
        throw new AppError('Failed to add participant', 500);
      }

      return updatedChat;
    } catch (error) {
      throw error;
    }
  }

  async removeParticipant(userId: string, chatId: string, participantId: string): Promise<IChat> {
    try {
      const chat = await this.chatRepository.findById(chatId);
      if (!chat) {
        throw new AppError('Chat not found', 404);
      }

      // For group chats, only admins can remove others (or users can remove themselves)
      if (chat.chatType === ChatType.GROUP) {
        if (userId !== participantId && !chat.adminIds?.includes(userId)) {
          throw new AppError('Only admins can remove other participants', 403);
        }
      } else {
        throw new AppError('Cannot remove participants from direct chats', 400);
      }

      const updatedChat = await this.chatRepository.removeParticipant(chatId, participantId);
      if (!updatedChat) {
        throw new AppError('Failed to remove participant', 500);
      }

      return updatedChat;
    } catch (error) {
      throw error;
    }
  }

  async updateChatInfo(userId: string, chatId: string, updateData: Partial<IChat>): Promise<IChat> {
    try {
      const chat = await this.chatRepository.findById(chatId);
      if (!chat) {
        throw new AppError('Chat not found', 404);
      }

      // Only group chat admins can update chat info
      if (chat.chatType === ChatType.GROUP && !chat.adminIds?.includes(userId)) {
        throw new AppError('Only admins can update chat information', 403);
      }

      if (chat.chatType === ChatType.DIRECT) {
        throw new AppError('Cannot update direct chat information', 400);
      }

      // Only allow updating specific fields
      const allowedUpdates = {
        title: updateData.title,
        description: updateData.description
      };

      const updatedChat = await this.chatRepository.updateChatInfo(chatId, allowedUpdates);
      if (!updatedChat) {
        throw new AppError('Failed to update chat information', 500);
      }

      return updatedChat;
    } catch (error) {
      throw error;
    }
  }

  async deleteChat(userId: string, chatId: string): Promise<void> {
    try {
      const chat = await this.chatRepository.findById(chatId);
      if (!chat) {
        throw new AppError('Chat not found', 404);
      }

      // Only group chat admins can delete chats, or participants can leave direct chats
      if (chat.chatType === ChatType.GROUP && !chat.adminIds?.includes(userId)) {
        throw new AppError('Only admins can delete group chats', 403);
      }

      await this.chatRepository.softDeleteChat(chatId);
    } catch (error) {
      throw error;
    }
  }

  async searchMessages(
    userId: string, 
    chatId: string, 
    searchTerm: string, 
    limit: number = 20
  ): Promise<IMessage[]> {
    try {
      // Validate chat exists and user is participant
      const chat = await this.chatRepository.findById(chatId);
      if (!chat) {
        throw new AppError('Chat not found', 404);
      }

      if (!chat.participants.includes(userId)) {
        throw new AppError('You are not a participant in this chat', 403);
      }

      return await this.messageRepository.searchMessages(chatId, searchTerm, limit);
    } catch (error) {
      throw error;
    }
  }

  async getUnreadMessagesCount(userId: string): Promise<number> {
    try {
      return await this.messageRepository.getUserUnreadMessagesCount(userId);
    } catch (error) {
      throw error;
    }
  }

  async deleteMessage(userId: string, messageId: string): Promise<void> {
    try {
      const message = await this.messageRepository.findById(messageId);
      if (!message) {
        throw new AppError('Message not found', 404);
      }

      // Only message sender can delete their message
      if (message.senderId !== userId) {
        throw new AppError('You can only delete your own messages', 403);
      }

      await this.messageRepository.deleteMessage(messageId);
    } catch (error) {
      throw error;
    }
  }

  async updateMessage(userId: string, messageId: string, content: string): Promise<IMessage> {
    try {
      const message = await this.messageRepository.findById(messageId);
      if (!message) {
        throw new AppError('Message not found', 404);
      }

      // Only message sender can edit their message
      if (message.senderId !== userId) {
        throw new AppError('You can only edit your own messages', 403);
      }

      // Only allow editing text messages
      if (message.messageType !== MessageType.TEXT) {
        throw new AppError('Only text messages can be edited', 400);
      }

      const updatedMessage = await this.messageRepository.updateMessage(messageId, { content });
      if (!updatedMessage) {
        throw new AppError('Failed to update message', 500);
      }

      return updatedMessage;
    } catch (error) {
      throw error;
    }
  }
}
