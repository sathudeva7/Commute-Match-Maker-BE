import request from 'supertest';
import express from 'express';
import { JourneyController } from '../../../src/controllers/journey.controller';
import { JourneyService } from '../../../src/services/journey.service';
import { AppError } from '../../../src/utils/appError';
import { TravelMode } from '../../../src/types/journey.types';

// Mock the JourneyService
jest.mock('../../../src/services/journey.service');

const app = express();
app.use(express.json());

const journeyController = new JourneyController();

// Setup middleware to mock authentication
app.use((req, res, next) => {
  req.user = { _id: 'user123' };
  next();
});

// Setup routes
app.post('/journeys', journeyController.createJourney);
app.get('/journeys/:id', journeyController.getJourneyById);
app.get('/journeys/user/all', journeyController.getUserJourneys);
app.get('/journeys', journeyController.getAllJourneys);
app.put('/journeys/:id', journeyController.updateJourney);
app.delete('/journeys/:id', journeyController.deleteJourney);
app.get('/journeys/route/:travel_mode/:route_id', journeyController.getJourneysByRoute);
app.post('/journeys/similar', journeyController.findSimilarJourneys);
app.get('/journeys/stats/user', journeyController.getJourneyStats);

const mockJourneyService = JourneyService as jest.MockedClass<typeof JourneyService>;

describe('JourneyController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /journeys (createJourney)', () => {
    const validJourneyData = {
      travel_mode: TravelMode.BUS,
      route_id: 'route123',
      start_point: 'Station A',
      end_point: 'Station B',
      departure_time: '08:00',
      arrival_time: '09:00'
    };

    it('should create journey successfully', async () => {
      const mockJourney = {
        _id: 'journey123',
        user: 'user123',
        ...validJourneyData
      };

      mockJourneyService.prototype.createJourney.mockResolvedValue(mockJourney);

      const response = await request(app)
        .post('/journeys')
        .send(validJourneyData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.result).toEqual(mockJourney);
      expect(response.body.message).toBe('Journey created successfully');
      expect(mockJourneyService.prototype.createJourney).toHaveBeenCalledWith('user123', validJourneyData);
    });

    it('should handle validation errors', async () => {
      mockJourneyService.prototype.createJourney.mockRejectedValue(
        new AppError('All journey fields are required', 400)
      );

      const response = await request(app)
        .post('/journeys')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('All journey fields are required');
    });

    it('should handle invalid travel mode', async () => {
      const invalidJourneyData = {
        ...validJourneyData,
        travel_mode: 'INVALID_MODE'
      };

      mockJourneyService.prototype.createJourney.mockRejectedValue(
        new AppError('Invalid travel mode. Must be one of: bus, tube, overground', 400)
      );

      const response = await request(app)
        .post('/journeys')
        .send(invalidJourneyData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid travel mode. Must be one of: bus, tube, overground');
    });
  });

  describe('GET /journeys/:id (getJourneyById)', () => {
    it('should get journey by ID successfully', async () => {
      const mockJourney = {
        _id: 'journey123',
        user: 'user123',
        travel_mode: TravelMode.BUS,
        route_id: 'route123',
        start_point: 'Station A',
        end_point: 'Station B'
      };

      mockJourneyService.prototype.getJourneyById.mockResolvedValue(mockJourney);

      const response = await request(app).get('/journeys/journey123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.result).toEqual(mockJourney);
      expect(response.body.message).toBe('Journey retrieved successfully');
      expect(mockJourneyService.prototype.getJourneyById).toHaveBeenCalledWith('journey123');
    });

    it('should return 404 when journey not found', async () => {
      mockJourneyService.prototype.getJourneyById.mockRejectedValue(
        new AppError('Journey not found', 404)
      );

      const response = await request(app).get('/journeys/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Journey not found');
    });
  });

  describe('GET /journeys/user/all (getUserJourneys)', () => {
    it('should get user journeys successfully', async () => {
      const mockJourneys = [
        {
          _id: 'journey123',
          user: 'user123',
          travel_mode: TravelMode.BUS,
          route_id: 'route123'
        },
        {
          _id: 'journey456',
          user: 'user123',
          travel_mode: TravelMode.TUBE,
          route_id: 'route456'
        }
      ];

      mockJourneyService.prototype.getUserJourneys.mockResolvedValue(mockJourneys);

      const response = await request(app).get('/journeys/user/all');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.result).toEqual(mockJourneys);
      expect(response.body.message).toBe('User journeys retrieved successfully');
      expect(mockJourneyService.prototype.getUserJourneys).toHaveBeenCalledWith('user123');
    });
  });

  describe('GET /journeys (getAllJourneys)', () => {
    it('should get all journeys with query filters', async () => {
      const mockJourneys = [
        { _id: 'journey123', travel_mode: TravelMode.BUS },
        { _id: 'journey456', travel_mode: TravelMode.BUS }
      ];

      mockJourneyService.prototype.getAllJourneys.mockResolvedValue(mockJourneys);

      const response = await request(app)
        .get('/journeys')
        .query({ travel_mode: 'BUS', route_id: 'route123' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.result).toEqual(mockJourneys);
      expect(mockJourneyService.prototype.getAllJourneys).toHaveBeenCalledWith({
        travel_mode: 'BUS',
        route_id: 'route123'
      });
    });
  });

  describe('PUT /journeys/:id (updateJourney)', () => {
    const updateData = {
      start_point: 'Updated Station A',
      end_point: 'Updated Station B'
    };

    it('should update journey successfully', async () => {
      const mockUpdatedJourney = {
        _id: 'journey123',
        user: 'user123',
        travel_mode: TravelMode.BUS,
        start_point: 'Updated Station A',
        end_point: 'Updated Station B'
      };

      mockJourneyService.prototype.updateJourney.mockResolvedValue(mockUpdatedJourney);

      const response = await request(app)
        .put('/journeys/journey123')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.result).toEqual(mockUpdatedJourney);
      expect(response.body.message).toBe('Journey updated successfully');
      expect(mockJourneyService.prototype.updateJourney).toHaveBeenCalledWith('journey123', 'user123', updateData);
    });

    it('should return 404 when journey not found or unauthorized', async () => {
      mockJourneyService.prototype.updateJourney.mockRejectedValue(
        new AppError('Journey not found or unauthorized', 404)
      );

      const response = await request(app)
        .put('/journeys/nonexistent')
        .send(updateData);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Journey not found or unauthorized');
    });

    it('should handle validation errors', async () => {
      const invalidUpdateData = {
        start_point: 'Same Point',
        end_point: 'Same Point'
      };

      mockJourneyService.prototype.updateJourney.mockRejectedValue(
        new AppError('Start point and end point cannot be the same', 400)
      );

      const response = await request(app)
        .put('/journeys/journey123')
        .send(invalidUpdateData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Start point and end point cannot be the same');
    });
  });

  describe('DELETE /journeys/:id (deleteJourney)', () => {
    it('should delete journey successfully', async () => {
      mockJourneyService.prototype.deleteJourney.mockResolvedValue();

      const response = await request(app).delete('/journeys/journey123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.result).toBeNull();
      expect(response.body.message).toBe('Journey deleted successfully');
      expect(mockJourneyService.prototype.deleteJourney).toHaveBeenCalledWith('journey123', 'user123');
    });

    it('should return 404 when journey not found or unauthorized', async () => {
      mockJourneyService.prototype.deleteJourney.mockRejectedValue(
        new AppError('Journey not found or unauthorized', 404)
      );

      const response = await request(app).delete('/journeys/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Journey not found or unauthorized');
    });
  });

  describe('GET /journeys/route/:travel_mode/:route_id (getJourneysByRoute)', () => {
    it('should get journeys by route successfully', async () => {
      const mockJourneys = [
        {
          _id: 'journey123',
          travel_mode: TravelMode.BUS,
          route_id: 'route123'
        }
      ];

      mockJourneyService.prototype.getJourneysByRoute.mockResolvedValue(mockJourneys);

      const response = await request(app).get('/journeys/route/BUS/route123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.result).toEqual(mockJourneys);
      expect(response.body.message).toBe('Journeys by route retrieved successfully');
      expect(mockJourneyService.prototype.getJourneysByRoute).toHaveBeenCalledWith('BUS', 'route123');
    });

    it('should handle invalid travel mode', async () => {
      mockJourneyService.prototype.getJourneysByRoute.mockRejectedValue(
        new AppError('Invalid travel mode. Must be one of: bus, tube, overground', 400)
      );

      const response = await request(app).get('/journeys/route/INVALID/route123');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid travel mode. Must be one of: bus, tube, overground');
    });
  });

  describe('POST /journeys/similar (findSimilarJourneys)', () => {
    const journeyData = {
      travel_mode: TravelMode.BUS,
      route_id: 'route123',
      start_point: 'Station A',
      end_point: 'Station B'
    };

    it('should find similar journeys successfully', async () => {
      const mockSimilarJourneys = [
        {
          _id: 'journey456',
          travel_mode: TravelMode.BUS,
          route_id: 'route123',
          start_point: 'Station A',
          end_point: 'Station B'
        }
      ];

      mockJourneyService.prototype.findSimilarJourneys.mockResolvedValue(mockSimilarJourneys);

      const response = await request(app)
        .post('/journeys/similar')
        .send(journeyData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.result).toEqual(mockSimilarJourneys);
      expect(response.body.message).toBe('Similar journeys found successfully');
      expect(mockJourneyService.prototype.findSimilarJourneys).toHaveBeenCalledWith('user123', journeyData);
    });
  });

  describe('GET /journeys/stats/user (getJourneyStats)', () => {
    it('should get journey statistics successfully', async () => {
      const mockStats = {
        totalJourneys: 10,
        journeysByMode: {
          bus: 5,
          tube: 3,
          overground: 2
        }
      };

      mockJourneyService.prototype.getJourneyStats.mockResolvedValue(mockStats);

      const response = await request(app).get('/journeys/stats/user');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.result).toEqual(mockStats);
      expect(response.body.message).toBe('Journey statistics retrieved successfully');
      expect(mockJourneyService.prototype.getJourneyStats).toHaveBeenCalledWith('user123');
    });
  });
});