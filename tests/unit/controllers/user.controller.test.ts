import request from 'supertest';
import express from 'express';
import { UserController } from '../../../src/controllers/user.controller';
import { UserService } from '../../../src/services/user.service';
import { AppError } from '../../../src/utils/appError';

// Mock the UserService
jest.mock('../../../src/services/user.service');

const app = express();
app.use(express.json());

const userController = new UserController();

// Setup routes
app.post('/register', userController.register);
app.post('/login', userController.login);
app.get('/profile', (req, res, next) => {
  // Mock authenticated request
  req.user = { _id: 'user123' };
  userController.getProfile(req as any, res, next);
});
app.put('/profile', (req, res, next) => {
  // Mock authenticated request
  req.user = { _id: 'user123' };
  userController.updateProfile(req as any, res, next);
});

const mockUserService = UserService as jest.MockedClass<typeof UserService>;

describe('UserController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /register', () => {
    const validRegistrationData = {
      full_name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      date_of_birth: '1990-01-01',
      phone_number: '+1234567890',
      gender: 'MALE'
    };

    it('should register user successfully with valid data', async () => {
      const mockResult = {
        user: {
          _id: 'user123',
          full_name: 'John Doe',
          email: 'john@example.com'
        },
        token: 'jwt.token.here'
      };

      mockUserService.prototype.register.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/register')
        .send(validRegistrationData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.result).toEqual(mockResult);
      expect(response.body.message).toBe('User registered successfully');
    });

    it('should return 400 when user already exists', async () => {
      mockUserService.prototype.register.mockRejectedValue(
        new AppError('User already exists', 400)
      );

      const response = await request(app)
        .post('/register')
        .send(validRegistrationData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User already exists');
    });

    it('should return 500 for internal server error', async () => {
      mockUserService.prototype.register.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .post('/register')
        .send(validRegistrationData);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error');
    });
  });

  describe('POST /login', () => {
    const validLoginData = {
      email: 'john@example.com',
      password: 'password123'
    };

    it('should login successfully with valid credentials', async () => {
      const mockResult = {
        user: {
          _id: 'user123',
          full_name: 'John Doe',
          email: 'john@example.com'
        },
        token: 'jwt.token.here'
      };

      mockUserService.prototype.login.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/login')
        .send(validLoginData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.result).toEqual(mockResult);
      expect(response.body.message).toBe('Login successful');
    });

    it('should return 401 for invalid credentials', async () => {
      mockUserService.prototype.login.mockRejectedValue(
        new AppError('Invalid credentials', 401)
      );

      const response = await request(app)
        .post('/login')
        .send(validLoginData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });
  });

  describe('GET /profile', () => {
    it('should get user profile successfully', async () => {
      const mockUser = {
        _id: 'user123',
        full_name: 'John Doe',
        email: 'john@example.com'
      };

      mockUserService.prototype.getProfile.mockResolvedValue(mockUser);

      const response = await request(app).get('/profile');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.result).toEqual(mockUser);
      expect(response.body.message).toBe('Profile retrieved successfully');
    });

    it('should return 404 when user not found', async () => {
      mockUserService.prototype.getProfile.mockRejectedValue(
        new AppError('User not found', 404)
      );

      const response = await request(app).get('/profile');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });
  });

  describe('PUT /profile', () => {
    const updateData = {
      full_name: 'John Updated',
      phone_number: '+9876543210'
    };

    it('should update user profile successfully', async () => {
      const mockUpdatedUser = {
        _id: 'user123',
        full_name: 'John Updated',
        email: 'john@example.com',
        phone_number: '+9876543210'
      };

      mockUserService.prototype.updateProfile.mockResolvedValue(mockUpdatedUser);

      const response = await request(app)
        .put('/profile')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.result).toEqual(mockUpdatedUser);
      expect(response.body.message).toBe('Profile updated successfully');
    });

    it('should return 404 when user not found for update', async () => {
      mockUserService.prototype.updateProfile.mockRejectedValue(
        new AppError('User not found', 404)
      );

      const response = await request(app)
        .put('/profile')
        .send(updateData);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });
  });
});