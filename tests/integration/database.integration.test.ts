import { UserRepository } from '../../src/repositories/user.repository';
import { ChatRepository } from '../../src/repositories/chat.repository';
import { MessageRepository } from '../../src/repositories/message.repository';
import { JourneyRepository } from '../../src/repositories/journey.repository';
import { ChatType, MessageType, MessageStatus } from '../../src/types/chat.types';
import { TravelMode } from '../../src/types/journey.types';

describe('Database Integration Tests', () => {
  let userRepo: UserRepository;
  let chatRepo: ChatRepository;
  let messageRepo: MessageRepository;
  let journeyRepo: JourneyRepository;

  beforeAll(() => {
    userRepo = new UserRepository();
    chatRepo = new ChatRepository();
    messageRepo = new MessageRepository();
    journeyRepo = new JourneyRepository();
  });

  afterEach(async () => {
    // Clean up test data after each test
    await messageRepo.deleteMany({});
    await chatRepo.deleteMany({});
    await journeyRepo.deleteMany({});
    await userRepo.deleteMany({});
  });

  describe('User Repository Integration', () => {
    it('should create and find user', async () => {
      const userData = {
        full_name: 'John Doe',
        email: 'john@example.com',
        password: 'hashedpassword',
        date_of_birth: '1990-01-01',
        phone_number: '+1234567890',
        gender: 'MALE' as const
      };

      // Create user
      const createdUser = await userRepo.create(userData);
      expect(createdUser._id).toBeDefined();
      expect(createdUser.email).toBe(userData.email);

      // Find by email
      const foundUserByEmail = await userRepo.findByEmail(userData.email);
      expect(foundUserByEmail).toBeTruthy();
      expect(foundUserByEmail!._id).toEqual(createdUser._id);

      // Find by ID
      const foundUserById = await userRepo.findById(createdUser._id!);
      expect(foundUserById).toBeTruthy();
      expect(foundUserById!.email).toBe(userData.email);
    });

    it('should update user and matching preferences', async () => {
      const userData = {
        full_name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'hashedpassword',
        date_of_birth: '1992-05-15',
        phone_number: '+0987654321',
        gender: 'FEMALE' as const
      };

      const createdUser = await userRepo.create(userData);

      // Update basic info
      const updateData = {
        full_name: 'Jane Updated Doe',
        phone_number: '+9999999999'
      };

      const updatedUser = await userRepo.update(createdUser._id!, updateData);
      expect(updatedUser).toBeTruthy();
      expect(updatedUser!.full_name).toBe(updateData.full_name);
      expect(updatedUser!.phone_number).toBe(updateData.phone_number);

      // Update matching preferences
      const preferencesData = {
        preferred_commute_time: {
          start: '08:00',
          end: '09:00'
        },
        preferred_commute_days: ['MONDAY', 'TUESDAY', 'WEDNESDAY'],
        preferred_age_range: {
          min: 25,
          max: 35
        },
        max_distance: 5,
        preferred_vehicle_type: 'CAR',
        preferred_gender: 'ANY',
        smoking_preference: 'NON_SMOKER',
        music_preference: 'YES'
      };

      await userRepo.updateMatchingPreferences(createdUser._id!, preferencesData);

      // Verify preferences were saved
      const userWithPreferences = await userRepo.findWithPreferences(createdUser._id!);
      expect(userWithPreferences).toBeTruthy();
      // Note: Actual implementation might need to populate preferences
    });

    it('should handle user pagination and filtering', async () => {
      // Create multiple users
      const users = [
        {
          full_name: 'User 1',
          email: 'user1@example.com',
          password: 'password',
          gender: 'MALE' as const
        },
        {
          full_name: 'User 2',
          email: 'user2@example.com',
          password: 'password',
          gender: 'FEMALE' as const
        },
        {
          full_name: 'User 3',
          email: 'user3@example.com',
          password: 'password',
          gender: 'MALE' as const
        }
      ];

      for (const user of users) {
        await userRepo.create(user);
      }

      // Test pagination
      const page1Users = await userRepo.findAll(1, 2);
      expect(page1Users).toHaveLength(2);

      const page2Users = await userRepo.findAll(2, 2);
      expect(page2Users).toHaveLength(1);

      // Test filtering
      const maleUsers = await userRepo.findAll(1, 10, { gender: 'MALE' });
      expect(maleUsers).toHaveLength(2);

      const femaleUsers = await userRepo.findAll(1, 10, { gender: 'FEMALE' });
      expect(femaleUsers).toHaveLength(1);

      // Test count
      const totalCount = await userRepo.count();
      expect(totalCount).toBe(3);

      const maleCount = await userRepo.count({ gender: 'MALE' });
      expect(maleCount).toBe(2);
    });
  });

  describe('Chat Repository Integration', () => {
    let user1: any;
    let user2: any;
    let user3: any;

    beforeEach(async () => {
      // Create test users
      user1 = await userRepo.create({
        full_name: 'User One',
        email: 'user1@test.com',
        password: 'password',
        gender: 'MALE'
      });

      user2 = await userRepo.create({
        full_name: 'User Two',
        email: 'user2@test.com',
        password: 'password',
        gender: 'FEMALE'
      });

      user3 = await userRepo.create({
        full_name: 'User Three',
        email: 'user3@test.com',
        password: 'password',
        gender: 'MALE'
      });
    });

    it('should create and manage direct chat', async () => {
      // Create direct chat
      const chatData = {
        chatType: ChatType.DIRECT,
        participants: [user1._id, user2._id],
        isActive: true
      };

      const createdChat = await chatRepo.create(chatData);
      expect(createdChat._id).toBeDefined();
      expect(createdChat.participants).toHaveLength(2);
      expect(createdChat.chatType).toBe(ChatType.DIRECT);

      // Find direct chat between users
      const foundDirectChat = await chatRepo.findDirectChat(user1._id, user2._id);
      expect(foundDirectChat).toBeTruthy();
      expect(foundDirectChat!._id).toEqual(createdChat._id);

      // Find user chats
      const user1Chats = await chatRepo.findUserChats(user1._id);
      expect(user1Chats).toHaveLength(1);
      expect(user1Chats[0]._id).toEqual(createdChat._id);

      const user2Chats = await chatRepo.findUserChats(user2._id);
      expect(user2Chats).toHaveLength(1);

      // User3 should have no chats
      const user3Chats = await chatRepo.findUserChats(user3._id);
      expect(user3Chats).toHaveLength(0);
    });

    it('should create and manage group chat', async () => {
      // Create group chat
      const groupChatData = {
        chatType: ChatType.GROUP,
        participants: [user1._id, user2._id, user3._id],
        title: 'Test Group',
        description: 'A test group chat',
        adminIds: [user1._id],
        isActive: true
      };

      const createdGroupChat = await chatRepo.create(groupChatData);
      expect(createdGroupChat.chatType).toBe(ChatType.GROUP);
      expect(createdGroupChat.participants).toHaveLength(3);
      expect(createdGroupChat.title).toBe('Test Group');

      // Add participant
      const updatedChat = await chatRepo.addParticipant(createdGroupChat._id!, user3._id);
      expect(updatedChat).toBeTruthy();
      // Note: This would fail in real implementation without valid user ID

      // Update chat info
      const updateData = {
        title: 'Updated Group Title',
        description: 'Updated description'
      };

      const updatedChatInfo = await chatRepo.updateChatInfo(createdGroupChat._id!, updateData);
      expect(updatedChatInfo!.title).toBe('Updated Group Title');
      expect(updatedChatInfo!.description).toBe('Updated description');

      // Update last message
      const lastMessageData = {
        content: 'Latest message',
        senderId: user1._id,
        timestamp: new Date(),
        messageType: MessageType.TEXT
      };

      const chatWithLastMessage = await chatRepo.updateLastMessage(createdGroupChat._id!, lastMessageData);
      expect(chatWithLastMessage!.lastMessage.content).toBe('Latest message');
    });

    it('should handle chat soft deletion', async () => {
      const chatData = {
        chatType: ChatType.DIRECT,
        participants: [user1._id, user2._id],
        isActive: true
      };

      const createdChat = await chatRepo.create(chatData);

      // Soft delete chat
      const deletedChat = await chatRepo.softDeleteChat(createdChat._id!);
      expect(deletedChat!.isActive).toBe(false);
      expect(deletedChat!.deletedAt).toBeDefined();

      // Should not appear in user chats anymore
      const userChatsAfterDelete = await chatRepo.findUserChats(user1._id);
      expect(userChatsAfterDelete).toHaveLength(0);
    });
  });

  describe('Message Repository Integration', () => {
    let user1: any;
    let user2: any;
    let chat: any;

    beforeEach(async () => {
      // Create test users and chat
      user1 = await userRepo.create({
        full_name: 'Sender',
        email: 'sender@test.com',
        password: 'password',
        gender: 'MALE'
      });

      user2 = await userRepo.create({
        full_name: 'Receiver',
        email: 'receiver@test.com',
        password: 'password',
        gender: 'FEMALE'
      });

      chat = await chatRepo.create({
        chatType: ChatType.DIRECT,
        participants: [user1._id, user2._id],
        isActive: true
      });
    });

    it('should create and manage messages', async () => {
      // Create message
      const messageData = {
        chatId: chat._id,
        senderId: user1._id,
        receiverId: user2._id,
        content: 'Hello world!',
        messageType: MessageType.TEXT,
        status: MessageStatus.SENT
      };

      const createdMessage = await messageRepo.create(messageData);
      expect(createdMessage._id).toBeDefined();
      expect(createdMessage.content).toBe(messageData.content);
      expect(createdMessage.senderId).toBe(user1._id);

      // Find message by ID
      const foundMessage = await messageRepo.findById(createdMessage._id!);
      expect(foundMessage).toBeTruthy();
      expect(foundMessage!.content).toBe(messageData.content);

      // Update message
      const updateData = { content: 'Updated message content' };
      const updatedMessage = await messageRepo.updateMessage(createdMessage._id!, updateData);
      expect(updatedMessage!.content).toBe(updateData.content);
      expect(updatedMessage!.updatedAt).toBeDefined();

      // Mark as read
      const readMessage = await messageRepo.markAsRead(createdMessage._id!, user2._id);
      expect(readMessage).toBeTruthy();
      expect(readMessage!.readBy).toHaveLength(1);
      expect(readMessage!.readBy[0].userId).toStrictEqual(user2._id);

      // Update status
      const statusUpdatedMessage = await messageRepo.updateMessageStatus(
        createdMessage._id!,
        MessageStatus.DELIVERED
      );
      expect(statusUpdatedMessage!.status).toBe(MessageStatus.DELIVERED);
    });

    it('should handle chat messages and pagination', async () => {
      // Create multiple messages
      const messages = [
        'First message',
        'Second message',
        'Third message',
        'Fourth message',
        'Fifth message'
      ];

      for (const content of messages) {
        await messageRepo.create({
          chatId: chat._id,
          senderId: user1._id,
          receiverId: user2._id,
          content: content,
          messageType: MessageType.TEXT,
          status: MessageStatus.SENT
        });
      }

      // Get chat messages with pagination
      const page1Messages = await messageRepo.findChatMessages(chat._id, 1, 3);
      expect(page1Messages).toHaveLength(3);

      const page2Messages = await messageRepo.findChatMessages(chat._id, 2, 3);
      expect(page2Messages).toHaveLength(2);

      // All messages should be sorted by creation time (newest first)
      const allMessages = await messageRepo.findChatMessages(chat._id, 1, 10);
      expect(allMessages).toHaveLength(5);
      expect(allMessages[0].content).toBe('Fifth message'); // Most recent first
    });

    it('should handle message search and filtering', async () => {
      // Create messages with different content
      const messageContents = [
        'Hello world',
        'Good morning everyone',
        'Hello there',
        'How are you doing',
        'World peace is important'
      ];

      for (const content of messageContents) {
        await messageRepo.create({
          chatId: chat._id,
          senderId: user1._id,
          receiverId: user2._id,
          content: content,
          messageType: MessageType.TEXT,
          status: MessageStatus.SENT
        });
      }

      // Search for messages containing "hello"
      const helloMessages = await messageRepo.searchMessages(chat._id, 'hello');
      expect(helloMessages).toHaveLength(2);

      // Search for messages containing "world"
      const worldMessages = await messageRepo.searchMessages(chat._id, 'world');
      expect(worldMessages).toHaveLength(2);

      // Find messages by user
      const userMessages = await messageRepo.findMessagesByUser(user1._id);
      expect(userMessages).toHaveLength(5);

      // Find messages by type
      const textMessages = await messageRepo.findMessagesByType(chat._id, MessageType.TEXT);
      expect(textMessages).toHaveLength(5);
    });

    it('should handle unread message counts', async () => {
      // Create messages from user1 to user2
      for (let i = 0; i < 3; i++) {
        await messageRepo.create({
          chatId: chat._id,
          senderId: user1._id,
          receiverId: user2._id,
          content: `Message ${i + 1}`,
          messageType: MessageType.TEXT,
          status: MessageStatus.SENT
        });
      }

      // Check unread count for user2
      const unreadCount = await messageRepo.getUnreadMessagesCount(chat._id, user2._id);
      expect(unreadCount).toBe(3);

      // Check total unread count for user2
      const totalUnreadCount = await messageRepo.getUserUnreadMessagesCount(user2._id);
      expect(totalUnreadCount).toBe(3);

      // Mark all messages as read
      await messageRepo.markChatMessagesAsRead(chat._id, user2._id);

      // Check unread count again
      const unreadCountAfterRead = await messageRepo.getUnreadMessagesCount(chat._id, user2._id);
      expect(unreadCountAfterRead).toBe(0);
    });

    it('should handle message statistics', async () => {
      // Create different types of messages
      await messageRepo.create({
        chatId: chat._id,
        senderId: user1._id,
        content: 'Text message 1',
        messageType: MessageType.TEXT,
        status: MessageStatus.SENT
      });

      await messageRepo.create({
        chatId: chat._id,
        senderId: user1._id,
        content: 'Text message 2',
        messageType: MessageType.TEXT,
        status: MessageStatus.SENT
      });

      await messageRepo.create({
        chatId: chat._id,
        senderId: user2._id,
        content: 'Image caption',
        messageType: MessageType.IMAGE,
        status: MessageStatus.SENT
      });

      // Get message statistics
      const stats = await messageRepo.getMessageStats(chat._id);
      expect(stats.totalMessages).toBe(3);
      expect(stats.textMessages).toBe(2);
      expect(stats.imageMessages).toBe(1);
      expect(stats.fileMessages).toBe(0);
      expect(stats.totalParticipants).toBe(2);
    });
  });

  describe('Journey Repository Integration', () => {
    let user: any;

    beforeEach(async () => {
      user = await userRepo.create({
        full_name: 'Journey User',
        email: 'journey@test.com',
        password: 'password',
        gender: 'MALE'
      });
    });

    it('should create and manage journeys', async () => {
      const journeyData = {
        travel_mode: TravelMode.BUS,
        route_id: 'route_123',
        start_point: 'Home',
        end_point: 'Work',
        departure_time: '08:00',
        arrival_time: '08:45',
        days_of_week: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
        description: 'Daily commute'
      };

      // Create journey
      const createdJourney = await journeyRepo.create(user._id, journeyData);
      expect(createdJourney._id).toBeDefined();
      expect(createdJourney.travel_mode).toBe(TravelMode.BUS);
      expect(createdJourney.user).toBe(user._id);

      // Find journey by ID
      const foundJourney = await journeyRepo.findById(createdJourney._id!);
      expect(foundJourney).toBeTruthy();
      expect(foundJourney!.route_id).toBe(journeyData.route_id);

      // Update journey
      const updateData = {
        end_point: 'Updated Work Location',
        arrival_time: '09:00'
      };

      const updatedJourney = await journeyRepo.update(createdJourney._id!, user._id, updateData);
      expect(updatedJourney).toBeTruthy();
      expect(updatedJourney!.end_point).toBe(updateData.end_point);
      expect(updatedJourney!.arrival_time).toBe(updateData.arrival_time);

      // Find user journeys
      const userJourneys = await journeyRepo.findByUser(user._id);
      expect(userJourneys).toHaveLength(1);
      expect(userJourneys[0]._id).toEqual(createdJourney._id);
    });

    it('should handle journey search and filtering', async () => {
      // Create multiple journeys
      const journeys = [
        {
          travel_mode: TravelMode.BUS,
          route_id: 'bus_route_1',
          start_point: 'Point A',
          end_point: 'Point B',
          departure_time: '08:00'
        },
        {
          travel_mode: TravelMode.TUBE,
          route_id: 'tube_line_1',
          start_point: 'Point C',
          end_point: 'Point D',
          departure_time: '08:30'
        },
        {
          travel_mode: TravelMode.BUS,
          route_id: 'bus_route_2',
          start_point: 'Point E',
          end_point: 'Point F',
          departure_time: '09:00'
        }
      ];

      for (const journey of journeys) {
        await journeyRepo.create(user._id, journey);
      }

      // Find all journeys
      const allJourneys = await journeyRepo.findAll();
      expect(allJourneys).toHaveLength(3);

      // Find journeys by travel mode
      const busJourneys = await journeyRepo.findAll({ travel_mode: TravelMode.BUS });
      expect(busJourneys).toHaveLength(2);

      const tubeJourneys = await journeyRepo.findAll({ travel_mode: TravelMode.TUBE });
      expect(tubeJourneys).toHaveLength(1);

      // Find journeys by route
      const route1Journeys = await journeyRepo.findByRoute(TravelMode.BUS, 'bus_route_1');
      expect(route1Journeys).toHaveLength(1);
      expect(route1Journeys[0].route_id).toBe('bus_route_1');

      // Count journeys
      const totalCount = await journeyRepo.count();
      expect(totalCount).toBe(3);

      const busCount = await journeyRepo.count({ travel_mode: TravelMode.BUS });
      expect(busCount).toBe(2);
    });

    it('should find similar journeys', async () => {
      // Create base journey
      const baseJourney = {
        travel_mode: TravelMode.BUS,
        route_id: 'route_123',
        start_point: 'Central Station',
        end_point: 'Business District',
        departure_time: '08:00'
      };

      await journeyRepo.create(user._id, baseJourney);

      // Create another user and similar journey
      const user2 = await userRepo.create({
        full_name: 'User Two',
        email: 'user2@test.com',
        password: 'password',
        gender: 'FEMALE'
      });

      const similarJourney = {
        travel_mode: TravelMode.BUS,
        route_id: 'route_123', // Same route
        start_point: 'Central Station', // Same start
        end_point: 'Business District', // Same end
        departure_time: '08:15' // Slightly different time
      };

      await journeyRepo.create(user2._id, similarJourney);

      // Find similar journeys for user1
      const similarJourneys = await journeyRepo.findSimilarJourneys(user._id, baseJourney);
      expect(similarJourneys).toHaveLength(1); // Should find user2's journey
      expect(similarJourneys[0].user._id).toStrictEqual(user2._id);
    });

    it('should handle journey deletion and authorization', async () => {
      const journeyData = {
        travel_mode: TravelMode.OVERGROUND,
        route_id: 'overground_1',
        start_point: 'Start',
        end_point: 'End',
        departure_time: '10:00'
      };

      const createdJourney = await journeyRepo.create(user._id, journeyData);

      // Create another user
      const otherUser = await userRepo.create({
        full_name: 'Other User',
        email: 'other@test.com',
        password: 'password',
        gender: 'MALE'
      });

      // Try to update journey as different user (should fail/return null)
      const unauthorizedUpdate = await journeyRepo.update(
        createdJourney._id!,
        otherUser._id,
        { end_point: 'Unauthorized update' }
      );
      expect(unauthorizedUpdate).toBeNull();

      // Try to delete journey as different user (should fail)
      const unauthorizedDelete = await journeyRepo.delete(createdJourney._id!, otherUser._id);
      expect(unauthorizedDelete).toBe(false);

      // Delete journey as owner (should succeed)
      const authorizedDelete = await journeyRepo.delete(createdJourney._id!, user._id);
      expect(authorizedDelete).toBe(true);

      // Verify journey is deleted
      const deletedJourney = await journeyRepo.findById(createdJourney._id!);
      expect(deletedJourney).toBeNull();
    });
  });

  describe('Cross-Repository Operations', () => {
    it('should handle complex multi-repository operations', async () => {
      // Create users
      const user1 = await userRepo.create({
        full_name: 'Alice',
        email: 'alice@test.com',
        password: 'password',
        gender: 'FEMALE'
      });

      const user2 = await userRepo.create({
        full_name: 'Bob',
        email: 'bob@test.com',
        password: 'password',
        gender: 'MALE'
      });

      // Create chat between users
      const chat = await chatRepo.create({
        chatType: ChatType.DIRECT,
        participants: [user1._id, user2._id],
        isActive: true
      });

      // Create journeys for both users
      const journey1 = await journeyRepo.create(user1._id, {
        travel_mode: TravelMode.BUS,
        route_id: 'shared_route',
        start_point: 'Station A',
        end_point: 'Station B',
        departure_time: '08:00'
      });

      const journey2 = await journeyRepo.create(user2._id, {
        travel_mode: TravelMode.BUS,
        route_id: 'shared_route',
        start_point: 'Station A',
        end_point: 'Station B',
        departure_time: '08:05'
      });

      // Send message about journey matching
      await messageRepo.create({
        chatId: chat._id,
        senderId: user1._id,
        receiverId: user2._id,
        content: `Hi! I noticed we have similar journeys on route ${journey1.route_id}. Would you like to commute together?`,
        messageType: MessageType.TEXT,
        status: MessageStatus.SENT
      });

      // Verify all relationships exist
      const chatMessages = await messageRepo.findChatMessages(chat._id);
      expect(chatMessages).toHaveLength(1);
      expect(chatMessages[0].content).toContain('similar journeys');

      const user1Chats = await chatRepo.findUserChats(user1._id);
      expect(user1Chats).toHaveLength(1);

      const user1Journeys = await journeyRepo.findByUser(user1._id);
      expect(user1Journeys).toHaveLength(1);

      const similarJourneys = await journeyRepo.findSimilarJourneys(user1._id, {
        travel_mode: TravelMode.BUS,
        route_id: 'shared_route',
        start_point: 'Station A',
        end_point: 'Station B',
        departure_time: '08:00'
      });
      expect(similarJourneys).toHaveLength(1);
      expect(similarJourneys[0].user._id).toStrictEqual(user2._id);
    });

    it('should maintain data integrity during cascading operations', async () => {
      // Create users
      const user1 = await userRepo.create({
        full_name: 'User 1',
        email: 'user1@integrity.test',
        password: 'password',
        gender: 'MALE'
      });

      const user2 = await userRepo.create({
        full_name: 'User 2',
        email: 'user2@integrity.test',
        password: 'password',
        gender: 'FEMALE'
      });

      // Create chat and messages
      const chat = await chatRepo.create({
        chatType: ChatType.DIRECT,
        participants: [user1._id, user2._id],
        isActive: true
      });

      // Create multiple messages
      const messageIds = [];
      for (let i = 0; i < 5; i++) {
        const message = await messageRepo.create({
          chatId: chat._id,
          senderId: user1._id,
          receiverId: user2._id,
          content: `Message ${i + 1}`,
          messageType: MessageType.TEXT,
          status: MessageStatus.SENT
        });
        messageIds.push(message._id);
      }

      // Mark some messages as read
      await messageRepo.markAsRead(messageIds[0], user2._id);
      await messageRepo.markAsRead(messageIds[1], user2._id);

      // Check unread count
      const unreadCount = await messageRepo.getUnreadMessagesCount(chat._id, user2._id);
      expect(unreadCount).toBe(3);

      // Soft delete chat
      await chatRepo.softDeleteChat(chat._id);

      // Verify chat is marked as inactive
      const deletedChat = await chatRepo.findById(chat._id);
      expect(deletedChat!.isActive).toBe(false);

      // Messages should still exist (soft delete doesn't cascade to messages)
      const chatMessages = await messageRepo.findChatMessages(chat._id);
      expect(chatMessages).toHaveLength(5);

      // But chat shouldn't appear in user's active chats
      const activeChats = await chatRepo.findUserChats(user1._id);
      expect(activeChats).toHaveLength(0);
    });
  });
});