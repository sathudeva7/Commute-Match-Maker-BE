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