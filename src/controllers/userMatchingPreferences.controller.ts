import { Request, Response } from 'express';
import { UserMatchingPreferencesService } from '../services/userMatchingPreferences.service';
import { SemanticMatchingService } from '../services/semanticMatching.service';
import { IMatchingPreferences, ISemanticMatchQuery } from '../types/user.types';
import { AppError } from '../utils/appError';
import { ApiResponse } from '../types/response.types';
import { AuthenticatedRequest } from '../types/user.types';

export class UserMatchingPreferencesController {
  private service: UserMatchingPreferencesService;
  private semanticMatchingService: SemanticMatchingService;

  constructor() {
    this.service = new UserMatchingPreferencesService();
    this.semanticMatchingService = new SemanticMatchingService();
  }

  createPreferences = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const preferences: IMatchingPreferences = req.body;
      const result = await this.service.createPreferences(userId, preferences);
      
      const response: ApiResponse = {
        success: true,
        result,
        message: 'Matching preferences created successfully'
      };
      
      res.status(201).json(response);
    } catch (error) {
      if (error instanceof AppError) {
        const response: ApiResponse = {
          success: false,
          result: null,
          message: error.message
        };
        res.status(error.statusCode).json(response);
      } else {
        const response: ApiResponse = {
          success: false,
          result: null,
          message: 'Internal server error'
        };
        res.status(500).json(response);
      }
    }
  };

  updatePreferences = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const preferences: Partial<IMatchingPreferences> = req.body;
      const result = await this.service.updatePreferences(userId, preferences);
      
      const response: ApiResponse = {
        success: true,
        result,
        message: 'Matching preferences updated successfully'
      };
      
      res.status(200).json(response);
    } catch (error) {
      if (error instanceof AppError) {
        const response: ApiResponse = {
          success: false,
          result: null,
          message: error.message
        };
        res.status(error.statusCode).json(response);
      } else {
        const response: ApiResponse = {
          success: false,
          result: null,
          message: 'Internal server error'
        };
        res.status(500).json(response);
      }
    }
  };

  getPreferences = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const result = await this.service.getPreferences(userId);
      
      const response: ApiResponse = {
        success: true,
        result,
        message: 'Matching preferences retrieved successfully'
      };
      
      res.status(200).json(response);
    } catch (error) {
      if (error instanceof AppError) {
        const response: ApiResponse = {
          success: false,
          result: null,
          message: error.message
        };
        res.status(error.statusCode).json(response);
      } else {
        const response: ApiResponse = {
          success: false,
          result: null,
          message: 'Internal server error'
        };
        res.status(500).json(response);
      }
    }
  };

  deletePreferences = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      await this.service.deletePreferences(userId);
      
      const response: ApiResponse = {
        success: true,
        result: null,
        message: 'Matching preferences deleted successfully'
      };
      
      res.status(200).json(response);
    } catch (error) {
      if (error instanceof AppError) {
        const response: ApiResponse = {
          success: false,
          result: null,
          message: error.message
        };
        res.status(error.statusCode).json(response);
      } else {
        const response: ApiResponse = {
          success: false,
          result: null,
          message: 'Internal server error'
        };
        res.status(500).json(response);
      }
    }
  };

  findSemanticMatches = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const query: ISemanticMatchQuery = {
        userId,
        limit: parseInt(req.query.limit as string) || 50,
        minScore: parseFloat(req.query.minScore as string) || 0.1,
        weights: req.body.weights || undefined
      };

      const matches = await this.semanticMatchingService.findSemanticMatches(query);
      
      const response: ApiResponse = {
        success: true,
        result: {
          matches,
          count: matches.length,
          query: {
            limit: query.limit,
            minScore: query.minScore,
            weights: query.weights
          }
        },
        message: 'Semantic matches found successfully'
      };
      
      res.status(200).json(response);
    } catch (error) {
      if (error instanceof AppError) {
        const response: ApiResponse = {
          success: false,
          result: null,
          message: error.message
        };
        res.status(error.statusCode).json(response);
      } else {
        const response: ApiResponse = {
          success: false,
          result: null,
          message: 'Internal server error'
        };
        res.status(500).json(response);
      }
    }
  };

  getSimilarityMetrics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?._id;
      const targetUserId = req.params.targetUserId;
      
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      if (!targetUserId) {
        throw new AppError('Target user ID is required', 400);
      }

      const metrics = await this.semanticMatchingService.getSimilarityMetrics(userId, targetUserId);
      
      const response: ApiResponse = {
        success: true,
        result: metrics,
        message: 'Similarity metrics retrieved successfully'
      };
      
      res.status(200).json(response);
    } catch (error) {
      if (error instanceof AppError) {
        const response: ApiResponse = {
          success: false,
          result: null,
          message: error.message
        };
        res.status(error.statusCode).json(response);
      } else {
        const response: ApiResponse = {
          success: false,
          result: null,
          message: 'Internal server error'
        };
        res.status(500).json(response);
      }
    }
  };

  regenerateEmbedding = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const result = await this.service.regenerateEmbedding(userId);
      
      const response: ApiResponse = {
        success: true,
        result,
        message: 'Embedding regenerated successfully'
      };
      
      res.status(200).json(response);
    } catch (error) {
      if (error instanceof AppError) {
        const response: ApiResponse = {
          success: false,
          result: null,
          message: error.message
        };
        res.status(error.statusCode).json(response);
      } else {
        const response: ApiResponse = {
          success: false,
          result: null,
          message: 'Internal server error'
        };
        res.status(500).json(response);
      }
    }
  };

  bulkGenerateEmbeddings = async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const result = await this.service.bulkGenerateEmbeddings(limit);
      
      const response: ApiResponse = {
        success: true,
        result,
        message: 'Bulk embedding generation completed'
      };
      
      res.status(200).json(response);
    } catch (error) {
      if (error instanceof AppError) {
        const response: ApiResponse = {
          success: false,
          result: null,
          message: error.message
        };
        res.status(error.statusCode).json(response);
      } else {
        const response: ApiResponse = {
          success: false,
          result: null,
          message: 'Internal server error'
        };
        res.status(500).json(response);
      }
    }
  };

  getEmbeddingStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await this.service.getEmbeddingStats();
      
      const response: ApiResponse = {
        success: true,
        result: stats,
        message: 'Embedding statistics retrieved successfully'
      };
      
      res.status(200).json(response);
    } catch (error) {
      if (error instanceof AppError) {
        const response: ApiResponse = {
          success: false,
          result: null,
          message: error.message
        };
        res.status(error.statusCode).json(response);
      } else {
        const response: ApiResponse = {
          success: false,
          result: null,
          message: 'Internal server error'
        };
        res.status(500).json(response);
      }
    }
  };
} 