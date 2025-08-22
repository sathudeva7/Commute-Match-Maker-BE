export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  SYSTEM = 'system'
}

export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read'
}

export enum ChatType {
  DIRECT = 'direct',
  GROUP = 'group'
}

export interface IMessage {
  _id?: string;
  chatId: string;
  senderId: string;
  receiverId?: string; // For direct messages
  content: string;
  messageType: MessageType;
  status: MessageStatus;
  fileUrl?: string; // For image/file messages
  fileName?: string; // For file messages
  replyToMessageId?: string; // For replies
  createdAt?: Date;
  updatedAt?: Date;
  readBy?: Array<{
    userId: string;
    readAt: Date;
  }>;
}

export interface IChat {
  _id?: string;
  chatType: ChatType;
  participants: string[]; // Array of user IDs
  title?: string; // For group chats
  description?: string; // For group chats
  adminIds?: string[]; // For group chats
  lastMessage?: {
    content: string;
    senderId: string;
    timestamp: Date;
    messageType: MessageType;
  };
  isActive: boolean;
  deletedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IChatWithDetails extends IChat {
  participantDetails?: Array<{
    _id: string;
    full_name: string;
    profile_image_url?: string;
    email: string;
  }>;
  unreadCount?: number;
}

export interface ICreateChatRequest {
  chatType: ChatType;
  participantId?: string; // Single participant ID for direct chats
  participantIds?: string[]; // Multiple participant IDs for group chats (backward compatibility)
  title?: string;
  description?: string;
}

export interface ISendMessageRequest {
  chatId: string;
  content: string;
  messageType: MessageType;
  receiverId?: string;
  fileUrl?: string;
  fileName?: string;
  replyToMessageId?: string;
}

export interface ISocketMessage {
  messageId: string;
  chatId: string;
  senderId: string;
  senderName: string;
  content: string;
  messageType: MessageType;
  timestamp: Date;
  receiverId?: string;
  fileUrl?: string;
  fileName?: string;
  replyToMessageId?: string;
}

export interface IOnlineUser {
  userId: string;
  socketId: string;
  lastSeen: Date;
}

export interface ITypingIndicator {
  chatId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}

export interface IMessageDeliveryStatus {
  messageId: string;
  chatId: string;
  status: MessageStatus;
  timestamp: Date;
}
