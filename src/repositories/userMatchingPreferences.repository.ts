import { IMatchingPreferences, IUserMatchingPreferences } from '../types/user.types';
import UserMatchingPreferences from '../models/UserMatchingPreferences';
import { AppError } from '../utils/appError';
import User from '../models/User';
import mongoose from 'mongoose';

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
          preferred_commute_time: preferences.preferred_commute_time,
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
        { matching_preferences: preferences },
        { new: true, upsert: true }
      ).populate('user', 'full_name email');

      return updatedPreferences.toObject();
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update matching preferences', 500);
    }
  }

  async findByUserId(userId: string) {
    try {
      const preferences = await UserMatchingPreferences.findOne({ user: userId })
        .populate('user', 'full_name');
      return preferences ? preferences.toObject() : null;
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

  async updateEmbedding(userId: string, embeddingText: string, embedding: number[], commuteSegments: number[][]) {
    try {
      const updatedPreferences = await UserMatchingPreferences.findOneAndUpdate(
        { user: userId },
        {
          embedding_text: embeddingText,
          embedding: embedding,
          commute_segments: commuteSegments
        },
        { new: true }
      );

      if (!updatedPreferences) {
        throw new AppError('User preferences not found', 404);
      }

      return updatedPreferences.toObject();
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update embedding', 500);
    }
  }

  async findUsersWithoutEmbeddings(limit: number = 100) {
    try {
      return await UserMatchingPreferences.find({
        $or: [
          { embedding: { $exists: false } },
          { embedding: { $size: 0 } },
          { embedding_text: { $exists: false } },
          { embedding_text: '' }
        ]
      })
        .limit(limit)
        .lean();
    } catch (error) {
      throw new AppError('Failed to fetch users without embeddings', 500);
    }
  }

  async bulkUpdateEmbeddings(updates: Array<{
    userId: string;
    embeddingText: string;
    embedding: number[];
    commuteSegments: number[][];
  }>) {
    try {
      const bulkOps = updates.map(update => ({
        updateOne: {
          filter: { user: new mongoose.Types.ObjectId(update.userId) },
          update: {
            $set: {
              embedding_text: update.embeddingText,
              embedding: update.embedding,
              commute_segments: update.commuteSegments
            }
          }
        }
      }));

      const result = await UserMatchingPreferences.bulkWrite(bulkOps);
      return result;
    } catch (error) {
      throw new AppError('Failed to bulk update embeddings', 500);
    }
  }

  async findUsersForMatching(excludeUserId: string, limit: number = 1000) {
    try {
      return await UserMatchingPreferences.find({
        user: { $ne: new mongoose.Types.ObjectId(excludeUserId) },
        embedding: { $exists: true, $ne: [] }
      })
        .limit(limit)
        .lean();
    } catch (error) {
      throw new AppError('Failed to fetch users for matching', 500);
    }
  }

  async getEmbeddingStats() {
    try {
      const totalUsers = await UserMatchingPreferences.countDocuments();
      const usersWithEmbeddings = await UserMatchingPreferences.countDocuments({
        embedding: { $exists: true, $ne: [] }
      });
      const usersWithoutEmbeddings = totalUsers - usersWithEmbeddings;

      return {
        totalUsers,
        usersWithEmbeddings,
        usersWithoutEmbeddings,
        embeddingCoverage: totalUsers > 0 ? (usersWithEmbeddings / totalUsers * 100).toFixed(2) : '0.00'
      };
    } catch (error) {
      throw new AppError('Failed to get embedding stats', 500);
    }
  }
} 