import { JourneyService } from '../../../src/services/journey.service';
import { JourneyRepository } from '../../../src/repositories/journey.repository';
import { AppError } from '../../../src/utils/appError';
import { TravelMode } from '../../../src/types/journey.types';

// Mock dependencies
jest.mock('../../../src/repositories/journey.repository');

const mockJourneyRepository = JourneyRepository as jest.MockedClass<typeof JourneyRepository>;

describe('JourneyService', () => {
  let journeyService: JourneyService;
  let mockJourneyRepo: jest.Mocked<JourneyRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    journeyService = new JourneyService();
    mockJourneyRepo = new mockJourneyRepository() as jest.Mocked<JourneyRepository>;
    (journeyService as any).journeyRepository = mockJourneyRepo;
  });

  describe('createJourney', () => {
    const validJourneyData = {
      travel_mode: TravelMode.BUS,
      route_id: 'route123',
      start_point: 'Station A',
      end_point: 'Station B',
      departure_time: '08:00',
      arrival_time: '09:00'
    };

    it('should create journey successfully with valid data', async () => {
      const mockJourney = {
        _id: 'journey123',
        user: 'user123',
        ...validJourneyData
      };

      mockJourneyRepo.create.mockResolvedValue(mockJourney);

      const result = await journeyService.createJourney('user123', validJourneyData);

      expect(mockJourneyRepo.create).toHaveBeenCalledWith('user123', validJourneyData);
      expect(result).toEqual(mockJourney);
    });

    it('should throw error when required fields are missing', async () => {
      const invalidJourneyData = {
        travel_mode: TravelMode.BUS,
        // Missing route_id, start_point, end_point
      } as any;

      await expect(journeyService.createJourney('user123', invalidJourneyData))
        .rejects
        .toThrow(new AppError('All journey fields are required', 400));

      expect(mockJourneyRepo.create).not.toHaveBeenCalled();
    });

    it('should throw error when travel mode is invalid', async () => {
      const invalidJourneyData = {
        ...validJourneyData,
        travel_mode: 'INVALID_MODE' as any
      };

      await expect(journeyService.createJourney('user123', invalidJourneyData))
        .rejects
        .toThrow(new AppError('Invalid travel mode. Must be one of: bus, tube, overground', 400));
    });

    it('should throw error when route_id is empty', async () => {
      const invalidJourneyData = {
        ...validJourneyData,
        route_id: '   ' // Empty/whitespace
      };

      await expect(journeyService.createJourney('user123', invalidJourneyData))
        .rejects
        .toThrow(new AppError('Route ID cannot be empty', 400));
    });

    it('should throw error when start_point is empty', async () => {
      const invalidJourneyData = {
        ...validJourneyData,
        start_point: '   ' // Whitespace only
      };

      await expect(journeyService.createJourney('user123', invalidJourneyData))
        .rejects
        .toThrow(new AppError('Start point cannot be empty', 400));
    });

    it('should throw error when end_point is empty', async () => {
      const invalidJourneyData = {
        ...validJourneyData,
        end_point: '   ' // Whitespace only
      };

      await expect(journeyService.createJourney('user123', invalidJourneyData))
        .rejects
        .toThrow(new AppError('End point cannot be empty', 400));
    });

    it('should throw error when start and end points are the same', async () => {
      const invalidJourneyData = {
        ...validJourneyData,
        start_point: 'Same Station',
        end_point: 'same station' // Case insensitive check
      };

      await expect(journeyService.createJourney('user123', invalidJourneyData))
        .rejects
        .toThrow(new AppError('Start point and end point cannot be the same', 400));
    });
  });

  describe('getJourneyById', () => {
    it('should return journey when found', async () => {
      const mockJourney = {
        _id: 'journey123',
        user: 'user123',
        travel_mode: TravelMode.BUS,
        route_id: 'route123'
      };

      mockJourneyRepo.findById.mockResolvedValue(mockJourney);

      const result = await journeyService.getJourneyById('journey123');

      expect(mockJourneyRepo.findById).toHaveBeenCalledWith('journey123');
      expect(result).toEqual(mockJourney);
    });

    it('should throw error when journey not found', async () => {
      mockJourneyRepo.findById.mockResolvedValue(null);

      await expect(journeyService.getJourneyById('nonexistent'))
        .rejects
        .toThrow(new AppError('Journey not found', 404));
    });
  });

  describe('getUserJourneys', () => {
    it('should return user journeys', async () => {
      const mockJourneys = [
        { _id: 'journey123', user: 'user123' },
        { _id: 'journey456', user: 'user123' }
      ];

      mockJourneyRepo.findByUser.mockResolvedValue(mockJourneys);

      const result = await journeyService.getUserJourneys('user123');

      expect(mockJourneyRepo.findByUser).toHaveBeenCalledWith('user123');
      expect(result).toEqual(mockJourneys);
    });
  });

  describe('getAllJourneys', () => {
    it('should return all journeys with filters', async () => {
      const query = { travel_mode: TravelMode.BUS, route_id: 'route123' };
      const mockJourneys = [
        { _id: 'journey123', travel_mode: TravelMode.BUS, route_id: 'route123' }
      ];

      mockJourneyRepo.findAll.mockResolvedValue(mockJourneys);

      const result = await journeyService.getAllJourneys(query);

      expect(mockJourneyRepo.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockJourneys);
    });

    it('should return all journeys without filters', async () => {
      const mockJourneys = [
        { _id: 'journey123' },
        { _id: 'journey456' }
      ];

      mockJourneyRepo.findAll.mockResolvedValue(mockJourneys);

      const result = await journeyService.getAllJourneys();

      expect(mockJourneyRepo.findAll).toHaveBeenCalledWith({});
      expect(result).toEqual(mockJourneys);
    });
  });

  describe('updateJourney', () => {
    const updateData = {
      start_point: 'Updated Station A',
      end_point: 'Updated Station B'
    };

    it('should update journey successfully', async () => {
      const mockUpdatedJourney = {
        _id: 'journey123',
        user: 'user123',
        ...updateData
      };

      mockJourneyRepo.update.mockResolvedValue(mockUpdatedJourney);

      const result = await journeyService.updateJourney('journey123', 'user123', updateData);

      expect(mockJourneyRepo.update).toHaveBeenCalledWith('journey123', 'user123', updateData);
      expect(result).toEqual(mockUpdatedJourney);
    });

    it('should throw error when journey not found or unauthorized', async () => {
      mockJourneyRepo.update.mockResolvedValue(null);

      await expect(journeyService.updateJourney('journey123', 'user123', updateData))
        .rejects
        .toThrow(new AppError('Journey not found or unauthorized', 404));
    });

    it('should throw error when no fields provided for update', async () => {
      await expect(journeyService.updateJourney('journey123', 'user123', {}))
        .rejects
        .toThrow(new AppError('At least one field must be provided for update', 400));
    });

    it('should throw error when updating travel_mode to invalid value', async () => {
      const invalidUpdateData = {
        travel_mode: 'INVALID_MODE' as any
      };

      await expect(journeyService.updateJourney('journey123', 'user123', invalidUpdateData))
        .rejects
        .toThrow(new AppError('Invalid travel mode. Must be one of: bus, tube, overground', 400));
    });

    it('should throw error when updating route_id to empty value', async () => {
      const invalidUpdateData = {
        route_id: '   '
      };

      await expect(journeyService.updateJourney('journey123', 'user123', invalidUpdateData))
        .rejects
        .toThrow(new AppError('Route ID cannot be empty', 400));
    });

    it('should throw error when updating start_point to empty value', async () => {
      const invalidUpdateData = {
        start_point: '   ' // Whitespace only
      };

      await expect(journeyService.updateJourney('journey123', 'user123', invalidUpdateData))
        .rejects
        .toThrow(new AppError('Start point cannot be empty', 400));
    });

    it('should throw error when updating end_point to empty value', async () => {
      const invalidUpdateData = {
        end_point: '   ' // Whitespace only
      };

      await expect(journeyService.updateJourney('journey123', 'user123', invalidUpdateData))
        .rejects
        .toThrow(new AppError('End point cannot be empty', 400));
    });

    it('should throw error when updating start and end points to same value', async () => {
      const invalidUpdateData = {
        start_point: 'Same Station',
        end_point: 'same station'
      };

      await expect(journeyService.updateJourney('journey123', 'user123', invalidUpdateData))
        .rejects
        .toThrow(new AppError('Start point and end point cannot be the same', 400));
    });
  });

  describe('deleteJourney', () => {
    it('should delete journey successfully', async () => {
      mockJourneyRepo.delete.mockResolvedValue(true);

      await journeyService.deleteJourney('journey123', 'user123');

      expect(mockJourneyRepo.delete).toHaveBeenCalledWith('journey123', 'user123');
    });

    it('should throw error when journey not found or unauthorized', async () => {
      mockJourneyRepo.delete.mockResolvedValue(false);

      await expect(journeyService.deleteJourney('journey123', 'user123'))
        .rejects
        .toThrow(new AppError('Journey not found or unauthorized', 404));
    });
  });

  describe('getJourneysByRoute', () => {
    it('should return journeys by route successfully', async () => {
      const mockJourneys = [
        { _id: 'journey123', travel_mode: TravelMode.BUS, route_id: 'route123' }
      ];

      mockJourneyRepo.findByRoute.mockResolvedValue(mockJourneys);

      const result = await journeyService.getJourneysByRoute('BUS', 'route123');

      expect(mockJourneyRepo.findByRoute).toHaveBeenCalledWith('BUS', 'route123');
      expect(result).toEqual(mockJourneys);
    });

    it('should throw error for invalid travel mode', async () => {
      await expect(journeyService.getJourneysByRoute('INVALID_MODE', 'route123'))
        .rejects
        .toThrow(new AppError('Invalid travel mode. Must be one of: bus, tube, overground', 400));
    });
  });

  describe('findSimilarJourneys', () => {
    const journeyData = {
      travel_mode: TravelMode.BUS,
      route_id: 'route123',
      start_point: 'Station A',
      end_point: 'Station B',
      departure_time: '08:00',
      arrival_time: '09:00'
    };

    it('should find similar journeys successfully', async () => {
      const mockSimilarJourneys = [
        { _id: 'journey456', ...journeyData }
      ];

      mockJourneyRepo.findSimilarJourneys.mockResolvedValue(mockSimilarJourneys);

      const result = await journeyService.findSimilarJourneys('user123', journeyData);

      expect(mockJourneyRepo.findSimilarJourneys).toHaveBeenCalledWith('user123', journeyData);
      expect(result).toEqual(mockSimilarJourneys);
    });

    it('should validate journey data before finding similar journeys', async () => {
      const invalidJourneyData = {
        travel_mode: 'INVALID' as any,
        route_id: 'route123',
        start_point: 'Station A',
        end_point: 'Station B'
      };

      await expect(journeyService.findSimilarJourneys('user123', invalidJourneyData))
        .rejects
        .toThrow(new AppError('Invalid travel mode. Must be one of: bus, tube, overground', 400));
    });
  });

  describe('getJourneyStats', () => {
    it('should return journey statistics for specific user', async () => {
      mockJourneyRepo.count
        .mockResolvedValueOnce(10) // Total journeys
        .mockResolvedValueOnce(5)  // Bus journeys
        .mockResolvedValueOnce(3)  // Tube journeys
        .mockResolvedValueOnce(2); // Overground journeys

      const result = await journeyService.getJourneyStats('user123');

      expect(mockJourneyRepo.count).toHaveBeenCalledTimes(4);
      expect(mockJourneyRepo.count).toHaveBeenNthCalledWith(1, { user: 'user123' });
      expect(mockJourneyRepo.count).toHaveBeenNthCalledWith(2, { user: 'user123', travel_mode: TravelMode.BUS });
      expect(mockJourneyRepo.count).toHaveBeenNthCalledWith(3, { user: 'user123', travel_mode: TravelMode.TUBE });
      expect(mockJourneyRepo.count).toHaveBeenNthCalledWith(4, { user: 'user123', travel_mode: TravelMode.OVERGROUND });

      expect(result).toEqual({
        totalJourneys: 10,
        journeysByMode: {
          bus: 5,
          tube: 3,
          overground: 2
        }
      });
    });

    it('should return journey statistics for all users when no userId provided', async () => {
      mockJourneyRepo.count
        .mockResolvedValueOnce(50) // Total journeys
        .mockResolvedValueOnce(25) // Bus journeys
        .mockResolvedValueOnce(15) // Tube journeys
        .mockResolvedValueOnce(10); // Overground journeys

      const result = await journeyService.getJourneyStats();

      expect(mockJourneyRepo.count).toHaveBeenCalledTimes(4);
      expect(mockJourneyRepo.count).toHaveBeenNthCalledWith(1, {});
      expect(mockJourneyRepo.count).toHaveBeenNthCalledWith(2, { travel_mode: TravelMode.BUS });
      expect(mockJourneyRepo.count).toHaveBeenNthCalledWith(3, { travel_mode: TravelMode.TUBE });
      expect(mockJourneyRepo.count).toHaveBeenNthCalledWith(4, { travel_mode: TravelMode.OVERGROUND });

      expect(result).toEqual({
        totalJourneys: 50,
        journeysByMode: {
          bus: 25,
          tube: 15,
          overground: 10
        }
      });
    });
  });
});