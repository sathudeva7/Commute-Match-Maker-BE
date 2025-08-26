import { SemanticMatchingService } from '../../../src/services/semanticMatching.service';
import { UserMatchingPreferencesRepository } from '../../../src/repositories/userMatchingPreferences.repository';
import { EmbeddingService } from '../../../src/services/embedding.service';
import { ISemanticMatchQuery, ISemanticMatchResult } from '../../../src/types/user.types';

// Mock the dependencies
jest.mock('../../../src/repositories/userMatchingPreferences.repository');
jest.mock('../../../src/services/embedding.service');

describe('SemanticMatchingService', () => {
  let service: SemanticMatchingService;
  let mockRepository: jest.Mocked<UserMatchingPreferencesRepository>;
  let mockEmbeddingService: jest.Mocked<EmbeddingService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRepository = new UserMatchingPreferencesRepository() as jest.Mocked<UserMatchingPreferencesRepository>;
    mockEmbeddingService = new EmbeddingService() as jest.Mocked<EmbeddingService>;
    
    service = new SemanticMatchingService();
  });

  describe('findSemanticMatches', () => {
    it('should return results with userFullName field', async () => {
      // Mock data
      const mockUserPrefs = {
        _id: 'user1',
        user: 'user1',
        matching_preferences: {
          profession: 'Engineer',
          languages: ['English'],
          about_me: 'Test user',
          interests: ['Technology']
        },
        embedding: [0.1, 0.2, 0.3],
        commute_segments: [[9, 17]]
      };

      const mockQuery: ISemanticMatchQuery = {
        userId: 'user1',
        limit: 10,
        minScore: 0.1
      };

      // Mock the repository method
      mockRepository.findByUserId = jest.fn().resolves(mockUserPrefs);

      // Mock the aggregation pipeline result
      const mockAggregationResult = [
        {
          _id: 'user2',
          user: 'user2',
          matching_preferences: {
            profession: 'Developer',
            languages: ['English'],
            about_me: 'Another test user',
            interests: ['Technology']
          },
          hybridScore: 0.85,
          semSim: 0.8,
          timeRatio: 0.9,
          dayJac: 0.7,
          langJac: 0.8,
          intsJac: 0.9,
          profMatch: 0.5,
          userFullName: 'John Doe'
        }
      ];

      // Mock the aggregate method on the model
      const mockAggregate = jest.fn().mockReturnValue({
        exec: jest.fn().resolves(mockAggregationResult)
      });

      // Mock the UserMatchingPreferences model
      jest.doMock('../../../src/models/UserMatchingPreferences', () => ({
        aggregate: mockAggregate
      }));

      // Test the service
      const results = await service.findSemanticMatches(mockQuery);

      // Verify the results include userFullName
      expect(results).toHaveLength(1);
      expect(results[0]).toHaveProperty('userFullName');
      expect(results[0].userFullName).toBe('John Doe');
      expect(results[0]).toHaveProperty('hybridScore');
      expect(results[0]).toHaveProperty('user');
    });

    it('should handle missing userFullName gracefully', async () => {
      // Mock data
      const mockUserPrefs = {
        _id: 'user1',
        user: 'user1',
        matching_preferences: {
          profession: 'Engineer',
          languages: ['English'],
          about_me: 'Test user',
          interests: ['Technology']
        },
        embedding: [0.1, 0.2, 0.3],
        commute_segments: [[9, 17]]
      };

      const mockQuery: ISemanticMatchQuery = {
        userId: 'user1',
        limit: 10,
        minScore: 0.1
      };

      // Mock the repository method
      mockRepository.findByUserId = jest.fn().resolves(mockUserPrefs);

      // Mock the aggregation pipeline result without userFullName
      const mockAggregationResult = [
        {
          _id: 'user2',
          user: 'user2',
          matching_preferences: {
            profession: 'Developer',
            languages: ['English'],
            about_me: 'Another test user',
            interests: ['Technology']
          },
          hybridScore: 0.85,
          semSim: 0.8,
          timeRatio: 0.9,
          dayJac: 0.7,
          langJac: 0.8,
          intsJac: 0.9,
          profMatch: 0.5
          // userFullName is missing
        }
      ];

      // Mock the aggregate method on the model
      const mockAggregate = jest.fn().mockReturnValue({
        exec: jest.fn().resolves(mockAggregationResult)
      });

      // Mock the UserMatchingPreferences model
      jest.doMock('../../../src/models/UserMatchingPreferences', () => ({
        aggregate: mockAggregate
      }));

      // Test the service
      const results = await service.findSemanticMatches(mockQuery);

      // Verify the results include userFullName with fallback
      expect(results).toHaveLength(1);
      expect(results[0]).toHaveProperty('userFullName');
      expect(results[0].userFullName).toBe('Unknown User');
    });
  });
});
