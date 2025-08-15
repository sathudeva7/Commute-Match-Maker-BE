import request from 'supertest';
import express from 'express';
import cors from 'cors';
import userRoutes from '../../src/routes/user.routes';
import chatRoutes from '../../src/routes/chat.routes';
import journeyRoutes from '../../src/routes/journey.routes';
import { UserRepository } from '../../src/repositories/user.repository';
import { ChatRepository } from '../../src/repositories/chat.repository';
import { MessageRepository } from '../../src/repositories/message.repository';
import { JourneyRepository } from '../../src/repositories/journey.repository';
import { ChatType, MessageType } from '../../src/types/chat.types';
import { TravelMode } from '../../src/types/journey.types';
import jwt from 'jsonwebtoken';

// Setup Express app for testing
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

describe('API Integration Tests', () => {
  let userRepo: UserRepository;
  let chatRepo: ChatRepository;
  let messageRepo: MessageRepository;
  let journeyRepo: JourneyRepository;
  
  let testUser1: any;
  let testUser2: any;
  let user1Token: string;
  let user2Token: string;

  beforeAll(async () => {
    // Initialize repositories
    userRepo = new UserRepository();
    chatRepo = new ChatRepository();
    messageRepo = new MessageRepository();
    journeyRepo = new JourneyRepository();
  });

  beforeEach(async () => {
    // Create test users
    testUser1 = {
      full_name: 'John Doe',
      email: 'john@test.com',
      password: 'password123',
      date_of_birth: '1990-01-01',
      phone_number: '+1234567890',
      gender: 'MALE'
    };

    testUser2 = {
      full_name: 'Jane Doe',
      email: 'jane@test.com',
      password: 'password123',
      date_of_birth: '1992-05-15',
      phone_number: '+0987654321',
      gender: 'FEMALE'
    };

    // Register users and get tokens
    const user1Response = await request(app)
      .post('/api/user/register')
      .send(testUser1);

    const user2Response = await request(app)
      .post('/api/user/register')
      .send(testUser2);

    user1Token = user1Response.body.result.token;
    user2Token = user2Response.body.result.token;
    
    testUser1._id = user1Response.body.result.user._doc._id;
    testUser2._id = user2Response.body.result.user._doc._id;
  });

  afterEach(async () => {
    // Clean up test data
    await messageRepo.deleteMany({});
    await chatRepo.deleteMany({});
    await journeyRepo.deleteMany({});
    await userRepo.deleteMany({});
  });

  describe('User Authentication Flow', () => {
    it('should complete full registration and login flow', async () => {
      // Test registration
      const newUser = {
        full_name: 'Test User',
        email: 'test@example.com',
        password: 'testpassword123',
        date_of_birth: '1995-01-01',
        phone_number: '+1111111111',
        gender: 'MALE'
      };

      const registerResponse = await request(app)
        .post('/api/user/register')
        .send(newUser);

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.result.user._doc.email).toBe(newUser.email);
      expect(registerResponse.body.result.token).toBeDefined();

      // Test login
      const loginResponse = await request(app)
        .post('/api/user/login')
        .send({
          email: newUser.email,
          password: newUser.password
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.result.user._doc.email).toBe(newUser.email);
      expect(loginResponse.body.result.token).toBeDefined();

      // Test protected route access
      const profileResponse = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${loginResponse.body.result.token}`);

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.result._doc.email).toBe(newUser.email);
    });

    it('should reject duplicate email registration', async () => {
      const duplicateUser = {
        ...testUser1,
        email: testUser1.email // Same email as existing user
      };

      const response = await request(app)
        .post('/api/user/register')
        .send(duplicateUser);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User already exists');
    });

    it('should reject login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/user/login')
        .send({
          email: testUser1.email,
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });
  });

  describe('Chat Functionality Flow', () => {
    let chatId: string;

    it('should create chat and exchange messages', async () => {
      // Create direct chat
      const createChatResponse = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          chatType: ChatType.DIRECT,
          participantIds: [testUser2._id]
        });

      expect(createChatResponse.status).toBe(201);
      expect(createChatResponse.body.success).toBe(true);
      expect(createChatResponse.body.result.participants).toContain(testUser1._id);
      expect(createChatResponse.body.result.participants).toContain(testUser2._id);
      
      chatId = createChatResponse.body.result._id;

      // Send message from user1
      const sendMessageResponse = await request(app)
        .post('/api/chat/messages')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          chatId: chatId,
          content: 'Hello from user1!',
          messageType: MessageType.TEXT
        });

      expect(sendMessageResponse.status).toBe(201);
      expect(sendMessageResponse.body.success).toBe(true);
      expect(sendMessageResponse.body.result.content).toBe('Hello from user1!');
      expect(sendMessageResponse.body.result.senderId).toBe(testUser1._id);

      // Get messages as user2
      const getMessagesResponse = await request(app)
        .get(`/api/chat/${chatId}/messages`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(getMessagesResponse.status).toBe(200);
      expect(getMessagesResponse.body.success).toBe(true);
      expect(getMessagesResponse.body.result.messages).toHaveLength(1);
      expect(getMessagesResponse.body.result.messages[0].content).toBe('Hello from user1!');

      // Reply from user2
      const replyResponse = await request(app)
        .post('/api/chat/messages')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          chatId: chatId,
          content: 'Hello back from user2!',
          messageType: MessageType.TEXT
        });

      expect(replyResponse.status).toBe(201);
      expect(replyResponse.body.result.content).toBe('Hello back from user2!');

      // Check chat appears in user's chat list
      const getUserChatsResponse = await request(app)
        .get('/api/chat')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(getUserChatsResponse.status).toBe(200);
      expect(getUserChatsResponse.body.result.chats).toHaveLength(1);
      expect(getUserChatsResponse.body.result.chats[0]._doc._id).toBe(chatId);
    });

    it('should handle group chat operations', async () => {
      // Create additional user for group chat
      const user3Response = await request(app)
        .post('/api/user/register')
        .send({
          full_name: 'Bob Smith',
          email: 'bob@test.com',
          password: 'password123',
          date_of_birth: '1988-03-20',
          phone_number: '+5555555555',
          gender: 'MALE'
        });

      const user3Token = user3Response.body.result.token;
      const user3Id = user3Response.body.result.user._doc._id;

      // Create group chat
      const createGroupResponse = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          chatType: ChatType.GROUP,
          participantIds: [testUser2._id, user3Id],
          title: 'Test Group Chat',
          description: 'A test group for integration testing'
        });

      expect(createGroupResponse.status).toBe(201);
      expect(createGroupResponse.body.result.chatType).toBe(ChatType.GROUP);
      expect(createGroupResponse.body.result.title).toBe('Test Group Chat');
      expect(createGroupResponse.body.result.participants).toHaveLength(3);

      const groupChatId = createGroupResponse.body.result._id;

      // Send message to group
      await request(app)
        .post('/api/chat/messages')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          chatId: groupChatId,
          content: 'Hello group!',
          messageType: MessageType.TEXT
        });

      // All participants should be able to see the message
      const getMessagesResponse = await request(app)
        .get(`/api/chat/${groupChatId}/messages`)
        .set('Authorization', `Bearer ${user3Token}`);

      expect(getMessagesResponse.status).toBe(200);
      expect(getMessagesResponse.body.result.messages).toHaveLength(1);
      expect(getMessagesResponse.body.result.messages[0].content).toBe('Hello group!');

      // Update group chat info (only admin can do this)
      const updateChatResponse = await request(app)
        .put(`/api/chat/${groupChatId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          title: 'Updated Group Chat',
          description: 'Updated description'
        });

      expect(updateChatResponse.status).toBe(200);
      expect(updateChatResponse.body.result.title).toBe('Updated Group Chat');

      // Non-admin should not be able to update
      const nonAdminUpdateResponse = await request(app)
        .put(`/api/chat/${groupChatId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          title: 'Unauthorized Update'
        });

      expect(nonAdminUpdateResponse.status).toBe(403);
    });
  });

  describe('Journey Management Flow', () => {
    it('should create, update and search journeys', async () => {
      // Create journey
      const journeyData = {
        travel_mode: TravelMode.BUS,
        route_id: 'route_123',
        start_point: 'Central Station',
        end_point: 'Business District',
        departure_time: '08:00',
        arrival_time: '08:45',
        description: 'Daily commute to work'
      };

      const createJourneyResponse = await request(app)
        .post('/api/journey')
        .set('Authorization', `Bearer ${user1Token}`)
        .send(journeyData);

      expect(createJourneyResponse.status).toBe(201);
      expect(createJourneyResponse.body.success).toBe(true);
      expect(createJourneyResponse.body.result.travel_mode).toBe(TravelMode.BUS);
      expect(createJourneyResponse.body.result.start_point).toBe('Central Station');

      const journeyId = createJourneyResponse.body.result._id;

      // Get user's journeys - use the correct route
      const getUserJourneysResponse = await request(app)
        .get('/api/journey/my-journeys')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(getUserJourneysResponse.status).toBe(200);
      expect(getUserJourneysResponse.body.result).toHaveLength(1);
      expect(getUserJourneysResponse.body.result[0]._id).toBe(journeyId);

      // Update journey
      const updateData = {
        end_point: 'Updated Business District',
        arrival_time: '09:00'
      };

      const updateJourneyResponse = await request(app)
        .put(`/api/journey/${journeyId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send(updateData);

      expect(updateJourneyResponse.status).toBe(200);
      expect(updateJourneyResponse.body.result.end_point).toBe('Updated Business District');
      expect(updateJourneyResponse.body.result.arrival_time).toBe('09:00');

      // Create similar journey with user2
      const similarJourneyData = {
        travel_mode: TravelMode.BUS,
        route_id: 'route_123', // Same route
        start_point: 'Central Station', // Same start
        end_point: 'Business District',
        departure_time: '08:15', // Slightly different time
        arrival_time: '09:00'
      };

      await request(app)
        .post('/api/journey')
        .set('Authorization', `Bearer ${user2Token}`)
        .send(similarJourneyData);

      // Find similar journeys - use the correct route
      const findSimilarResponse = await request(app)
        .post('/api/journey/find-similar')
        .set('Authorization', `Bearer ${user1Token}`)
        .send(journeyData);

      expect(findSimilarResponse.status).toBe(200);
      expect(findSimilarResponse.body.result.length).toBeGreaterThan(0);

      // Get journeys by route
      const getByRouteResponse = await request(app)
        .get(`/api/journey/route/${TravelMode.BUS}/route_123`);

      expect(getByRouteResponse.status).toBe(200);
      expect(getByRouteResponse.body.result.length).toBe(2); // Both journeys

      // Get journey statistics
      const getStatsResponse = await request(app)
        .get('/api/journey/stats')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(getStatsResponse.status).toBe(200);
      expect(getStatsResponse.body.result.totalJourneys).toBe(1);
      expect(getStatsResponse.body.result.journeysByMode.bus).toBe(1);

      // Delete journey
      const deleteJourneyResponse = await request(app)
        .delete(`/api/journey/${journeyId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(deleteJourneyResponse.status).toBe(200);

      // Verify journey is deleted
      const getDeletedJourneyResponse = await request(app)
        .get(`/api/journey/${journeyId}`);

      expect(getDeletedJourneyResponse.status).toBe(404);
    });

    it('should prevent unauthorized journey operations', async () => {
      // Create journey as user1
      const journeyData = {
        travel_mode: TravelMode.TUBE,
        route_id: 'tube_line_1',
        start_point: 'Home',
        end_point: 'Work',
        departure_time: '07:30',
        arrival_time: '08:15'
      };

      const createResponse = await request(app)
        .post('/api/journey')
        .set('Authorization', `Bearer ${user1Token}`)
        .send(journeyData);

      const journeyId = createResponse.body.result._id;

      // Try to update as user2 (should fail)
      const unauthorizedUpdateResponse = await request(app)
        .put(`/api/journey/${journeyId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ end_point: 'Unauthorized Update' });

      expect(unauthorizedUpdateResponse.status).toBe(404); // Not found for other users

      // Try to delete as user2 (should fail)
      const unauthorizedDeleteResponse = await request(app)
        .delete(`/api/journey/${journeyId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(unauthorizedDeleteResponse.status).toBe(404);
    });
  });

  describe('Profile Management Flow', () => {
    it('should update user profile and preferences', async () => {
      // Get initial profile
      const getProfileResponse = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(getProfileResponse.status).toBe(200);
      expect(getProfileResponse.body.result._doc.full_name).toBe(testUser1.full_name);

      // Update profile with matching preferences
      const updateData = {
        full_name: 'John Updated Doe',
        phone_number: '+9999999999',
        matching_preferences: {
          preferred_commute_time: {
            start: '08:00',
            end: '09:00'
          },
          preferred_commute_days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
          preferred_age_range: {
            min: 25,
            max: 40
          },
          max_distance: 10,
          preferred_vehicle_type: 'CAR',
          preferred_gender: 'ANY',
          smoking_preference: 'NON_SMOKER',
          music_preference: 'YES'
        }
      };

      const updateProfileResponse = await request(app)
        .put('/api/user/update-profile')
        .set('Authorization', `Bearer ${user1Token}`)
        .send(updateData);

      expect(updateProfileResponse.status).toBe(200);
      expect(updateProfileResponse.body.result._doc.full_name).toBe('John Updated Doe');
      expect(updateProfileResponse.body.result._doc.phone_number).toBe('+9999999999');

      // Verify updated profile
      const getUpdatedProfileResponse = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(getUpdatedProfileResponse.status).toBe(200);
      expect(getUpdatedProfileResponse.body.result._doc.full_name).toBe('John Updated Doe');
    });

    it('should validate matching preferences', async () => {
      // Try to update with invalid preferences
      const invalidPreferences = {
        matching_preferences: {
          preferred_commute_time: {
            start: '25:00', // Invalid time
            end: '09:00'
          }
        }
      };

      const response = await request(app)
        .put('/api/user/update-profile')
        .set('Authorization', `Bearer ${user1Token}`)
        .send(invalidPreferences);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid commute time format');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should reject requests without authentication', async () => {
      // Try to access protected routes without token
      const endpoints = [
        { method: 'get', path: '/api/user/profile' },
        { method: 'post', path: '/api/chat' },
        { method: 'post', path: '/api/journey' }
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)[endpoint.method](endpoint.path);
        expect(response.status).toBe(401);
        expect(response.body.message).toContain('Authentication required');
      }
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid token');
    });

    it('should reject requests with expired token', async () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { id: testUser1._id },
        process.env.JWT_SECRET!,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid token');
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', async () => {
      // Try to create journey with invalid data
      const invalidJourneyData = {
        travel_mode: 'INVALID_MODE',
        route_id: '',
        start_point: '',
        end_point: ''
      };

      const response = await request(app)
        .post('/api/journey')
        .set('Authorization', `Bearer ${user1Token}`)
        .send(invalidJourneyData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });

    it('should handle resource not found errors', async () => {
      // Test with valid ObjectId format but non-existent ID
      const response = await request(app)
        .get('/api/journey/507f1f77bcf86cd799439011'); // Valid ObjectId format but non-existent

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should handle malformed request data', async () => {
      const response = await request(app)
        .post('/api/user/register')
        .send('invalid json data');

      expect(response.status).toBe(500);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency across operations', async () => {
      // Create chat
      const createChatResponse = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          chatType: ChatType.DIRECT,
          participantIds: [testUser2._id]
        });

      const chatId = createChatResponse.body.result._id;

      // Send multiple messages
      const messages = ['Message 1', 'Message 2', 'Message 3'];
      
      for (const content of messages) {
        await request(app)
          .post('/api/chat/messages')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            chatId: chatId,
            content: content,
            messageType: MessageType.TEXT
          });
      }

      // Verify all messages exist
      const getMessagesResponse = await request(app)
        .get(`/api/chat/${chatId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(getMessagesResponse.body.result.messages).toHaveLength(3);

      // Mark messages as read
      await request(app)
        .put(`/api/chat/${chatId}/read`)
        .set('Authorization', `Bearer ${user2Token}`);

      // Check unread count
      const unreadCountResponse = await request(app)
        .get('/api/chat/unread/count')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(unreadCountResponse.body.result.unreadCount).toBe(0);
    });
  });
});