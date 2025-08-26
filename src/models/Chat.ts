import mongoose, { Schema } from 'mongoose';
import { IChat, ChatType, MessageType } from '../types/chat.types';

const chatSchema = new Schema({
  chatType: {
    type: String,
    enum: Object.values(ChatType),
    required: true,
    default: ChatType.DIRECT
  },
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  title: {
    type: String,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  adminIds: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  lastMessage: {
    content: {
      type: String,
      trim: true
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    messageType: {
      type: String,
      enum: Object.values(MessageType),
      default: MessageType.TEXT
    }
  },
  isActive: {
    type: Boolean,
    default: true,
    required: true
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for better query performance
chatSchema.index({ participants: 1 });
chatSchema.index({ chatType: 1, isActive: 1 });
chatSchema.index({ 'lastMessage.timestamp': -1 });

// Compound index for direct chats to prevent duplicates
chatSchema.index({ 
  chatType: 1, 
  participants: 1 
}, { 
  unique: true, 
  partialFilterExpression: { 
    chatType: ChatType.DIRECT 
  } 
});

// Virtual for populate participant details
chatSchema.virtual('participantDetails', {
  ref: 'User',
  localField: 'participants',
  foreignField: '_id',
  select: 'full_name profile_image_url email role'
});

// Virtual for populate admin details
chatSchema.virtual('adminDetails', {
  ref: 'User',
  localField: 'adminIds',
  foreignField: '_id',
  select: 'full_name profile_image_url email'
});

// Virtual for populate last message sender details
chatSchema.virtual('lastMessageSender', {
  ref: 'User',
  localField: 'lastMessage.senderId',
  foreignField: '_id',
  justOne: true,
  select: 'full_name profile_image_url'
});

// Ensure virtual fields are serialized
chatSchema.set('toJSON', { virtuals: true });
chatSchema.set('toObject', { virtuals: true });

// Pre-save middleware to set title for direct chats
chatSchema.pre('save', function(next) {
  if (this.chatType === ChatType.DIRECT && !this.title && this.participants.length === 2) {
    // Title will be set dynamically in the service layer based on the other participant
    this.title = 'Direct Chat';
  }
  next();
});

// Method to check if user is participant
chatSchema.methods.isParticipant = function(userId: string): boolean {
  return this.participants.some((participantId: any) => participantId.toString() === userId);
};

// Method to check if user is admin (for group chats)
chatSchema.methods.isAdmin = function(userId: string): boolean {
  if (this.chatType === ChatType.DIRECT) return true;
  return this.adminIds?.some((adminId: any) => adminId.toString() === userId) || false;
};

// Static method to find direct chat between two users
chatSchema.statics.findDirectChat = function(userId1: string, userId2: string) {
  return this.findOne({
    chatType: ChatType.DIRECT,
    participants: { $all: [userId1, userId2] },
    isActive: true
  });
};

const Chat = mongoose.model<IChat>('Chat', chatSchema);

export default Chat;
