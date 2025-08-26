import { JourneyRepository } from '../repositories/journey.repository';
import { IJourney, IJourneyCreate, IJourneyUpdate, IJourneyQuery, TravelMode } from '../types/journey.types';
import { AppError } from '../utils/appError';

export class JourneyService {
  private journeyRepository: JourneyRepository;

  constructor() {
    this.journeyRepository = new JourneyRepository();
  }

  async createJourney(userId: string, journeyData: IJourneyCreate): Promise<IJourney> {
    try {
      this.validateJourneyData(journeyData);
      
      const journey = await this.journeyRepository.create(userId, journeyData);
      return journey;
    } catch (error) {
      throw error;
    }
  }

  async getJourneyById(id: string): Promise<IJourney> {
    try {
      // Check if the ID is a valid ObjectId format
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        throw new AppError('Invalid journey ID format', 400);
      }
      
      const journey = await this.journeyRepository.findById(id);
      if (!journey) {
        throw new AppError('Journey not found', 404);
      }
      return journey;
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      // Handle Mongoose CastError for invalid ObjectId
      if (error.name === 'CastError') {
        throw new AppError('Invalid journey ID format', 400);
      }
      throw error;
    }
  }

  async getUserJourneys(userId: string): Promise<IJourney[]> {
    try {
      return await this.journeyRepository.findByUser(userId);
    } catch (error) {
      throw error;
    }
  }

  async getAllJourneys(query: IJourneyQuery = {}): Promise<IJourney[]> {
    try {
      return await this.journeyRepository.findAll(query);
    } catch (error) {
      throw error;
    }
  }

  async updateJourney(id: string, userId: string, updateData: IJourneyUpdate): Promise<IJourney> {
    try {
      this.validateJourneyUpdateData(updateData);
      
      const journey = await this.journeyRepository.update(id, userId, updateData);
      if (!journey) {
        throw new AppError('Journey not found or unauthorized', 404);
      }
      return journey;
    } catch (error) {
      throw error;
    }
  }

  async deleteJourney(id: string, userId: string): Promise<void> {
    try {
      const deleted = await this.journeyRepository.delete(id, userId);
      if (!deleted) {
        throw new AppError('Journey not found or unauthorized', 404);
      }
    } catch (error) {
      throw error;
    }
  }

  async getJourneysByRoute(travel_mode: string, route_id: string): Promise<IJourney[]> {
    try {
      this.validateTravelMode(travel_mode);
      return await this.journeyRepository.findByRoute(travel_mode, route_id);
    } catch (error) {
      throw error;
    }
  }

  async findSimilarJourneys(userId: string, journey: IJourneyCreate): Promise<IJourney[]> {
    try {
      this.validateJourneyData(journey);
      return await this.journeyRepository.findSimilarJourneys(userId, journey);
    } catch (error) {
      throw error;
    }
  }

  async getJourneyStats(userId?: string): Promise<any> {
    try {
      const query: IJourneyQuery = userId ? { user: userId } : {};
      const totalJourneys = await this.journeyRepository.count(query);
      
      const journeysByMode = await Promise.all([
        this.journeyRepository.count({ ...query, travel_mode: TravelMode.BUS }),
        this.journeyRepository.count({ ...query, travel_mode: TravelMode.TUBE }),
        this.journeyRepository.count({ ...query, travel_mode: TravelMode.OVERGROUND })
      ]);

      return {
        totalJourneys,
        journeysByMode: {
          bus: journeysByMode[0],
          tube: journeysByMode[1],
          overground: journeysByMode[2]
        }
      };
    } catch (error) {
      throw error;
    }
  }

  private validateJourneyData(journeyData: IJourneyCreate): void {
    if (!journeyData.travel_mode || !journeyData.route_id || !journeyData.start_point || !journeyData.end_point) {
      throw new AppError('All journey fields are required', 400);
    }

    this.validateTravelMode(journeyData.travel_mode);

    if (journeyData.route_id.trim().length === 0) {
      throw new AppError('Route ID cannot be empty', 400);
    }

    if (journeyData.start_point.trim().length === 0) {
      throw new AppError('Start point cannot be empty', 400);
    }

    if (journeyData.end_point.trim().length === 0) {
      throw new AppError('End point cannot be empty', 400);
    }

    if (journeyData.start_point.toLowerCase() === journeyData.end_point.toLowerCase()) {
      throw new AppError('Start point and end point cannot be the same', 400);
    }
  }

  private validateJourneyUpdateData(updateData: IJourneyUpdate): void {
    if (Object.keys(updateData).length === 0) {
      throw new AppError('At least one field must be provided for update', 400);
    }

    if (updateData.travel_mode) {
      this.validateTravelMode(updateData.travel_mode);
    }

    if (updateData.route_id !== undefined && updateData.route_id.trim().length === 0) {
      throw new AppError('Route ID cannot be empty', 400);
    }

    if (updateData.start_point !== undefined && updateData.start_point.trim().length === 0) {
      throw new AppError('Start point cannot be empty', 400);
    }

    if (updateData.end_point !== undefined && updateData.end_point.trim().length === 0) {
      throw new AppError('End point cannot be empty', 400);
    }

    if (updateData.start_point && updateData.end_point && 
        updateData.start_point.toLowerCase() === updateData.end_point.toLowerCase()) {
      throw new AppError('Start point and end point cannot be the same', 400);
    }
  }

  private validateTravelMode(travel_mode: string): void {
    const validModes = Object.values(TravelMode);
    if (!validModes.includes(travel_mode as TravelMode)) {
      throw new AppError(`Invalid travel mode. Must be one of: ${validModes.join(', ')}`, 400);
    }
  }
} 