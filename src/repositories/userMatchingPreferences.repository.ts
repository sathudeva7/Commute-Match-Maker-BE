import { IMatchingPreferences } from '../types/user.types';
import UserMatchingPreferences from '../models/UserMatchingPreferences';
import { AppError } from '../utils/appError';
import User from '../models/User';

export class UserMatchingPreferencesRepository {
  async create(userId: string, preferences: IMatchingPreferences) {
    try {
      // Check if preferences already exist
      const existingPreferences = await UserMatchingPreferences.findOne({ user: userId });
      if (existingPreferences) {
        throw new AppError('Matching preferences already exist for this user', 400);
      }

      // Create new preferences
      const newPreferences = await UserMatchingPreferences.create({
        user: userId,
        matching_preferences: {
          profession: preferences.profession,
          languages: preferences.languages,
          interests: preferences.interests,
          preferred_commute_times: preferences.preferred_commute_times,
          preferred_commute_days: preferences.preferred_commute_days,
        }
      });

      // Populate user details
      const populatedPreferences = await UserMatchingPreferences.findById(newPreferences._id)
        .populate('user', 'full_name email')
        .lean();

      return populatedPreferences;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to create matching preferences', 500);
    }
  }

  async update(userId: string, preferences: Partial<IMatchingPreferences>) {
    try {
      const updatedPreferences = await UserMatchingPreferences.findOneAndUpdate(
        { user: userId },
        { $set: { matching_preferences: preferences } },
        { new: true }
      ).populate('user', 'full_name email');

      if (!updatedPreferences) {
        throw new AppError('Matching preferences not found', 404);
      }

      return updatedPreferences;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update matching preferences', 500);
    }
  }

  async findByUserId(userId: string) {
    try {
      const preferences = await UserMatchingPreferences.findOne({ user: userId })
        .populate('user', 'full_name email');
      return preferences;
    } catch (error) {
      throw new AppError('Failed to fetch matching preferences', 500);
    }
  }

  async delete(userId: string) {
    try {
      const result = await UserMatchingPreferences.findOneAndDelete({ user: userId });
      return !!result;
    } catch (error) {
      throw new AppError('Failed to delete matching preferences', 500);
    }
  }
} 