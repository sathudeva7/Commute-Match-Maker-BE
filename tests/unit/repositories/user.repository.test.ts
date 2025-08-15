import { UserRepository } from '../../../src/repositories/user.repository';
import { User } from '../../../src/models/User';
import { UserMatchingPreferences } from '../../../src/models/UserMatchingPreferences';

// Mock Mongoose models
jest.mock('../../../src/models/User');
jest.mock('../../../src/models/UserMatchingPreferences');

const mockUser = User as jest.MockedClass<typeof User>;
const mockUserMatchingPreferences = UserMatchingPreferences as jest.MockedClass<typeof UserMatchingPreferences>;

describe('UserRepository', () => {
  let userRepository: UserRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    userRepository = new UserRepository();
  });

  describe('create', () => {
    const userData = {
      full_name: 'John Doe',
      email: 'john@example.com',
      password: 'hashedpassword',
      date_of_birth: '1990-01-01',
      phone_number: '+1234567890',
      gender: 'MALE' as const
    };

    it('should create user successfully', async () => {
      const mockCreatedUser = {
        _id: 'user123',
        ...userData,
        save: jest.fn().mockResolvedValue(true)
      };

      mockUser.mockImplementation(() => mockCreatedUser as any);

      const result = await userRepository.create(userData);

      expect(mockUser).toHaveBeenCalledWith(userData);
      expect(mockCreatedUser.save).toHaveBeenCalled();
      expect(result).toEqual(mockCreatedUser);
    });

    it('should handle database errors during creation', async () => {
      const mockCreatedUser = {
        save: jest.fn().mockRejectedValue(new Error('Database error'))
      };

      mockUser.mockImplementation(() => mockCreatedUser as any);

      await expect(userRepository.create(userData))
        .rejects
        .toThrow('Database error');
    });
  });

  describe('findByEmail', () => {
    it('should find user by email successfully', async () => {
      const mockFoundUser = {
        _id: 'user123',
        email: 'john@example.com',
        full_name: 'John Doe'
      };

      mockUser.findOne = jest.fn().mockResolvedValue(mockFoundUser);

      const result = await userRepository.findByEmail('john@example.com');

      expect(mockUser.findOne).toHaveBeenCalledWith({ email: 'john@example.com' });
      expect(result).toEqual(mockFoundUser);
    });

    it('should return null when user not found', async () => {
      mockUser.findOne = jest.fn().mockResolvedValue(null);

      const result = await userRepository.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      mockUser.findOne = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      await expect(userRepository.findByEmail('john@example.com'))
        .rejects
        .toThrow('Database connection failed');
    });
  });

  describe('findById', () => {
    it('should find user by ID successfully', async () => {
      const mockFoundUser = {
        _id: 'user123',
        email: 'john@example.com',
        full_name: 'John Doe'
      };

      mockUser.findById = jest.fn().mockResolvedValue(mockFoundUser);

      const result = await userRepository.findById('user123');

      expect(mockUser.findById).toHaveBeenCalledWith('user123');
      expect(result).toEqual(mockFoundUser);
    });

    it('should return null when user not found', async () => {
      mockUser.findById = jest.fn().mockResolvedValue(null);

      const result = await userRepository.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle invalid ObjectId format', async () => {
      mockUser.findById = jest.fn().mockRejectedValue(new Error('Cast to ObjectId failed'));

      await expect(userRepository.findById('invalid_id'))
        .rejects
        .toThrow('Cast to ObjectId failed');
    });
  });

  describe('update', () => {
    const updateData = {
      full_name: 'John Updated',
      phone_number: '+9876543210'
    };

    it('should update user successfully', async () => {
      const mockUpdatedUser = {
        _id: 'user123',
        email: 'john@example.com',
        full_name: 'John Updated',
        phone_number: '+9876543210'
      };

      mockUser.findByIdAndUpdate = jest.fn().mockResolvedValue(mockUpdatedUser);

      const result = await userRepository.update('user123', updateData);

      expect(mockUser.findByIdAndUpdate).toHaveBeenCalledWith(
        'user123',
        updateData,
        { new: true, runValidators: true }
      );
      expect(result).toEqual(mockUpdatedUser);
    });

    it('should return null when user not found for update', async () => {
      mockUser.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

      const result = await userRepository.update('nonexistent', updateData);

      expect(result).toBeNull();
    });

    it('should handle validation errors', async () => {
      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';

      mockUser.findByIdAndUpdate = jest.fn().mockRejectedValue(validationError);

      await expect(userRepository.update('user123', updateData))
        .rejects
        .toThrow('Validation failed');
    });
  });

  describe('updateMatchingPreferences', () => {
    const preferencesData = {
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
      preferred_vehicle_type: 'CAR',
      preferred_gender: 'ANY',
      smoking_preference: 'NON_SMOKER',
      music_preference: 'YES'
    };

    it('should update matching preferences successfully', async () => {
      const mockUpdatedPreferences = {
        _id: 'preferences123',
        user: 'user123',
        ...preferencesData
      };

      mockUserMatchingPreferences.findOneAndUpdate = jest.fn().mockResolvedValue(mockUpdatedPreferences);

      await userRepository.updateMatchingPreferences('user123', preferencesData);

      expect(mockUserMatchingPreferences.findOneAndUpdate).toHaveBeenCalledWith(
        { user: 'user123' },
        preferencesData,
        { upsert: true, new: true, runValidators: true }
      );
    });

    it('should create new preferences if none exist (upsert)', async () => {
      const mockCreatedPreferences = {
        _id: 'preferences123',
        user: 'user123',
        ...preferencesData
      };

      mockUserMatchingPreferences.findOneAndUpdate = jest.fn().mockResolvedValue(mockCreatedPreferences);

      await userRepository.updateMatchingPreferences('user123', preferencesData);

      expect(mockUserMatchingPreferences.findOneAndUpdate).toHaveBeenCalledWith(
        { user: 'user123' },
        preferencesData,
        { upsert: true, new: true, runValidators: true }
      );
    });

    it('should handle validation errors in preferences', async () => {
      const validationError = new Error('Invalid preference value');
      mockUserMatchingPreferences.findOneAndUpdate = jest.fn().mockRejectedValue(validationError);

      await expect(userRepository.updateMatchingPreferences('user123', preferencesData))
        .rejects
        .toThrow('Invalid preference value');
    });
  });

  describe('findAll', () => {
    it('should find all users with default pagination', async () => {
      const mockUsers = [
        { _id: 'user1', email: 'user1@example.com' },
        { _id: 'user2', email: 'user2@example.com' }
      ];

      const mockQuery = {
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockUsers)
      };

      mockUser.find = jest.fn().mockReturnValue(mockQuery);

      const result = await userRepository.findAll();

      expect(mockUser.find).toHaveBeenCalledWith({});
      expect(mockQuery.limit).toHaveBeenCalledWith(20);
      expect(mockQuery.skip).toHaveBeenCalledWith(0);
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual(mockUsers);
    });

    it('should find all users with custom pagination', async () => {
      const mockUsers = [
        { _id: 'user3', email: 'user3@example.com' }
      ];

      const mockQuery = {
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockUsers)
      };

      mockUser.find = jest.fn().mockReturnValue(mockQuery);

      const result = await userRepository.findAll(2, 10);

      expect(mockQuery.limit).toHaveBeenCalledWith(10);
      expect(mockQuery.skip).toHaveBeenCalledWith(10); // (page - 1) * limit = (2 - 1) * 10
      expect(result).toEqual(mockUsers);
    });

    it('should find users with filters', async () => {
      const filters = { gender: 'MALE', isActive: true };
      const mockUsers = [
        { _id: 'user1', gender: 'MALE', isActive: true }
      ];

      const mockQuery = {
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockUsers)
      };

      mockUser.find = jest.fn().mockReturnValue(mockQuery);

      const result = await userRepository.findAll(1, 20, filters);

      expect(mockUser.find).toHaveBeenCalledWith(filters);
      expect(result).toEqual(mockUsers);
    });
  });

  describe('count', () => {
    it('should count all users', async () => {
      mockUser.countDocuments = jest.fn().mockResolvedValue(42);

      const result = await userRepository.count();

      expect(mockUser.countDocuments).toHaveBeenCalledWith({});
      expect(result).toBe(42);
    });

    it('should count users with filters', async () => {
      const filters = { gender: 'FEMALE', isActive: true };
      mockUser.countDocuments = jest.fn().mockResolvedValue(15);

      const result = await userRepository.count(filters);

      expect(mockUser.countDocuments).toHaveBeenCalledWith(filters);
      expect(result).toBe(15);
    });
  });

  describe('delete', () => {
    it('should soft delete user successfully', async () => {
      const mockDeletedUser = {
        _id: 'user123',
        email: 'john@example.com',
        isDeleted: true,
        deletedAt: new Date()
      };

      mockUser.findByIdAndUpdate = jest.fn().mockResolvedValue(mockDeletedUser);

      const result = await userRepository.delete('user123');

      expect(mockUser.findByIdAndUpdate).toHaveBeenCalledWith(
        'user123',
        {
          isDeleted: true,
          deletedAt: expect.any(Date)
        },
        { new: true }
      );
      expect(result).toEqual(mockDeletedUser);
    });

    it('should return null when user not found for deletion', async () => {
      mockUser.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

      const result = await userRepository.delete('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByIds', () => {
    it('should find multiple users by IDs', async () => {
      const userIds = ['user123', 'user456', 'user789'];
      const mockUsers = [
        { _id: 'user123', email: 'user1@example.com' },
        { _id: 'user456', email: 'user2@example.com' },
        { _id: 'user789', email: 'user3@example.com' }
      ];

      mockUser.find = jest.fn().mockResolvedValue(mockUsers);

      const result = await userRepository.findByIds(userIds);

      expect(mockUser.find).toHaveBeenCalledWith({
        _id: { $in: userIds }
      });
      expect(result).toEqual(mockUsers);
    });

    it('should return empty array for empty IDs list', async () => {
      mockUser.find = jest.fn().mockResolvedValue([]);

      const result = await userRepository.findByIds([]);

      expect(mockUser.find).toHaveBeenCalledWith({
        _id: { $in: [] }
      });
      expect(result).toEqual([]);
    });
  });

  describe('findWithPreferences', () => {
    it('should find user with populated matching preferences', async () => {
      const mockUserWithPreferences = {
        _id: 'user123',
        email: 'john@example.com',
        full_name: 'John Doe',
        matching_preferences: {
          preferred_commute_time: { start: '08:00', end: '09:00' },
          max_distance: 5
        }
      };

      const mockQuery = {
        populate: jest.fn().mockResolvedValue(mockUserWithPreferences)
      };

      mockUser.findById = jest.fn().mockReturnValue(mockQuery);

      const result = await userRepository.findWithPreferences('user123');

      expect(mockUser.findById).toHaveBeenCalledWith('user123');
      expect(mockQuery.populate).toHaveBeenCalledWith('matching_preferences');
      expect(result).toEqual(mockUserWithPreferences);
    });

    it('should return null when user not found', async () => {
      const mockQuery = {
        populate: jest.fn().mockResolvedValue(null)
      };

      mockUser.findById = jest.fn().mockReturnValue(mockQuery);

      const result = await userRepository.findWithPreferences('nonexistent');

      expect(result).toBeNull();
    });
  });
});