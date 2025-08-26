import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import Client from 'socket.io-client';
import userRoutes from '../../src/routes/user.routes';
import chatRoutes from '../../src/routes/chat.routes';
import journeyRoutes from '../../src/routes/journey.routes';
import { UserRepository } from '../../src/repositories/user.repository';
import { ChatRepository } from '../../src/repositories/chat.repository';
import { MessageRepository } from '../../src/repositories/message.repository';
import { JourneyRepository } from '../../src/repositories/journey.repository';
import { ChatType, MessageType } from '../../src/types/chat.types';
import { TravelMode } from '../../src/types/journey.types';

// Setup Express app for E2E testing
const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/user', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/journey', journeyRoutes);

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  res.status(err.statusCode || 500).json({
    success: false,
    result: null,
    message: err.message || 'Internal server error'
  });
});

describe('End-to-End User Journey Tests', () => {
  let server: HttpServer;
  let io: SocketIOServer;
  let userRepo: UserRepository;
  let chatRepo: ChatRepository;
  let messageRepo: MessageRepository;
  let journeyRepo: JourneyRepository;
  let port: number;

  beforeAll(async () => {
    // Initialize repositories
    userRepo = new UserRepository();
    chatRepo = new ChatRepository();
    messageRepo = new MessageRepository();
    journeyRepo = new JourneyRepository();

    // Setup server for socket testing
    server = new HttpServer(app);
    io = new SocketIOServer(server, {
      cors: { origin: "*", methods: ["GET", "POST"] }
    });

    // Start server
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        port = (server.address() as any).port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    io.close();
    server.close();
  });

  afterEach(async () => {
    // Clean up test data
    await messageRepo.deleteMany({});
    await chatRepo.deleteMany({});
    await journeyRepo.deleteMany({});
    await userRepo.deleteMany({});
  });

  describe('Complete User Journey: Registration to Journey Matching', () => {
    it('should complete full user journey from registration to finding commute partners', async () => {
      // Step 1: User Registration
      const user1Data = {
        full_name: 'Alice Johnson',
        email: 'alice@commute.test',
        password: 'securepassword123',
        date_of_birth: '1990-05-15',
        phone_number: '+1234567890',
        gender: 'FEMALE'
      };

      const user2Data = {
        full_name: 'Bob Smith',
        email: 'bob@commute.test',
        password: 'securepassword123',
        date_of_birth: '1988-08-22',
        phone_number: '+0987654321',
        gender: 'MALE'
      };

      // Register both users
      const user1RegisterResponse = await request(app)
        .post('/api/user/register')
        .send(user1Data);

      const user2RegisterResponse = await request(app)
        .post('/api/user/register')
        .send(user2Data);

      expect(user1RegisterResponse.status).toBe(201);
      expect(user2RegisterResponse.status).toBe(201);

      const user1Token = user1RegisterResponse.body.result.token;
      const user2Token = user2RegisterResponse.body.result.token;
      const user1Id = user1RegisterResponse.body.result.user._id;
      const user2Id = user2RegisterResponse.body.result.user._id;

      // Step 2: Profile Setup with Preferences
      const user1Preferences = {
        full_name: 'Alice Johnson',
        matching_preferences: {
          preferred_commute_time: {
            start: '08:00',
            end: '09:00'
          },
          preferred_commute_days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']
        }
      };

      const user2Preferences = {
        full_name: 'Bob Smith',
        matching_preferences: {
          preferred_commute_time: {
            start: '08:15',
            end: '09:15'
          },
          preferred_commute_days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']
        }
      };

      // Update profiles with preferences
      const user1ProfileResponse = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${user1Token}`)
        .send(user1Preferences);

      const user2ProfileResponse = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${user2Token}`)
        .send(user2Preferences);

      expect(user1ProfileResponse.status).toBe(200);
      expect(user2ProfileResponse.status).toBe(200);

      // Step 3: Create Similar Journeys
      const aliceJourneyData = {
        travel_mode: TravelMode.BUS,
        route_id: 'london_bus_73',
        start_point: 'Victoria Station',
        end_point: 'Oxford Circus',
        departure_time: '08:30',
        arrival_time: '09:15',
        days_of_week: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
        description: 'Daily commute to office'
      };

      const bobJourneyData = {
        travel_mode: TravelMode.BUS,
        route_id: 'london_bus_73', // Same route
        start_point: 'Victoria Station', // Same start
        end_point: 'Oxford Circus', // Same end
        departure_time: '08:35', // 5 minutes later
        arrival_time: '09:20',
        days_of_week: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
        description: 'Work commute'
      };

      // Create journeys
      const aliceJourneyResponse = await request(app)
        .post('/api/journey')
        .set('Authorization', `Bearer ${user1Token}`)
        .send(aliceJourneyData);

      const bobJourneyResponse = await request(app)
        .post('/api/journey')
        .set('Authorization', `Bearer ${user2Token}`)
        .send(bobJourneyData);

      expect(aliceJourneyResponse.status).toBe(201);
      expect(bobJourneyResponse.status).toBe(201);

      // Step 4: Find Similar Journeys
      const findSimilarResponse = await request(app)
        .post('/api/journey/similar')
        .set('Authorization', `Bearer ${user1Token}`)
        .send(aliceJourneyData);

      expect(findSimilarResponse.status).toBe(200);
      expect(findSimilarResponse.body.result.length).toBeGreaterThan(0);
      
      // Bob's journey should be found as similar
      const bobJourneyFound = findSimilarResponse.body.result.find(
        (journey: any) => journey.user === user2Id
      );
      expect(bobJourneyFound).toBeTruthy();

      // Step 5: Initiate Chat Between Matched Users
      const createChatResponse = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          chatType: ChatType.DIRECT,
          participantIds: [user2Id]
        });

      expect(createChatResponse.status).toBe(201);
      const chatId = createChatResponse.body.result._id;

      // Step 6: Exchange Messages About Commute Matching
      const aliceMessage = await request(app)
        .post('/api/chat/messages')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          chatId: chatId,
          content: `Hi Bob! I noticed we have very similar commute routes on the ${aliceJourneyData.route_id} bus. Would you be interested in coordinating our commute times?`,
          messageType: MessageType.TEXT
        });

      expect(aliceMessage.status).toBe(201);

      const bobReplyResponse = await request(app)
        .post('/api/chat/messages')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          chatId: chatId,
          content: `Hi Alice! That sounds great! I usually catch the ${bobJourneyData.departure_time} bus. How about we try to meet at ${aliceJourneyData.start_point} around 8:30 tomorrow?`,
          messageType: MessageType.TEXT
        });

      expect(bobReplyResponse.status).toBe(201);

      // Step 7: Verify Message Exchange
      const getChatMessagesResponse = await request(app)
        .get(`/api/chat/${chatId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(getChatMessagesResponse.status).toBe(200);
      expect(getChatMessagesResponse.body.result.messages).toHaveLength(2);

      // Step 8: Mark Messages as Read
      await request(app)
        .put(`/api/chat/${chatId}/read`)
        .set('Authorization', `Bearer ${user2Token}`);

      // Step 9: Check Unread Count
      const unreadCountResponse = await request(app)
        .get('/api/chat/unread/count')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(unreadCountResponse.status).toBe(200);
      expect(unreadCountResponse.body.result.unreadCount).toBe(0);

      // Step 10: Get User's Chats
      const aliceChatsResponse = await request(app)
        .get('/api/chat')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(aliceChatsResponse.status).toBe(200);
      expect(aliceChatsResponse.body.result.chats).toHaveLength(1);
      expect(aliceChatsResponse.body.result.chats[0]._id).toBe(chatId);

      // Step 11: Journey Statistics
      const journeyStatsResponse = await request(app)
        .get('/api/journey/stats')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(journeyStatsResponse.status).toBe(200);
      expect(journeyStatsResponse.body.result.totalJourneys).toBe(1);
      expect(journeyStatsResponse.body.result.journeysByMode.bus).toBe(1);

      // Step 12: Search for Routes
      const routeSearchResponse = await request(app)
        .get(`/api/journey/route/${TravelMode.BUS}/london_bus_73`);

      expect(routeSearchResponse.status).toBe(200);
      expect(routeSearchResponse.body.result).toHaveLength(2); // Both Alice and Bob's journeys
    });
  });

  describe('Real-time Chat Journey', () => {
    it('should complete real-time messaging journey', async () => {
      // Register users first
      const user1Response = await request(app)
        .post('/api/user/register')
        .send({
          full_name: 'Chat User 1',
          email: 'chatuser1@test.com',
          password: 'password123',
          gender: 'MALE'
        });

      const user2Response = await request(app)
        .post('/api/user/register')
        .send({
          full_name: 'Chat User 2',
          email: 'chatuser2@test.com',
          password: 'password123',
          gender: 'FEMALE'
        });

      const user1Token = user1Response.body.result.token;
      const user2Token = user2Response.body.result.token;
      const user1Id = user1Response.body.result.user._id;
      const user2Id = user2Response.body.result.user._id;

      // Create chat via API
      const createChatResponse = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          chatType: ChatType.DIRECT,
          participantIds: [user2Id]
        });

      const chatId = createChatResponse.body.result._id;

      // Connect via WebSocket
      const client1 = Client(`http://localhost:${port}`, {
        auth: { token: user1Token }
      });

      const client2 = Client(`http://localhost:${port}`, {
        auth: { token: user2Token }
      });

      // Wait for connections
      await Promise.all([
        new Promise((resolve) => client1.on('connect', resolve)),
        new Promise((resolve) => client2.on('connect', resolve))
      ]);

      // Join chat room
      client1.emit('join_chat', chatId);
      client2.emit('join_chat', chatId);

      // Wait for join confirmations
      await new Promise((resolve) => {
        client2.on('user_joined_chat', (data) => {
          expect(data.userId).toBe(user1Id);
          resolve(true);
        });
      });

      // Test real-time messaging
      const messagePromise = new Promise((resolve) => {
        client2.on('new_message', (message) => {
          expect(message.content).toBe('Hello from real-time chat!');
          expect(message.senderId).toBe(user1Id);
          resolve(message);
        });
      });

      client1.emit('send_message', {
        chatId: chatId,
        content: 'Hello from real-time chat!',
        messageType: MessageType.TEXT
      });

      await messagePromise;

      // Test typing indicators
      const typingPromise = new Promise((resolve) => {
        client1.on('user_typing', (data) => {
          expect(data.userId).toBe(user2Id);
          expect(data.isTyping).toBe(true);
          resolve(data);
        });
      });

      client2.emit('typing_start', { chatId: chatId });
      await typingPromise;

      // Verify message was persisted in database
      const chatMessages = await request(app)
        .get(`/api/chat/${chatId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(chatMessages.body.result.messages).toHaveLength(1);
      expect(chatMessages.body.result.messages[0].content).toBe('Hello from real-time chat!');

      // Cleanup
      client1.disconnect();
      client2.disconnect();
    });
  });

  describe('Error Handling Journey', () => {
    it('should handle various error scenarios gracefully', async () => {
      // Test 1: Invalid registration data
      const invalidRegistrationResponse = await request(app)
        .post('/api/user/register')
        .send({
          full_name: '',
          email: 'invalid-email',
          password: '123', // Too short
          gender: 'INVALID_GENDER'
        });

      expect(invalidRegistrationResponse.status).toBe(400);

      // Test 2: Access protected route without authentication
      const unauthenticatedResponse = await request(app)
        .get('/api/user/profile');

      expect(unauthenticatedResponse.status).toBe(401);
      expect(unauthenticatedResponse.body.message).toContain('Access denied');

      // Test 3: Register valid user for further tests
      const validUser = await request(app)
        .post('/api/user/register')
        .send({
          full_name: 'Test User',
          email: 'test@error.test',
          password: 'validpassword123',
          gender: 'MALE'
        });

      const userToken = validUser.body.result.token;

      // Test 4: Try to create journey with invalid data
      const invalidJourneyResponse = await request(app)
        .post('/api/journey')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          travel_mode: 'FLYING_CARPET', // Invalid
          route_id: '',
          start_point: '',
          end_point: ''
        });

      expect(invalidJourneyResponse.status).toBe(400);

      // Test 5: Try to access non-existent resources
      const nonExistentJourneyResponse = await request(app)
        .get('/api/journey/nonexistent_id');

      expect(nonExistentJourneyResponse.status).toBe(404);

      // Test 6: Try to send message to non-existent chat
      const invalidMessageResponse = await request(app)
        .post('/api/chat/messages')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          chatId: 'nonexistent_chat_id',
          content: 'This should fail',
          messageType: MessageType.TEXT
        });

      expect(invalidMessageResponse.status).toBe(404);

      // Test 7: Try to update preferences with invalid data
      const invalidPreferencesResponse = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          matching_preferences: {
            preferred_commute_time: {
              start: '25:00', // Invalid time
              end: '09:00'
            }
          }
        });

      expect(invalidPreferencesResponse.status).toBe(400);
      expect(invalidPreferencesResponse.body.message).toContain('Invalid commute time format');
    });
  });

  describe('Performance and Scalability Journey', () => {
    it('should handle multiple concurrent operations', async () => {
      // Create multiple users concurrently
      const userPromises = [];
      const userCount = 10;

      for (let i = 0; i < userCount; i++) {
        const userPromise = request(app)
          .post('/api/user/register')
          .send({
            full_name: `User ${i + 1}`,
            email: `user${i + 1}@performance.test`,
            password: 'password123',
            gender: i % 2 === 0 ? 'MALE' : 'FEMALE'
          });
        userPromises.push(userPromise);
      }

      const userResponses = await Promise.all(userPromises);
      
      // Verify all users were created successfully
      userResponses.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body.result.user.email).toBe(`user${index + 1}@performance.test`);
      });

      const tokens = userResponses.map(response => response.body.result.token);

      // Create journeys concurrently
      const journeyPromises = tokens.map((token, index) => 
        request(app)
          .post('/api/journey')
          .set('Authorization', `Bearer ${token}`)
          .send({
            travel_mode: TravelMode.BUS,
            route_id: `route_${index % 3}`, // Create some overlap
            start_point: `Start Point ${index % 5}`,
            end_point: `End Point ${index % 5}`,
            departure_time: `0${8 + (index % 2)}:${(index % 6) * 10}0`.slice(-5)
          })
      );

      const journeyResponses = await Promise.all(journeyPromises);
      
      // Verify all journeys were created
      journeyResponses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Test bulk operations
      const allJourneysResponse = await request(app)
        .get('/api/journey');

      expect(allJourneysResponse.status).toBe(200);
      expect(allJourneysResponse.body.result.length).toBe(userCount);

      // Test pagination
      const paginatedResponse = await request(app)
        .get('/api/journey')
        .query({ page: 1, limit: 5 });

      expect(paginatedResponse.status).toBe(200);
      expect(paginatedResponse.body.result.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Data Privacy and Security Journey', () => {
    it('should ensure data privacy and security throughout user journey', async () => {
      // Register user
      const userResponse = await request(app)
        .post('/api/user/register')
        .send({
          full_name: 'Privacy User',
          email: 'privacy@security.test',
          password: 'supersecurepassword123',
          gender: 'FEMALE'
        });

      const userToken = userResponse.body.result.token;
      const userId = userResponse.body.result.user._id;

      // Verify password is not returned in response
      expect(userResponse.body.result.user.password).toBeUndefined();

      // Test that user can only access their own data
      const profileResponse = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${userToken}`);

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.result._id).toBe(userId);
      expect(profileResponse.body.result.password).toBeUndefined();

      // Create another user to test authorization
      const otherUserResponse = await request(app)
        .post('/api/user/register')
        .send({
          full_name: 'Other User',
          email: 'other@security.test',
          password: 'password123',
          gender: 'MALE'
        });

      const otherUserToken = otherUserResponse.body.result.token;
      const otherUserId = otherUserResponse.body.result.user._id;

      // Create journey as first user
      const journeyResponse = await request(app)
        .post('/api/journey')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          travel_mode: TravelMode.TUBE,
          route_id: 'private_route',
          start_point: 'Private Start',
          end_point: 'Private End',
          departure_time: '09:00'
        });

      const journeyId = journeyResponse.body.result._id;

      // Verify other user cannot update first user's journey
      const unauthorizedUpdateResponse = await request(app)
        .put(`/api/journey/${journeyId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          end_point: 'Hacked Destination'
        });

      expect(unauthorizedUpdateResponse.status).toBe(404); // Journey not found for this user

      // Verify user can only see their own journeys
      const userJourneysResponse = await request(app)
        .get('/api/journey/user')
        .set('Authorization', `Bearer ${userToken}`);

      expect(userJourneysResponse.status).toBe(200);
      expect(userJourneysResponse.body.result).toHaveLength(1);
      expect(userJourneysResponse.body.result[0].user).toBe(userId);

      const otherUserJourneysResponse = await request(app)
        .get('/api/journey/user')
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(otherUserJourneysResponse.status).toBe(200);
      expect(otherUserJourneysResponse.body.result).toHaveLength(0);

      // Test chat privacy - users can only participate in chats they're part of
      const chatResponse = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          chatType: ChatType.DIRECT,
          participantIds: [otherUserId]
        });

      const chatId = chatResponse.body.result._id;

      // Create a third user who shouldn't have access to the chat
      const thirdUserResponse = await request(app)
        .post('/api/user/register')
        .send({
          full_name: 'Third User',
          email: 'third@security.test',
          password: 'password123',
          gender: 'MALE'
        });

      const thirdUserToken = thirdUserResponse.body.result.token;

      // Third user should not be able to access the chat
      const unauthorizedChatResponse = await request(app)
        .get(`/api/chat/${chatId}/messages`)
        .set('Authorization', `Bearer ${thirdUserToken}`);

      expect(unauthorizedChatResponse.status).toBe(403);

      // Third user should not be able to send messages to the chat
      const unauthorizedMessageResponse = await request(app)
        .post('/api/chat/messages')
        .set('Authorization', `Bearer ${thirdUserToken}`)
        .send({
          chatId: chatId,
          content: 'Unauthorized message',
          messageType: MessageType.TEXT
        });

      expect(unauthorizedMessageResponse.status).toBe(403);
    });
  });
});