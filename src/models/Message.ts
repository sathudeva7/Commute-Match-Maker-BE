import mongoose, { Schema } from 'mongoose';
import { IMessage, MessageType, MessageStatus } from '../types/chat.types';

const messageSchema = new Schema({
  chatId: {
    type: Schema.Types.ObjectId,
    ref: 'Chat',
    required: true,
    index: true
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  receiverId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000
  },
  messageType: {
    type: String,
    enum: Object.values(MessageType),
    default: MessageType.TEXT,
    required: true
  },
  status: {
    type: String,
    enum: Object.values(MessageStatus),
    default: MessageStatus.SENT,
    required: true
  },
  fileUrl: {
    type: String,
    trim: true
  },
  fileName: {
    type: String,
    trim: true
  },
  replyToMessageId: {
    type: Schema.Types.ObjectId,
    ref: 'Message'
  },
  readBy: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
messageSchema.index({ chatId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ chatId: 1, status: 1 });

// Virtual for populate sender details
messageSchema.virtual('sender', {
  ref: 'User',
  localField: 'senderId',
  foreignField: '_id',
  justOne: true,
  select: 'full_name profile_image_url email'
});

// Virtual for populate receiver details
messageSchema.virtual('receiver', {
  ref: 'User',
  localField: 'receiverId',
  foreignField: '_id',
  justOne: true,
  select: 'full_name profile_image_url email'
});

// Virtual for populate reply message details
messageSchema.virtual('replyToMessage', {
  ref: 'Message',
  localField: 'replyToMessageId',
  foreignField: '_id',
  justOne: true,
  select: 'content senderId messageType createdAt'
});

// Ensure virtual fields are serialized
messageSchema.set('toJSON', { virtuals: true });
messageSchema.set('toObject', { virtuals: true });

const Message = mongoose.model<IMessage>('Message', messageSchema);

export default Message;
