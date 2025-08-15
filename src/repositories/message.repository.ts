import Message from '../models/Message';
import { IMessage, MessageStatus } from '../types/chat.types';

export class MessageRepository {
  async create(messageData: Partial<IMessage>): Promise<IMessage> {
    const message = new Message(messageData);
    return await message.save();
  }

  async findById(messageId: string): Promise<IMessage | null> {
    return await Message.findById(messageId)
      .populate('sender')
      .populate('receiver')
      .populate('replyToMessage');
  }

  async findChatMessages(
    chatId: string, 
    page: number = 1, 
    limit: number = 50
  ): Promise<IMessage[]> {
    const skip = (page - 1) * limit;
    
    return await Message.find({ chatId })
      .populate('sender')
      .populate('receiver')
      .populate('replyToMessage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  }

  async findMessagesBefore(
    chatId: string, 
    beforeDate: Date, 
    limit: number = 50
  ): Promise<IMessage[]> {
    return await Message.find({ 
      chatId,
      createdAt: { $lt: beforeDate }
    })
    .populate('sender')
    .populate('receiver')
    .populate('replyToMessage')
    .sort({ createdAt: -1 })
    .limit(limit);
  }

  async findMessagesAfter(
    chatId: string, 
    afterDate: Date, 
    limit: number = 50
  ): Promise<IMessage[]> {
    return await Message.find({ 
      chatId,
      createdAt: { $gt: afterDate }
    })
    .populate('sender')
    .populate('receiver')
    .populate('replyToMessage')
    .sort({ createdAt: 1 })
    .limit(limit);
  }

  async updateMessageStatus(
    messageId: string, 
    status: MessageStatus
  ): Promise<IMessage | null> {
    return await Message.findByIdAndUpdate(
      messageId,
      { status, updatedAt: new Date() },
      { new: true }
    );
  }

  async markAsRead(
    messageId: string, 
    userId: string
  ): Promise<IMessage | null> {
    return await Message.findByIdAndUpdate(
      messageId,
      {
        status: MessageStatus.READ,
        $addToSet: {
          readBy: {
            userId,
            readAt: new Date()
          }
        },
        updatedAt: new Date()
      },
      { new: true }
    );
  }

  async markChatMessagesAsRead(
    chatId: string,
    userId: string,
    beforeDate?: Date
  ): Promise<void> {
    const query: any = {
      chatId,
      senderId: { $ne: userId },
      status: { $ne: MessageStatus.READ },
      'readBy.userId': { $ne: userId }
    };

    if (beforeDate) {
      query.createdAt = { $lte: beforeDate };
    }

    await Message.updateMany(
      query,
      {
        status: MessageStatus.READ,
        $addToSet: {
          readBy: {
            userId,
            readAt: new Date()
          }
        },
        updatedAt: new Date()
      }
    );
  }

  async getUnreadMessagesCount(chatId: string, userId: string): Promise<number> {
    return await Message.countDocuments({
      chatId,
      senderId: { $ne: userId },
      status: { $ne: MessageStatus.READ },
      'readBy.userId': { $ne: userId }
    });
  }

  async getUserUnreadMessagesCount(userId: string): Promise<number> {
    return await Message.countDocuments({
      receiverId: userId,
      status: { $ne: MessageStatus.READ },
      'readBy.userId': { $ne: userId }
    });
  }

  async searchMessages(
    chatId: string,
    searchTerm: string,
    limit: number = 20
  ): Promise<IMessage[]> {
    return await Message.find({
      chatId,
      content: { $regex: searchTerm, $options: 'i' }
    })
    .populate('sender')
    .populate('receiver')
    .sort({ createdAt: -1 })
    .limit(limit);
  }

  async findUserMessages(
    userId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<IMessage[]> {
    const skip = (page - 1) * limit;
    
    return await Message.find({
      $or: [
        { senderId: userId },
        { receiverId: userId }
      ]
    })
    .populate('sender')
    .populate('receiver')
    .populate('replyToMessage')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  }

  async deleteMessage(messageId: string): Promise<boolean> {
    const result = await Message.findByIdAndDelete(messageId);
    return !!result;
  }

  async updateMessage(
    messageId: string,
    updateData: Partial<IMessage>
  ): Promise<IMessage | null> {
    return await Message.findByIdAndUpdate(
      messageId,
      { ...updateData, updatedAt: new Date() },
      { new: true }
    ).populate('sender').populate('receiver');
  }

  async getLastMessage(chatId: string): Promise<IMessage | null> {
    return await Message.findOne({ chatId })
      .populate('sender')
      .sort({ createdAt: -1 });
  }

  async countChatMessages(chatId: string): Promise<number> {
    return await Message.countDocuments({ chatId });
  }

  async findMessagesByIds(messageIds: string[]): Promise<IMessage[]> {
    return await Message.find({ _id: { $in: messageIds } })
      .populate('sender')
      .populate('receiver')
      .populate('replyToMessage');
  }

  // Add missing methods for tests
  async deleteMany(filter: any): Promise<void> {
    await Message.deleteMany(filter);
  }

  async findMessagesByUser(userId: string): Promise<IMessage[]> {
    return await Message.find({
      $or: [
        { senderId: userId },
        { receiverId: userId }
      ]
    })
    .populate('sender')
    .populate('receiver')
    .populate('replyToMessage')
    .sort({ createdAt: -1 });
  }

  async findMessagesByType(chatId: string, messageType: string): Promise<IMessage[]> {
    return await Message.find({
      chatId,
      messageType
    })
    .populate('sender')
    .populate('receiver')
    .populate('replyToMessage')
    .sort({ createdAt: -1 });
  }

  async getMessageStats(chatId: string): Promise<{
    totalMessages: number;
    textMessages: number;
    imageMessages: number;
    fileMessages: number;
    totalParticipants: number;
  }> {
    const [totalMessages, textMessages, imageMessages, fileMessages] = await Promise.all([
      Message.countDocuments({ chatId }),
      Message.countDocuments({ chatId, messageType: 'text' }),
      Message.countDocuments({ chatId, messageType: 'image' }),
      Message.countDocuments({ chatId, messageType: 'file' })
    ]);

    // Get unique participants from messages
    const participants = await Message.distinct('senderId', { chatId });
    const totalParticipants = participants.length;

    return {
      totalMessages,
      textMessages,
      imageMessages,
      fileMessages,
      totalParticipants
    };
  }
}
