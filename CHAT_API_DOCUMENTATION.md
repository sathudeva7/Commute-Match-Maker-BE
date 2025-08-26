# Real-Time Chat API Documentation

This document provides comprehensive information about the real-time chat functionality added to the Commute Match Maker backend.

## Overview

The chat system supports:
- Direct messages between users
- Group chats with multiple participants
- Real-time messaging using WebSocket connections
- Message status tracking (sent, delivered, read)
- Typing indicators
- Online/offline user status
- Message search functionality
- File/image sharing support
- Message replies
- Chat management (create, update, delete)

## Installation

### Dependencies Added

```bash
npm install socket.io@^4.7.5
npm install --save-dev @types/socket.io@^3.0.2
```

## API Endpoints

All chat endpoints require authentication via JWT token.

### Base URL: `/api/chat`

### Chat Management

#### Create Chat
```
POST /api/chat/
```

**Request Body:**
```json
{
  "participantId": "userId",  // For direct chats (only one participant needed)
  "chatType": "direct" | "group",
  "title": "Chat Title (required for group chats)",
  "description": "Chat Description (optional)"
}
```

**Examples:**

**Direct Chat:**
```json
{
  "participantId": "user2_id",
  "chatType": "direct"
}
```

**Group Chat:**
```json
{
  "participantIds": ["user2_id", "user3_id"],
  "chatType": "group",
  "title": "My Group Chat",
  "description": "A group chat for our team"
}
```

**Note:** For direct chats, you only need to provide the `participantId` of the other user. The current user's ID is automatically added from the authentication token. For group chats, you still need to provide an array of `participantIds`.

**Response:**
```json
{
  "success": true,
  "result": {
    "_id": "chatId",
    "chatType": "direct",
    "participants": ["userId1", "userId2"],
    "title": "Chat Title",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Chat created successfully"
}
```

#### Get User Chats
```
GET /api/chat/?page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "result": {
    "chats": [
      {
        "_id": "chatId",
        "chatType": "direct",
        "title": "John Doe",
        "lastMessage": {
          "content": "Hello!",
          "timestamp": "2024-01-01T00:00:00.000Z"
        },
        "unreadCount": 3,
        "participantDetails": [...]
      }
    ],
    "page": 1,
    "limit": 20,
    "total": 5
  },
  "message": "Chats retrieved successfully"
}
```

#### Get Chat by ID
```
GET /api/chat/:chatId
```

#### Update Chat Info (Group chats only)
```
PUT /api/chat/:chatId
```

**Request Body:**
```json
{
  "title": "New Chat Title",
  "description": "New Description"
}
```

#### Delete Chat
```
DELETE /api/chat/:chatId
```

### Message Management

#### Send Message
```
POST /api/chat/messages
```

**Request Body:**
```json
{
  "chatId": "chatId",
  "content": "Hello, world!",
  "messageType": "text" | "image" | "file" | "system",
  "receiverId": "userId (optional, for direct messages)",
  "fileUrl": "https://example.com/file.jpg (optional)",
  "fileName": "image.jpg (optional)",
  "replyToMessageId": "messageId (optional)"
}
```

#### Get Chat Messages
```
GET /api/chat/:chatId/messages?page=1&limit=50
```

#### Mark Messages as Read
```
PUT /api/chat/:chatId/read
```

#### Search Messages
```
GET /api/chat/:chatId/search?q=searchTerm&limit=20
```

#### Delete Message
```
DELETE /api/chat/messages/:messageId
```

#### Update Message
```
PUT /api/chat/messages/:messageId
```

**Request Body:**
```json
{
  "content": "Updated message content"
}
```

### Participant Management (Group Chats)

#### Add Participant
```
POST /api/chat/:chatId/participants
```

**Request Body:**
```json
{
  "participantId": "userId"
}
```

#### Remove Participant
```
DELETE /api/chat/:chatId/participants/:participantId
```

### Utility Endpoints

#### Get Unread Messages Count
```
GET /api/chat/unread/count
```

**Response:**
```json
{
  "success": true,
  "result": {
    "unreadCount": 15
  },
  "message": "Unread count retrieved successfully"
}
```

## WebSocket Events

### Client Connection

Connect to the WebSocket server with authentication:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'your_jwt_token'
  }
});
```

### Events You Can Emit

#### Join Chat Room
```javascript
socket.emit('join_chat', 'chatId');
```

#### Leave Chat Room
```javascript
socket.emit('leave_chat', 'chatId');
```

#### Send Message
```javascript
socket.emit('send_message', {
  chatId: 'chatId',
  content: 'Hello!',
  messageType: 'text',
  receiverId: 'userId (optional)',
  fileUrl: 'https://example.com/file.jpg (optional)',
  fileName: 'image.jpg (optional)',
  replyToMessageId: 'messageId (optional)'
});
```

#### Typing Indicators
```javascript
// Start typing
socket.emit('typing_start', { chatId: 'chatId' });

// Stop typing
socket.emit('typing_stop', { chatId: 'chatId' });
```

#### Message Status Updates
```javascript
// Mark message as delivered
socket.emit('message_delivered', { 
  messageId: 'messageId', 
  chatId: 'chatId' 
});

// Mark message as read
socket.emit('message_read', { 
  messageId: 'messageId', 
  chatId: 'chatId' 
});
```

#### Get Online Users
```javascript
socket.emit('get_online_users', 'chatId');
```

### Events You Can Listen To

#### New Message
```javascript
socket.on('new_message', (data) => {
  console.log('New message:', data);
  // data: ISocketMessage
});
```

#### User Typing
```javascript
socket.on('user_typing', (data) => {
  console.log('User typing:', data);
  // data: ITypingIndicator
});
```

#### Message Status Updates
```javascript
socket.on('message_status_update', (data) => {
  console.log('Message status update:', data);
  // data: IMessageDeliveryStatus
});
```

#### User Online Status
```javascript
socket.on('user_online_status', (data) => {
  console.log('User online status:', data);
  // data: { userId, isOnline, timestamp }
});
```

#### Online Users List
```javascript
socket.on('online_users', (data) => {
  console.log('Online users:', data);
  // data: { chatId, onlineUsers: IOnlineUser[] }
});
```

#### Chat Events
```javascript
socket.on('user_joined_chat', (data) => {
  console.log('User joined chat:', data);
});

socket.on('user_left_chat', (data) => {
  console.log('User left chat:', data);
});
```

#### Error Handling
```javascript
socket.on('error', (data) => {
  console.error('Socket error:', data);
});
```

## Data Models

### Chat Model
```typescript
interface IChat {
  _id?: string;
  chatType: 'direct' | 'group';
  participants: string[]; // User IDs
  title?: string;
  description?: string;
  adminIds?: string[]; // For group chats
  lastMessage?: {
    content: string;
    senderId: string;
    timestamp: Date;
    messageType: MessageType;
  };
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
```

### Message Model
```typescript
interface IMessage {
  _id?: string;
  chatId: string;
  senderId: string;
  receiverId?: string;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  status: 'sent' | 'delivered' | 'read';
  fileUrl?: string;
  fileName?: string;
  replyToMessageId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  readBy?: Array<{
    userId: string;
    readAt: Date;
  }>;
}
```

## Frontend Integration Example

### React Chat Component Example

```javascript
import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const ChatComponent = ({ userToken, chatId }) => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    // Initialize socket connection
    const socketConnection = io('http://localhost:3000', {
      auth: { token: userToken }
    });

    setSocket(socketConnection);

    // Join chat room
    socketConnection.emit('join_chat', chatId);

    // Listen for new messages
    socketConnection.on('new_message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    // Listen for typing indicators
    socketConnection.on('user_typing', (data) => {
      // Handle typing indicator
    });

    return () => {
      socketConnection.disconnect();
    };
  }, [userToken, chatId]);

  const sendMessage = () => {
    if (socket && newMessage.trim()) {
      socket.emit('send_message', {
        chatId,
        content: newMessage,
        messageType: 'text'
      });
      setNewMessage('');
    }
  };

  const handleTyping = () => {
    if (socket) {
      socket.emit('typing_start', { chatId });
      
      // Stop typing after 3 seconds of inactivity
      setTimeout(() => {
        socket.emit('typing_stop', { chatId });
      }, 3000);
    }
  };

  return (
    <div>
      <div className="messages">
        {messages.map(message => (
          <div key={message.messageId}>
            <strong>{message.senderName}:</strong> {message.content}
          </div>
        ))}
      </div>
      
      <div className="message-input">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') sendMessage();
            else handleTyping();
          }}
          placeholder="Type a message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
};

export default ChatComponent;
```

## Environment Variables

Add these to your `.env` file:

```
FRONTEND_URL=http://localhost:3000  # Your frontend URL for CORS
JWT_SECRET=your_jwt_secret_key
```

## Error Handling

All API endpoints return standardized error responses:

```json
{
  "success": false,
  "result": null,
  "message": "Error description"
}
```

Common HTTP status codes:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (permission denied)
- `404` - Not Found (resource not found)
- `500` - Internal Server Error

## Security Considerations

1. **Authentication**: All chat endpoints require valid JWT tokens
2. **Authorization**: Users can only access chats they're participants in
3. **Input Validation**: All message content is validated and sanitized
4. **Rate Limiting**: Consider implementing rate limiting for message sending
5. **File Uploads**: Implement proper file validation and virus scanning

## Performance Considerations

1. **Pagination**: Messages and chats are paginated by default
2. **Indexing**: Database indexes are created for optimal query performance
3. **Connection Management**: WebSocket connections are properly managed
4. **Memory Usage**: Online users list is stored in memory for quick access

## Testing

### Test WebSocket Connection

```javascript
// Simple test script
const io = require('socket.io-client');

const socket = io('http://localhost:3000', {
  auth: { token: 'your_test_token' }
});

socket.on('connect', () => {
  console.log('Connected to chat server');
  
  // Join a test chat
  socket.emit('join_chat', 'test_chat_id');
  
  // Send a test message
  socket.emit('send_message', {
    chatId: 'test_chat_id',
    content: 'Hello from test!',
    messageType: 'text'
  });
});

socket.on('new_message', (data) => {
  console.log('Received message:', data);
});
```

## Future Enhancements

1. **Push Notifications**: Integrate with Firebase/APNs for mobile notifications
2. **Message Encryption**: Implement end-to-end encryption
3. **Voice Messages**: Support for audio message attachments
4. **Video Calls**: Integration with WebRTC for video calling
5. **Message Reactions**: Add emoji reactions to messages
6. **Message Forwarding**: Allow forwarding messages between chats
7. **Chat Archiving**: Archive old chats instead of deleting
8. **User Blocking**: Block/unblock functionality
9. **Admin Controls**: Advanced admin controls for group management
10. **Analytics**: Chat usage analytics and reporting
