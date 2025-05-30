import { UserRepository } from '../repositories/user.repository';
import { IUser, IUserRegistration, IUserLogin, IAuthResponse } from '../types/user.types';
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
      const { password, email, role, ...allowedUpdates } = updateData;

      // Update user
      const updatedUser = await this.userRepository.update(userId, allowedUpdates);
      if (!updatedUser) {
        throw new AppError('Failed to update user profile', 500);
      }

      return this.sanitizeUser(updatedUser);
    } catch (error) {
      throw error;
    }
  }
} 