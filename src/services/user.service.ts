import { UserRepository } from '../repositories/user.repository';
import { IUser, IUserRegistration, IUserLogin, IAuthResponse, IMatchingPreferences } from '../types/user.types';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/appError';

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async register(userData: IUserRegistration): Promise<IAuthResponse> {
    try {
      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(userData.email);
      if (existingUser) {
        throw new AppError('User already exists', 400);
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      // Create user
      const user = await this.userRepository.create({
        ...userData,
        password: hashedPassword
      });

      // Generate token
      const token = this.generateToken(user);

      return {
        user: this.sanitizeUser(user),
        token
      };
    } catch (error) {
      throw error;
    }
  }

  async login(loginData: IUserLogin): Promise<IAuthResponse> {
    try {
      // Find user
      const user = await this.userRepository.findByEmail(loginData.email);
      if (!user) {
        throw new AppError('Invalid credentials', 401);
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(loginData.password, user.password || '');
      if (!isPasswordValid) {
        throw new AppError('Invalid credentials', 401);
      }

      // Generate token
      const token = this.generateToken(user);

      return {
        user: this.sanitizeUser(user),
        token
      };
    } catch (error) {
      throw error;
    }
  }

  private generateToken(user: IUser): string {
    return jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1d' }
    );
  }

  private sanitizeUser(user: IUser): IUser {
    const { password, full_name, email, _id, role } = user;

    return {
      full_name, email, _id, role
    };
  }

  async updateProfile(userId: string, updateData: Partial<IUser>): Promise<IUser> {
    try {
      // Check if user exists
      const existingUser = await this.userRepository.findById(userId);
      if (!existingUser) {
        throw new AppError('User not found', 404);
      }

      // Don't allow updating sensitive fields
      const { password, email, role, matching_preferences, ...allowedUpdates } = updateData;

      // Update user basic info
      const updatedUser = await this.userRepository.update(userId, allowedUpdates);
      if (!updatedUser) {
        throw new AppError('Failed to update user profile', 500);
      }

      // Update matching preferences if provided
      if (matching_preferences) {
        this.validateMatchingPreferences(matching_preferences);
        await this.userRepository.updateMatchingPreferences(userId, matching_preferences);
      }

      return this.sanitizeUser(updatedUser);
    } catch (error) {
      throw error;
    }
  }

  private validateMatchingPreferences(preferences: IMatchingPreferences): void {
    // Validate commute time format
    if (preferences.preferred_commute_time) {
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(preferences.preferred_commute_time.start) || 
          !timeRegex.test(preferences.preferred_commute_time.end)) {
        throw new AppError('Invalid commute time format. Use HH:mm format', 400);
      }
    }

    // Validate commute days
    if (preferences.preferred_commute_days) {
      const validDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
      const invalidDays = preferences.preferred_commute_days.filter(day => !validDays.includes(day));
      if (invalidDays.length > 0) {
        throw new AppError(`Invalid commute days: ${invalidDays.join(', ')}`, 400);
      }
    }

    // Validate age range
    if (preferences.preferred_age_range) {
      if (preferences.preferred_age_range.min < 18 || 
          preferences.preferred_age_range.max > 100 || 
          preferences.preferred_age_range.min > preferences.preferred_age_range.max) {
        throw new AppError('Invalid age range. Min age must be >= 18 and max age must be <= 100', 400);
      }
    }

    // Validate max distance
    if (preferences.max_distance !== undefined && 
        (preferences.max_distance < 1 || preferences.max_distance > 100)) {
      throw new AppError('Max distance must be between 1 and 100 kilometers', 400);
    }

    // Validate vehicle type
    if (preferences.preferred_vehicle_type && 
        !['CAR', 'MOTORCYCLE', 'BICYCLE', 'PUBLIC_TRANSPORT'].includes(preferences.preferred_vehicle_type)) {
      throw new AppError('Invalid vehicle type', 400);
    }

    // Validate gender preference
    if (preferences.preferred_gender && 
        !['MALE', 'FEMALE', 'ANY'].includes(preferences.preferred_gender)) {
      throw new AppError('Invalid gender preference', 400);
    }

    // Validate smoking preference
    if (preferences.smoking_preference && 
        !['SMOKER', 'NON_SMOKER', 'ANY'].includes(preferences.smoking_preference)) {
      throw new AppError('Invalid smoking preference', 400);
    }

    // Validate music preference
    if (preferences.music_preference && 
        !['YES', 'NO', 'ANY'].includes(preferences.music_preference)) {
      throw new AppError('Invalid music preference', 400);
    }
  }
} 