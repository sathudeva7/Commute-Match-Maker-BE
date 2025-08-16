import { IMatchingPreferences } from '../types/user.types';
import { UserMatchingPreferencesRepository } from '../repositories/userMatchingPreferences.repository';
import { AppError } from '../utils/appError';

export class UserMatchingPreferencesService {
  private repository: UserMatchingPreferencesRepository;

  constructor() {
    this.repository = new UserMatchingPreferencesRepository();
  }

  async createPreferences(userId: string, preferences: IMatchingPreferences) {
    try {
      this.validateMatchingPreferences(preferences);
      return await this.repository.create(userId, preferences);
    } catch (error) {
      throw error;
    }
  }

  async updatePreferences(userId: string, preferences: Partial<IMatchingPreferences>) {
    try {
      if (preferences) {
        this.validateMatchingPreferences(preferences as IMatchingPreferences);
      }
      return await this.repository.update(userId, preferences);
    } catch (error) {
      throw error;
    }
  }

  async getPreferences(userId: string) {
    try {
      const preferences = await this.repository.findByUserId(userId);
      if (!preferences) {
        throw new AppError('Matching preferences not found', 404);
      }
      return preferences;
    } catch (error) {
      throw error;
    }
  }

  async deletePreferences(userId: string) {
    try {
      const result = await this.repository.delete(userId);
      if (!result) {
        throw new AppError('Matching preferences not found', 404);
      }
      return result;
    } catch (error) {
      throw error;
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