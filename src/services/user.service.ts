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
     console.log('haas', hashedPassword);
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
    // Remove password and return sanitized user
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  async getProfile(userId: string): Promise<IUser> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Get user's matching preferences
      const userMatchingPreferencesRepo = new (await import('../repositories/userMatchingPreferences.repository')).UserMatchingPreferencesRepository();
      const matchingPreferencesDoc = await userMatchingPreferencesRepo.findByUserId(userId);

      // Map the matching preferences to the expected format
      let matchingPreferences: IMatchingPreferences | undefined;
      if (matchingPreferencesDoc && matchingPreferencesDoc.matching_preferences) {
        matchingPreferences = {
          profession: matchingPreferencesDoc.matching_preferences.profession || '',
          languages: matchingPreferencesDoc.matching_preferences.languages || [],
          about_me: matchingPreferencesDoc.matching_preferences.about_me || '',
          interests: matchingPreferencesDoc.matching_preferences.interests || [],
          preferred_commute_time: matchingPreferencesDoc.matching_preferences.preferred_commute_time?.start && matchingPreferencesDoc.matching_preferences.preferred_commute_time?.end 
            ? { 
                start: matchingPreferencesDoc.matching_preferences.preferred_commute_time.start, 
                end: matchingPreferencesDoc.matching_preferences.preferred_commute_time.end 
              } 
            : undefined,
          preferred_commute_days: matchingPreferencesDoc.matching_preferences.preferred_commute_days || [],
          preferred_commute_times: matchingPreferencesDoc.matching_preferences.preferred_commute_times || []
        };
      }

      // Combine user data with matching preferences
      const userWithPreferences = {
        ...this.sanitizeUser(user),
        matching_preferences: matchingPreferences
      };

      return userWithPreferences;
    } catch (error) {
      throw error;
    }
  }

  async updateProfile(userId: string, updateData: Partial<IUser & {
    profession?: string;
    about_me?: string;
    interests?: string[];
    languages?: string[];
    preferred_commute_time?: {
      start: string;
      end: string;
    };
    preferred_commute_days?: string[];
  }>): Promise<IUser> {
    try {
      // Check if user exists
      const existingUser = await this.userRepository.findById(userId);
      if (!existingUser) {
        throw new AppError('User not found', 404);
      }

      // Separate user profile fields from matching preference fields
      const {
        password, 
        email, 
        role, 
        matching_preferences,
        profession,
        about_me,
        interests,
        languages,
        preferred_commute_time,
        preferred_commute_days,
        ...userProfileUpdates
      } = updateData;

      // Validate user profile updates first
      if (Object.keys(userProfileUpdates).length > 0) {
        this.validateUserUpdateData(userProfileUpdates);
      }

      // Update user basic info if there are profile updates
      let updatedUser = existingUser;
      if (Object.keys(userProfileUpdates).length > 0) {
        const result = await this.userRepository.update(userId, userProfileUpdates);
        if (!result) {
          throw new AppError('Failed to update user profile', 500);
        }
        updatedUser = result;
      }

      // Handle matching preferences updates
      let matchingPreferencesToUpdate: Partial<IMatchingPreferences> | undefined;

      // If explicit matching_preferences are provided, use those
      if (matching_preferences) {
        matchingPreferencesToUpdate = matching_preferences;
        console.log('Using explicit matching_preferences:', matchingPreferencesToUpdate);
      } else {
        // If individual fields are provided, build matching preferences object
        const individualFields: Partial<IMatchingPreferences> = {};
        
        if (profession !== undefined) individualFields.profession = profession;
        if (about_me !== undefined) individualFields.about_me = about_me;
        if (interests !== undefined) individualFields.interests = interests;
        if (languages !== undefined) individualFields.languages = languages;
        if (preferred_commute_time !== undefined) individualFields.preferred_commute_time = preferred_commute_time;
        if (preferred_commute_days !== undefined) individualFields.preferred_commute_days = preferred_commute_days;

        if (Object.keys(individualFields).length > 0) {
          matchingPreferencesToUpdate = individualFields;
          console.log('Built individual matching preferences:', matchingPreferencesToUpdate);
        }
      }

      // Update matching preferences if there are any to update
      if (matchingPreferencesToUpdate) {
        console.log('Updating matching preferences for user:', userId, 'with data:', matchingPreferencesToUpdate);
        this.validateMatchingPreferences(matchingPreferencesToUpdate as IMatchingPreferences);
        const userMatchingPreferencesRepo = new (await import('../repositories/userMatchingPreferences.repository')).UserMatchingPreferencesRepository();
        const result = await userMatchingPreferencesRepo.update(userId, matchingPreferencesToUpdate);
        console.log('Matching preferences update result:', result);
      }

      return this.sanitizeUser(updatedUser);
    } catch (error) {
      throw error;
    }
  }



  private validateUserUpdateData(updateData: Partial<IUser>): void {
    // Validate gender
    if (updateData.gender && !['MALE', 'FEMALE', 'OTHER'].includes(updateData.gender)) {
      throw new AppError('Invalid gender. Must be MALE, FEMALE, or OTHER', 400);
    }

    // Validate date of birth format (basic validation)
    if (updateData.date_of_birth) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(updateData.date_of_birth)) {
        throw new AppError('Invalid date of birth format. Use YYYY-MM-DD format', 400);
      }
      
      // Check if the date is not in the future
      const dob = new Date(updateData.date_of_birth);
      if (dob > new Date()) {
        throw new AppError('Date of birth cannot be in the future', 400);
      }

      // Check if the user is at least 13 years old
      const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 13) {
        throw new AppError('User must be at least 13 years old', 400);
      }
    }

    // Validate phone number format (basic validation)
    if (updateData.phone_number) {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(updateData.phone_number.replace(/[\s\-\(\)]/g, ''))) {
        throw new AppError('Invalid phone number format', 400);
      }
    }

    // Validate profile image URL
    if (updateData.profile_image_url) {
      try {
        new URL(updateData.profile_image_url);
      } catch {
        throw new AppError('Invalid profile image URL', 400);
      }
    }

    // Validate full name
    if (updateData.full_name !== undefined) {
      if (typeof updateData.full_name !== 'string' || updateData.full_name.trim().length < 2) {
        throw new AppError('Full name must be at least 2 characters long', 400);
      }
    }

    // Validate bio length
    if (updateData.bio !== undefined) {
      if (updateData.bio.length > 500) {
        throw new AppError('Bio must be less than 500 characters', 400);
      }
    }
  }

  private validateMatchingPreferences(preferences: IMatchingPreferences): void {
    // Validate profession
    if (preferences.profession) {
      if (typeof preferences.profession !== 'string' || preferences.profession.trim().length < 2) {
        throw new AppError('Profession must be at least 2 characters long', 400);
      }
      if (preferences.profession.length > 100) {
        throw new AppError('Profession must be less than 100 characters', 400);
      }
    }

    // Validate about_me
    if (preferences.about_me !== undefined) {
      if (typeof preferences.about_me !== 'string') {
        throw new AppError('About me must be a string', 400);
      }
      if (preferences.about_me.length > 1000) {
        throw new AppError('About me must be less than 1000 characters', 400);
      }
    }

    // Validate interests
    if (preferences.interests) {
      if (!Array.isArray(preferences.interests)) {
        throw new AppError('Interests must be an array', 400);
      }
      if (preferences.interests.length > 20) {
        throw new AppError('Cannot have more than 20 interests', 400);
      }
      for (const interest of preferences.interests) {
        if (typeof interest !== 'string' || interest.trim().length < 2) {
          throw new AppError('Each interest must be at least 2 characters long', 400);
        }
        if (interest.length > 50) {
          throw new AppError('Each interest must be less than 50 characters', 400);
        }
      }
    }

    // Validate languages
    if (preferences.languages) {
      if (!Array.isArray(preferences.languages)) {
        throw new AppError('Languages must be an array', 400);
      }
      if (preferences.languages.length > 10) {
        throw new AppError('Cannot have more than 10 languages', 400);
      }
      for (const language of preferences.languages) {
        if (typeof language !== 'string' || language.trim().length < 2) {
          throw new AppError('Each language must be at least 2 characters long', 400);
        }
        if (language.length > 30) {
          throw new AppError('Each language must be less than 30 characters', 400);
        }
      }
    }

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





    
  }
} 