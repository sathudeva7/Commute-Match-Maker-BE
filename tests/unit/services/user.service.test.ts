import { UserService } from '../../../src/services/user.service';
import { UserRepository } from '../../../src/repositories/user.repository';
import { AppError } from '../../../src/utils/appError';
import { UserRole } from '../../../src/types/user.types';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('../../../src/repositories/user.repository');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

const mockUserRepository = UserRepository as jest.MockedClass<typeof UserRepository>;
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepo: jest.Mocked<UserRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    userService = new UserService();
    mockUserRepo = new mockUserRepository() as jest.Mocked<UserRepository>;
    (userService as any).userRepository = mockUserRepo;
  });

  describe('register', () => {
    const validUserData = {
      full_name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      date_of_birth: '1990-01-01',
      phone_number: '+1234567890',
      gender: 'MALE' as const
    };

    it('should register user successfully', async () => {
      const hashedPassword = 'hashed_password_123';
      const mockUser = {
        _id: 'user123',
        ...validUserData,
        password: hashedPassword,
        role: UserRole.USER
      };
      const mockToken = 'jwt.token.here';

      mockUserRepo.findByEmail.mockResolvedValue(null);
      (mockBcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (mockBcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockUserRepo.create.mockResolvedValue(mockUser);
      mockJwt.sign.mockReturnValue(mockToken as any);

      const result = await userService.register(validUserData);

      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith(validUserData.email);
      expect(mockBcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(mockBcrypt.hash).toHaveBeenCalledWith(validUserData.password, 'salt');
      expect(mockUserRepo.create).toHaveBeenCalledWith({
        ...validUserData,
        password: hashedPassword
      });
      expect(result.user).toEqual(expect.objectContaining({
        _id: 'user123',
        email: validUserData.email
      }));
      expect(result.user).not.toHaveProperty('password');
      expect(result.token).toBe(mockToken);
    });

    it('should throw error when user already exists', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(validUserData as any);

      await expect(userService.register(validUserData))
        .rejects
        .toThrow(new AppError('User already exists', 400));

      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith(validUserData.email);
      expect(mockUserRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginData = {
      email: 'john@example.com',
      password: 'password123'
    };

    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        _id: 'user123',
        email: 'john@example.com',
        password: 'hashed_password',
        full_name: 'John Doe',
        role: UserRole.USER
      };
      const mockToken = 'jwt.token.here';

      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwt.sign.mockReturnValue(mockToken as any);

      const result = await userService.login(loginData);

      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith(loginData.email);
      expect(mockBcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUser.password);
      expect(result.user).not.toHaveProperty('password');
      expect(result.token).toBe(mockToken);
    });

    it('should throw error when user not found', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);

      await expect(userService.login(loginData))
        .rejects
        .toThrow(new AppError('Invalid credentials', 401));

      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith(loginData.email);
      expect(mockBcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw error when password is invalid', async () => {
      const mockUser = {
        _id: 'user123',
        email: 'john@example.com',
        password: 'hashed_password',
        full_name: 'John Doe',
        role: UserRole.USER
      };

      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(userService.login(loginData))
        .rejects
        .toThrow(new AppError('Invalid credentials', 401));

      expect(mockBcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUser.password);
    });
  });

  describe('getProfile', () => {
    it('should return user profile successfully', async () => {
      const mockUser = {
        _id: 'user123',
        email: 'john@example.com',
        full_name: 'John Doe',
        password: 'hashed_password',
        role: UserRole.USER
      };

      mockUserRepo.findById.mockResolvedValue(mockUser);

      const result = await userService.getProfile('user123');

      expect(mockUserRepo.findById).toHaveBeenCalledWith('user123');
      expect(result).not.toHaveProperty('password');
      expect(result).toEqual(expect.objectContaining({
        _id: 'user123',
        email: 'john@example.com',
        full_name: 'John Doe'
      }));
    });

    it('should throw error when user not found', async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      await expect(userService.getProfile('user123'))
        .rejects
        .toThrow(new AppError('User not found', 404));

      expect(mockUserRepo.findById).toHaveBeenCalledWith('user123');
    });
  });

  describe('updateProfile', () => {
    const updateData = {
      full_name: 'John Updated',
      phone_number: '+9876543210',
      matching_preferences: {
        preferred_commute_time: {
          start: '08:00',
          end: '09:00'
        },
        preferred_commute_days: ['MONDAY', 'TUESDAY'],
        preferred_age_range: {
          min: 25,
          max: 35
        },
        max_distance: 5,
        preferred_vehicle_type: 'CAR' as const,
        preferred_gender: 'ANY' as const,
        smoking_preference: 'NON_SMOKER' as const,
        music_preference: 'YES' as const,
        profession: 'Software Engineer',
        languages: ['English', 'Spanish'],
        interests: ['Technology', 'Music']
      }
    };

    it('should update user profile successfully', async () => {
      const existingUser = {
        _id: 'user123',
        email: 'john@example.com',
        full_name: 'John Doe',
        role: UserRole.USER
      };
      
      const updatedUser = {
        _id: 'user123',
        email: 'john@example.com',
        full_name: 'John Updated',
        phone_number: '+9876543210',
        role: UserRole.USER
      };

      mockUserRepo.findById.mockResolvedValue(existingUser);
      mockUserRepo.update.mockResolvedValue(updatedUser);
      mockUserRepo.updateMatchingPreferences.mockResolvedValue(updatedUser);

      const result = await userService.updateProfile('user123', updateData);

      expect(mockUserRepo.findById).toHaveBeenCalledWith('user123');
      expect(mockUserRepo.update).toHaveBeenCalledWith('user123', {
        full_name: 'John Updated',
        phone_number: '+9876543210'
      });
      expect(mockUserRepo.updateMatchingPreferences).toHaveBeenCalledWith(
        'user123',
        updateData.matching_preferences
      );
      expect(result).toEqual(updatedUser);
    });

    it('should throw error when user not found', async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      await expect(userService.updateProfile('user123', updateData))
        .rejects
        .toThrow(new AppError('User not found', 404));

      expect(mockUserRepo.update).not.toHaveBeenCalled();
    });

    it('should validate matching preferences and throw error for invalid data', async () => {
      const existingUser = { _id: 'user123', email: 'john@example.com', full_name: 'John Doe', role: UserRole.USER };
      const invalidUpdateData = {
        matching_preferences: {
          preferred_commute_time: {
            start: '25:00', // Invalid time format
            end: '09:00'
          },
          profession: 'Software Engineer',
          languages: ['English'],
          interests: ['Technology']
        }
      };

      mockUserRepo.findById.mockResolvedValue(existingUser);
      mockUserRepo.update.mockResolvedValue(existingUser); // Mock to prevent null error

      await expect(userService.updateProfile('user123', invalidUpdateData))
        .rejects
        .toThrow(new AppError('Invalid commute time format. Use HH:mm format', 400));
    });

    it('should validate age range and throw error for invalid range', async () => {
      const existingUser = { _id: 'user123', email: 'john@example.com', full_name: 'John Doe', role: UserRole.USER };
      const invalidUpdateData = {
        matching_preferences: {
          preferred_age_range: {
            min: 35,
            max: 25 // min > max
          },
          profession: 'Software Engineer',
          languages: ['English'],
          interests: ['Technology']
        }
      };

      mockUserRepo.findById.mockResolvedValue(existingUser);
      mockUserRepo.update.mockResolvedValue(existingUser); // Mock to prevent null error

      await expect(userService.updateProfile('user123', invalidUpdateData))
        .rejects
        .toThrow(new AppError('Invalid age range. Min age must be >= 18 and max age must be <= 100', 400));
    });
  });
});