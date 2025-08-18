import { IMatchingPreferences } from '../types/user.types';
import { UserMatchingPreferencesRepository } from '../repositories/userMatchingPreferences.repository';
import { AppError } from '../utils/appError';
import { EmbeddingService } from './embedding.service';

export class UserMatchingPreferencesService {
  private repository: UserMatchingPreferencesRepository;
  private embeddingService: EmbeddingService;

  constructor() {
    this.repository = new UserMatchingPreferencesRepository();
    this.embeddingService = new EmbeddingService();
  }

  async createPreferences(userId: string, preferences: IMatchingPreferences) {
    try {
      this.validateMatchingPreferences(preferences);
      const result = await this.repository.create(userId, preferences);
      
      // Generate and update embedding asynchronously
      this.generateAndUpdateEmbedding(userId, preferences).catch(error => {
        console.error(`Failed to generate embedding for user ${userId}:`, error);
      });

      return result;
    } catch (error) {
      throw error;
    }
  }

  async updatePreferences(userId: string, preferences: Partial<IMatchingPreferences>) {
    try {
      if (preferences) {
        this.validateMatchingPreferences(preferences as IMatchingPreferences);
      }
      const result = await this.repository.update(userId, preferences);

      // Get full preferences and regenerate embedding asynchronously
      this.getPreferences(userId).then(fullPreferences => {
        this.generateAndUpdateEmbedding(userId, fullPreferences.matching_preferences as IMatchingPreferences).catch(error => {
          console.error(`Failed to regenerate embedding for user ${userId}:`, error);
        });
      }).catch(error => {
        console.error(`Failed to get preferences for embedding update for user ${userId}:`, error);
      });

      return result;
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


  }

  async generateAndUpdateEmbedding(userId: string, preferences: IMatchingPreferences) {
    try {
      const { embeddingText, embedding } = await this.embeddingService.generatePreferencesEmbedding(preferences);
      
      let commuteSegments: number[][] = [];
      if (preferences.preferred_commute_time?.start && preferences.preferred_commute_time?.end) {
        commuteSegments = this.embeddingService.calculateCommuteSegments(
          preferences.preferred_commute_time.start,
          preferences.preferred_commute_time.end
        );
      }

      await this.repository.updateEmbedding(userId, embeddingText, embedding, commuteSegments);
      console.log(`Successfully updated embedding for user ${userId}`);
    } catch (error) {
      console.error(`Failed to generate embedding for user ${userId}:`, error);
      throw error;
    }
  }

  async regenerateEmbedding(userId: string) {
    try {
      const preferences = await this.getPreferences(userId);
      if (!preferences) {
        throw new AppError('User preferences not found', 404);
      }

      await this.generateAndUpdateEmbedding(userId, preferences.matching_preferences as IMatchingPreferences);
      return { success: true, message: 'Embedding regenerated successfully' };
    } catch (error) {
      throw error;
    }
  }

  async bulkGenerateEmbeddings(limit: number = 50) {
    try {
      const usersWithoutEmbeddings = await this.repository.findUsersWithoutEmbeddings(limit);
      const updates = [];

      for (const userPrefs of usersWithoutEmbeddings) {
        try {
          const { embeddingText, embedding } = await this.embeddingService.generatePreferencesEmbedding(
            userPrefs.matching_preferences as IMatchingPreferences
          );

          let commuteSegments: number[][] = [];
          if (userPrefs.matching_preferences?.preferred_commute_time?.start && 
              userPrefs.matching_preferences.preferred_commute_time?.end) {
            commuteSegments = this.embeddingService.calculateCommuteSegments(
              userPrefs.matching_preferences.preferred_commute_time.start,
              userPrefs.matching_preferences.preferred_commute_time.end
            );
          }

          updates.push({
            userId: userPrefs.user.toString(),
            embeddingText,
            embedding,
            commuteSegments
          });
        } catch (error) {
          console.error(`Failed to generate embedding for user ${userPrefs.user}:`, error);
        }
      }

      if (updates.length > 0) {
        await this.repository.bulkUpdateEmbeddings(updates);
      }

      return {
        processed: usersWithoutEmbeddings.length,
        successful: updates.length,
        failed: usersWithoutEmbeddings.length - updates.length
      };
    } catch (error) {
      throw error;
    }
  }

  async getEmbeddingStats() {
    try {
      return await this.repository.getEmbeddingStats();
    } catch (error) {
      throw error;
    }
  }
} 