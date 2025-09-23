import mongoose from 'mongoose';
import { ISemanticMatchQuery, ISemanticMatchResult, IUserMatchingPreferences } from '../types/user.types';
import { IJourney } from '../types/journey.types';
import { JourneyService } from './journey.service';
import { UserMatchingPreferencesRepository } from '../repositories/userMatchingPreferences.repository';
import { EmbeddingService } from './embedding.service';
import { AppError } from '../utils/appError';
import UserMatchingPreferences from '../models/UserMatchingPreferences';

export class SemanticMatchingService {
  private repository: UserMatchingPreferencesRepository;
  private embeddingService: EmbeddingService;
  private journeyService: JourneyService;

  constructor() {
    this.repository = new UserMatchingPreferencesRepository();
    this.embeddingService = new EmbeddingService();
    this.journeyService = new JourneyService();
  }

  async findSemanticMatches(query: ISemanticMatchQuery): Promise<ISemanticMatchResult[]> {
    try {
      const journeyResults = await this.findSimilarJourneyUsersByUserId(query.userId, query.departure_time, query.route_id, query.travel_mode);
      console.log(journeyResults);
      const candidateUserIds = journeyResults
        .map(r => r.userId)
        .filter(id => id != query.userId);
      console.log("candidateUserIds",candidateUserIds);

      
      const userPreferences = await this.repository.findByUserId(query.userId);
      if (!userPreferences) {
        throw new AppError('User preferences not found', 404);
      }

      if (!userPreferences.embedding || userPreferences.embedding.length === 0) {
        throw new AppError('User embedding not found. Please update preferences first.', 400);
      }

      const weights = query.weights || {
        time: 0.30,
        days: 0.20,
        lang: 0.10,
        ints: 0.15,
        sem: 0.20,
        prof: 0.05
      };

      const limit = query.limit || 50;
      const minScore = query.minScore || 0.1;

      const days = userPreferences.matching_preferences?.preferred_commute_days?.map(d => d.toUpperCase()) || [];
      const segments = userPreferences.commute_segments || [];

      if (!candidateUserIds || candidateUserIds.length === 0) {
        return [];
      }

      const pipeline = this.buildAggregationPipeline(
        userPreferences as unknown as IUserMatchingPreferences,
        weights,
        days,
        segments as unknown as number[][],
        limit,
        minScore,
        candidateUserIds
      );

      const results = await UserMatchingPreferences.aggregate(pipeline);
     console.log("results",results);
      return results.map((result: any) => ({
        user: result as IUserMatchingPreferences,
        userFullName: result.userFullName || 'Unknown User',
        hybridScore: result.hybridScore,
        semSim: result.semSim,
        timeRatio: result.timeRatio,
        dayJac: result.dayJac,
        langJac: result.langJac,
        intsJac: result.intsJac,
        profMatch: result.profMatch
      }));
    } catch (error) {
      console.error('Error finding semantic matches:', error);
      throw error;
    }
  }

  async findUsersByJourney(
    travel_mode: string,
    route_id: string,
    departure_time: string
  ): Promise<{ userId: string; full_name?: string; email?: string }[]> {
    const journeys = await this.journeyService.getJourneysByRouteAndDeparture(
      travel_mode,
      route_id,
      departure_time
    );

    return journeys
      .filter(j => !!j.user)
      .map(j => {
        const user: any = j.user;
        return {
          userId: typeof user === 'object' && user._id ? String(user._id) : String(user),
          full_name: user && user.full_name ? user.full_name : undefined,
          email: user && user.email ? user.email : undefined
        };
      });
  }

  async findSimilarJourneyUsersByUserId(
    userId: string,
    departure_time?: string,
    route_id?: string,
    travel_mode?: string
  ): Promise<Array<{ userId: string; full_name?: string; email?: string; journey: IJourney }>> {
    const userJourneys = await this.journeyService.getUserJourneys(userId);
    if (!userJourneys || userJourneys.length === 0) {
      return [];
    }

    const candidateLists = await Promise.all(
      userJourneys.map(j =>
        this.journeyService.getJourneysByRouteAndDeparture(
          travel_mode as unknown as string,
          route_id as string,
          departure_time || j.departure_time
        )
      )
    );

    const seenUserIds = new Set<string>();
    const results: Array<{ userId: string; full_name?: string; email?: string; journey: IJourney }> = [];

    for (let i = 0; i < userJourneys.length; i++) {
      const baseJourney = userJourneys[i];
      const candidates = candidateLists[i] || [];
      for (const cand of candidates) {
        const candUser: any = cand.user;
        const candUserId = typeof candUser === 'object' && candUser?._id ? String(candUser._id) : String(cand.user);
        if (candUserId === userId) continue;
        if (seenUserIds.has(candUserId)) continue;
        seenUserIds.add(candUserId);
        results.push({
          userId: candUserId,
          full_name: candUser && candUser.full_name ? candUser.full_name : undefined,
          email: candUser && candUser.email ? candUser.email : undefined,
          journey: cand as IJourney
        });
      }
    }

    return results;
  }

  private buildAggregationPipeline(
    userPreferences: IUserMatchingPreferences,
    weights: any,
    days: string[],
    segments: number[][],
    limit: number,
    minScore: number,
    candidateUserIds?: string[]
  ): any[] {
    const userEmbedding = userPreferences.embedding;
    const filter = candidateUserIds && candidateUserIds.length > 0
      ? { user: { $in: candidateUserIds.map(id => new mongoose.Types.ObjectId(id)) } }
      : undefined;
    console.log("filter",filter);

    const vectorStage: any = {
      $vectorSearch: {
        index: "vector_index",
        path: "embedding",
        queryVector: userEmbedding,
        numCandidates: 100,
        limit: limit
      }
    };

    if (filter) {
      vectorStage.$vectorSearch.filter = filter;
    }
    console.log("vectorStage",vectorStage);

    // Lookup user to get display name
    const lookupUserStage: any = {
      $lookup: {
        from: 'users',
        let: { userId: '$user' },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$userId'] } } },
          { $project: { _id: 0, full_name: 1 } }
        ],
        as: 'userDoc'
      }
    };

    const addUserNameStage: any = {
      $addFields: {
        userFullName: { $ifNull: [{ $arrayElemAt: ['$userDoc.full_name', 0] }, null] }
      }
    };

    // Project vector search score and a human-friendly percentage
    const projectStage: any = {
      $project: {
        user: 1,
        matching_preferences: 1,
        embedding_text: 1,
        commute_segments: 1,
        createdAt: 1,
        updatedAt: 1,
        userFullName: 1,
        // semSim aligns with existing mapping usage
        semSim: { $meta: "vectorSearchScore" },
        matchPercent: { $round: [{ $multiply: [{ $meta: "vectorSearchScore" }, 100] }, 2] }
      }
    };

    return [vectorStage, lookupUserStage, addUserNameStage, projectStage];
  }

  async getSimilarityMetrics(userId1: string, userId2: string): Promise<{
    semantic: number;
    timeOverlap: number;
    daysSimilarity: number;
    languagesSimilarity: number;
    interestsSimilarity: number;
    professionMatch: boolean;
  }> {
    const [user1Prefs, user2Prefs] = await Promise.all([
      this.repository.findByUserId(userId1),
      this.repository.findByUserId(userId2)
    ]);

    if (!user1Prefs || !user2Prefs) {
      throw new AppError('User preferences not found', 404);
    }

    const semantic = this.calculateCosineSimilarity(
      user1Prefs.embedding || [],
      user2Prefs.embedding || []
    );

    const timeOverlap = this.embeddingService.calculateTimeOverlap(
      user1Prefs.commute_segments as unknown as number[][] || [],
      user2Prefs.commute_segments as unknown as number[][] || []
    );

    const daysSimilarity = this.embeddingService.calculateJaccardSimilarity(
      user1Prefs.matching_preferences?.preferred_commute_days || [],
      user2Prefs.matching_preferences?.preferred_commute_days || []
    );

    const languagesSimilarity = this.embeddingService.calculateJaccardSimilarity(
      user1Prefs.matching_preferences?.languages || [],
      user2Prefs.matching_preferences?.languages || []
    );

    const interestsSimilarity = this.embeddingService.calculateJaccardSimilarity(
      user1Prefs.matching_preferences?.interests || [],
      user2Prefs.matching_preferences?.interests || []
    );

    const professionMatch = this.embeddingService.normalizeProfession(
      user1Prefs.matching_preferences?.profession || ''
    ) === this.embeddingService.normalizeProfession(
      user2Prefs.matching_preferences?.profession || ''
    );

    return {
      semantic,
      timeOverlap,
      daysSimilarity,
      languagesSimilarity,
      interestsSimilarity,
      professionMatch
    };
  }

  private calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length || vec1.length === 0) {
      return 0;
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    return magnitude > 0 ? dotProduct / magnitude : 0;
  }
}