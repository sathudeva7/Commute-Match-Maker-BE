import Chat from '../models/Chat';
import { IChat, IChatWithDetails, ChatType } from '../types/chat.types';

export class ChatRepository {
  async create(chatData: Partial<IChat>): Promise<IChat> {
    const chat = new Chat(chatData);
    const savedChat = await chat.save();
    return savedChat.toObject() as IChat;
  }

  async findById(chatId: string): Promise<IChat | null> {
    const chat = await Chat.findById(chatId)
      .populate('participantDetails')
      .populate('adminDetails')
      .populate('lastMessageSender');
    return chat ? chat.toObject() as IChat : null;
  }

  async findDirectChat(userId1: string, userId2: string): Promise<IChat | null> {
    const chat = await Chat.findOne({
      chatType: ChatType.DIRECT,
      participants: { $all: [userId1, userId2] },
      isActive: true
    }).populate('participantDetails');
    return chat ? chat.toObject() as IChat : null;
  }

  async findUserChats(userId: string, page: number = 1, limit: number = 20): Promise<IChatWithDetails[]> {
    const skip = (page - 1) * limit;
    
    const chats = await Chat.find({
      participants: userId,
      isActive: true
    })
    .populate('participantDetails')
    .populate('adminDetails')
    .populate('lastMessageSender')
    .sort({ 'lastMessage.timestamp': -1, updatedAt: -1 })
    .skip(skip)
    .limit(limit);
    
    return chats.map(chat => chat.toObject() as IChatWithDetails);
  }

  async updateLastMessage(chatId: string, lastMessage: any): Promise<IChat | null> {
    const chat = await Chat.findByIdAndUpdate(
      chatId,
      { 
        lastMessage,
        updatedAt: new Date()
      },
      { new: true }
    );
    return chat ? chat.toObject() as IChat : null;
  }

  async addParticipant(chatId: string, userId: string): Promise<IChat | null> {
    const chat = await Chat.findByIdAndUpdate(
      chatId,
      { 
        $addToSet: { participants: userId },
        updatedAt: new Date()
      },
      { new: true }
    );
    return chat ? chat.toObject() as IChat : null;
  }

  async removeParticipant(chatId: string, userId: string): Promise<IChat | null> {
    const chat = await Chat.findByIdAndUpdate(
      chatId,
      { 
        $pull: { participants: userId },
        updatedAt: new Date()
      },
      { new: true }
    );
    return chat ? chat.toObject() as IChat : null;
  }

  async addAdmin(chatId: string, userId: string): Promise<IChat | null> {
    const chat = await Chat.findByIdAndUpdate(
      chatId,
      { 
        $addToSet: { adminIds: userId },
        updatedAt: new Date()
      },
      { new: true }
    );
    return chat ? chat.toObject() as IChat : null;
  }

  async removeAdmin(chatId: string, userId: string): Promise<IChat | null> {
    const chat = await Chat.findByIdAndUpdate(
      chatId,
      { 
        $pull: { adminIds: userId },
        updatedAt: new Date()
      },
      { new: true }
    );
    return chat ? chat.toObject() as IChat : null;
  }

  async updateChatInfo(chatId: string, updateData: Partial<IChat>): Promise<IChat | null> {
    const chat = await Chat.findByIdAndUpdate(
      chatId,
      { 
        ...updateData,
        updatedAt: new Date()
      },
      { new: true }
    ).populate('participantDetails').populate('adminDetails');
    return chat ? chat.toObject() as IChat : null;
  }

  async softDeleteChat(chatId: string): Promise<IChat | null> {
    const chat = await Chat.findByIdAndUpdate(
      chatId,
      { 
        isActive: false,
        deletedAt: new Date(),
        updatedAt: new Date()
      },
      { new: true }
    );
    return chat ? chat.toObject() as IChat : null;
  }

  async findGroupChats(userId: string): Promise<IChat[]> {
    const chats = await Chat.find({
      participants: userId,
      chatType: ChatType.GROUP,
      isActive: true
    })
    .populate('participantDetails')
    .populate('adminDetails')
    .sort({ updatedAt: -1 });
    return chats.map(chat => chat.toObject() as IChat);
  }

  async countUserChats(userId: string): Promise<number> {
    return await Chat.countDocuments({
      participants: userId,
      isActive: true
    });
  }

  async searchChats(userId: string, searchTerm: string): Promise<IChat[]> {
    const chats = await Chat.find({
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
    return chats.map(chat => chat.toObject() as IChat);
  }

  // Add missing methods for tests
  async deleteMany(filter: any): Promise<void> {
    await Chat.deleteMany(filter);
  }
}
