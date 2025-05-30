import { Request, Response } from 'express';
import { UserMatchingPreferencesService } from '../services/userMatchingPreferences.service';
import { IMatchingPreferences } from '../types/user.types';
import { AppError } from '../utils/appError';
import { ApiResponse } from '../types/response.types';
import { AuthenticatedRequest } from '../types/user.types';

export class UserMatchingPreferencesController {
  private service: UserMatchingPreferencesService;

  constructor() {
    this.service = new UserMatchingPreferencesService();
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
} 