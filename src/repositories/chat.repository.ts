import Chat from '../models/Chat';
import { IChat, IChatWithDetails, ChatType } from '../types/chat.types';

export class ChatRepository {
  async create(chatData: Partial<IChat>): Promise<IChat> {
    const chat = new Chat(chatData);
    return await chat.save();
  }

  async findById(chatId: string): Promise<IChat | null> {
    return await Chat.findById(chatId)
      .populate('participantDetails')
      .populate('adminDetails')
      .populate('lastMessageSender');
  }

  async findDirectChat(userId1: string, userId2: string): Promise<IChat | null> {
    return await Chat.findOne({
      chatType: ChatType.DIRECT,
      participants: { $all: [userId1, userId2] },
      isActive: true
    }).populate('participantDetails');
  }

  async findUserChats(userId: string, page: number = 1, limit: number = 20): Promise<IChatWithDetails[]> {
    const skip = (page - 1) * limit;
    
    return await Chat.find({
      participants: userId,
      isActive: true
    })
    .populate('participantDetails')
    .populate('adminDetails')
    .populate('lastMessageSender')
    .sort({ 'lastMessage.timestamp': -1, updatedAt: -1 })
    .skip(skip)
    .limit(limit);
  }

  async updateLastMessage(chatId: string, lastMessage: any): Promise<IChat | null> {
    return await Chat.findByIdAndUpdate(
      chatId,
      { 
        lastMessage,
        updatedAt: new Date()
      },
      { new: true }
    );
  }

  async addParticipant(chatId: string, userId: string): Promise<IChat | null> {
    return await Chat.findByIdAndUpdate(
      chatId,
      { 
        $addToSet: { participants: userId },
        updatedAt: new Date()
      },
      { new: true }
    );
  }

  async removeParticipant(chatId: string, userId: string): Promise<IChat | null> {
    return await Chat.findByIdAndUpdate(
      chatId,
      { 
        $pull: { participants: userId },
        updatedAt: new Date()
      },
      { new: true }
    );
  }

  async addAdmin(chatId: string, userId: string): Promise<IChat | null> {
    return await Chat.findByIdAndUpdate(
      chatId,
      { 
        $addToSet: { adminIds: userId },
        updatedAt: new Date()
      },
      { new: true }
    );
  }

  async removeAdmin(chatId: string, userId: string): Promise<IChat | null> {
    return await Chat.findByIdAndUpdate(
      chatId,
      { 
        $pull: { adminIds: userId },
        updatedAt: new Date()
      },
      { new: true }
    );
  }

  async updateChatInfo(chatId: string, updateData: Partial<IChat>): Promise<IChat | null> {
    return await Chat.findByIdAndUpdate(
      chatId,
      { 
        ...updateData,
        updatedAt: new Date()
      },
      { new: true }
    ).populate('participantDetails').populate('adminDetails');
  }

  async softDeleteChat(chatId: string): Promise<IChat | null> {
    return await Chat.findByIdAndUpdate(
      chatId,
      { 
        isActive: false,
        deletedAt: new Date(),
        updatedAt: new Date()
      },
      { new: true }
    );
  }

  async findGroupChats(userId: string): Promise<IChat[]> {
    return await Chat.find({
      participants: userId,
      chatType: ChatType.GROUP,
      isActive: true
    })
    .populate('participantDetails')
    .populate('adminDetails')
    .sort({ updatedAt: -1 });
  }

  async countUserChats(userId: string): Promise<number> {
    return await Chat.countDocuments({
      participants: userId,
      isActive: true
    });
  }

  async searchChats(userId: string, searchTerm: string): Promise<IChat[]> {
    return await Chat.find({
      participants: userId,
      isActive: true,
      $or: [
        { title: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } }
      ]
    })
    .populate('participantDetails')
    .sort({ updatedAt: -1 })
    .limit(20);
  }

  // Add missing methods for tests
  async deleteMany(filter: any): Promise<void> {
    await Chat.deleteMany(filter);
  }
}
