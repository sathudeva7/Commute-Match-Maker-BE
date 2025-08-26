import { Request, Response } from 'express';
import { JourneyService } from '../services/journey.service';
import { IJourneyCreate, IJourneyUpdate, AuthenticatedJourneyRequest } from '../types/journey.types';
import { AppError } from '../utils/appError';
import { ApiResponse } from '../types/response.types';

export class JourneyController {
  private journeyService: JourneyService;

  constructor() {
    this.journeyService = new JourneyService();
  }

  createJourney = async (req: AuthenticatedJourneyRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const journeyData: IJourneyCreate = req.body;
      const result = await this.journeyService.createJourney(userId, journeyData);
      
      const response: ApiResponse = {
        success: true,
        result,
        message: 'Journey created successfully'
      };
      
      res.status(201).json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  getJourneyById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.journeyService.getJourneyById(id);
      
      const response: ApiResponse = {
        success: true,
        result,
        message: 'Journey retrieved successfully'
      };
      
      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  getUserJourneys = async (req: AuthenticatedJourneyRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const result = await this.journeyService.getUserJourneys(userId);
      
      const response: ApiResponse = {
        success: true,
        result,
        message: 'User journeys retrieved successfully'
      };
      
      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  getAllJourneys = async (req: Request, res: Response): Promise<void> => {
    try {
      const query = req.query;
      const result = await this.journeyService.getAllJourneys(query);
      
      const response: ApiResponse = {
        success: true,
        result,
        message: 'Journeys retrieved successfully'
      };
      
      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  updateJourney = async (req: AuthenticatedJourneyRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const { id } = req.params;
      const updateData: IJourneyUpdate = req.body;
      const result = await this.journeyService.updateJourney(id, userId, updateData);
      
      const response: ApiResponse = {
        success: true,
        result,
        message: 'Journey updated successfully'
      };
      
      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  deleteJourney = async (req: AuthenticatedJourneyRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const { id } = req.params;
      await this.journeyService.deleteJourney(id, userId);
      
      const response: ApiResponse = {
        success: true,
        result: null,
        message: 'Journey deleted successfully'
      };
      
      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  getJourneysByRoute = async (req: Request, res: Response): Promise<void> => {
    try {
      const { travel_mode, route_id } = req.params;
      const result = await this.journeyService.getJourneysByRoute(travel_mode, route_id);
      
      const response: ApiResponse = {
        success: true,
        result,
        message: 'Journeys by route retrieved successfully'
      };
      
      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  findSimilarJourneys = async (req: AuthenticatedJourneyRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const journeyData: IJourneyCreate = req.body;
      const result = await this.journeyService.findSimilarJourneys(userId, journeyData);
      
      const response: ApiResponse = {
        success: true,
        result,
        message: 'Similar journeys found successfully'
      };
      
      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  getJourneyStats = async (req: AuthenticatedJourneyRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?._id;
      const result = await this.journeyService.getJourneyStats(userId);
      
      const response: ApiResponse = {
        success: true,
        result,
        message: 'Journey statistics retrieved successfully'
      };
      
      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  private handleError(error: any, res: Response): void {
    if (error instanceof AppError) {
      const response: ApiResponse = {
        success: false,
        result: null,
        message: error.message
      };
      res.status(error.statusCode).json(response);
    } else {
      console.error('Journey Controller Error:', error);
      const response: ApiResponse = {
        success: false,
        result: null,
        message: 'Internal server error'
      };
      res.status(500).json(response);
    }
  }
} 