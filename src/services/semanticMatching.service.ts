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
      const journeyResults = await this.findSimilarJourneyUsersByUserId(query.userId);
      console.log(journeyResults);
      const candidateUserIds = journeyResults.map(r => r.userId);
      
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
    userId: string
  ): Promise<Array<{ userId: string; full_name?: string; email?: string; journey: IJourney }>> {
    const userJourneys = await this.journeyService.getUserJourneys(userId);
    if (!userJourneys || userJourneys.length === 0) {
      return [];
    }

    const candidateLists = await Promise.all(
      userJourneys.map(j =>
        this.journeyService.getJourneysByRouteAndDeparture(
          j.travel_mode as unknown as string,
          j.route_id,
          j.departure_time
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
    const userLanguages = (userPreferences.matching_preferences.languages || []).map(l => l.toLowerCase());
    const userInterests = (userPreferences.matching_preferences.interests || []).map(i => i.toLowerCase());
    const userProfession = userPreferences.matching_preferences.profession?.toLowerCase().trim() || '';

    return [
      // Stage 1: Vector search (MUST BE FIRST STAGE)
      {
        $vectorSearch: {
          index: "vector_index",
          path: "embedding",
          queryVector: userEmbedding,
          numCandidates: 100,
          limit: 100
        }
      },

      // Stage 2: Filter out current user and documents without embeddings
      {
        $match: {
          _id: { $ne: new mongoose.Types.ObjectId(userPreferences._id) },
          embedding: { $exists: true, $ne: [] }
        }
      },

      // Stage 3a: Restrict to candidate users (from journeys) if provided
      ...(candidateUserIds && candidateUserIds.length > 0 ? [{
        $match: {
          user: { $in: candidateUserIds.map(id => new mongoose.Types.ObjectId(id)) }
        }
      }] : []),

      // Stage 3b: Filter by commute days overlap (only if user specified days)
      ...(days.length > 0 ? [{
        $match: {
          'matching_preferences.preferred_commute_days': { $in: days }
        }
      }] : []),

      // Stage 4: (Removed strict time-overlap filtering to avoid excluding candidates without segments)

      // Stage 5: Calculate similarity scores
      {
        $addFields: {
          semSim: { $ifNull: ["$score", 0] },
          daysInter: {
            $setIntersection: [
              { $map: { input: "$matching_preferences.preferred_commute_days", as: "d", in: { $toUpper: "$$d" } } },
              days
            ]
          },
          daysUnion: {
            $setUnion: [
              { $map: { input: "$matching_preferences.preferred_commute_days", as: "d", in: { $toUpper: "$$d" } } },
              days
            ]
          },
          langInter: {
            $setIntersection: [
              { $map: { input: "$matching_preferences.languages", as: "l", in: { $toLower: "$$l" } } },
              userLanguages
            ]
          },
          langUnion: {
            $setUnion: [
              { $map: { input: "$matching_preferences.languages", as: "l", in: { $toLower: "$$l" } } },
              userLanguages
            ]
          },
          intsInter: {
            $setIntersection: [
              { $map: { input: "$matching_preferences.interests", as: "i", in: { $toLower: "$$i" } } },
              userInterests
            ]
          },
          intsUnion: {
            $setUnion: [
              { $map: { input: "$matching_preferences.interests", as: "i", in: { $toLower: "$$i" } } },
              userInterests
            ]
          },
          profMatch: {
            $cond: [
              {
                $eq: [
                  { $toLower: "$matching_preferences.profession" },
                  userProfession
                ]
              },
              1,
              0
            ]
          }
        }
      },

      // Stage 5: Calculate Jaccard similarities
      {
        $addFields: {
          dayJac: {
            $cond: [
              { $gt: [{ $size: "$daysUnion" }, 0] },
              { $divide: [{ $size: "$daysInter" }, { $size: "$daysUnion" }] },
              0
            ]
          },
          langJac: {
            $cond: [
              { $gt: [{ $size: "$langUnion" }, 0] },
              { $divide: [{ $size: "$langInter" }, { $size: "$langUnion" }] },
              0
            ]
          },
          intsJac: {
            $cond: [
              { $gt: [{ $size: "$intsUnion" }, 0] },
              { $divide: [{ $size: "$intsInter" }, { $size: "$intsUnion" }] },
              0
            ]
          }
        }
      },

      // Stage 6: Calculate time overlap ratio
      {
        $addFields: {
          _timeCalc: {
            $let: {
              vars: { ts: "$commute_segments" },
              in: {
                overlap: {
                  $sum: {
                    $map: {
                      input: "$ts",
                      as: "s",
                      in: {
                        $sum: segments.map(([qs, qe]) => ({
                          $max: [0, {
                            $subtract: [
                              { $min: [{ $arrayElemAt: ["$s", 1] }, qe] },
                              { $max: [{ $arrayElemAt: ["$s", 0] }, qs] }
                            ]
                          }]
                        }))
                      }
                    }
                  }
                },
                durU: segments.reduce((a, [s, e]) => a + (e - s), 0),
                durV: {
                  $sum: {
                    $map: {
                      input: "$ts",
                      as: "s",
                      in: {
                        $subtract: [
                          { $arrayElemAt: ["$s", 1] },
                          { $arrayElemAt: ["$s", 0] }
                        ]
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },

      // Stage 7: Calculate final time ratio
      {
        $addFields: {
          timeRatio: {
            $let: {
              vars: {
                denom: {
                  $max: [
                    { $ifNull: ["$_timeCalc.durU", 1] },
                    { $ifNull: ["$_timeCalc.durV", 1] },
                    1
                  ]
                }
              },
              in: {
                $min: [
                  { $divide: ["$_timeCalc.overlap", "$denom"] },
                  1
                ]
              }
            }
          }
        }
      },

      // Stage 8: Calculate hybrid score
      {
        $addFields: {
          hybridScore: {
            $add: [
              { $multiply: [weights.time, "$timeRatio"] },
              { $multiply: [weights.days, "$dayJac"] },
              { $multiply: [weights.lang, "$langJac"] },
              { $multiply: [weights.ints, "$intsJac"] },
              { $multiply: [weights.sem, "$semSim"] },
              { $multiply: [weights.prof, "$profMatch"] }
            ]
          }
        }
      },

      // Stage 9: Filter by minimum score
      {
        $match: {
          hybridScore: { $gte: minScore }
        }
      },

      // Stage 10: Sort and limit
      {
        $sort: { hybridScore: -1 }
      },
      {
        $limit: limit
      },

      // Stage 11: Lookup user information to get full name
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userInfo"
        }
      },

      // Stage 12: Extract user full name
      {
        $addFields: {
          userFullName: {
            $ifNull: [
              { $arrayElemAt: ["$userInfo.full_name", 0] },
              "Unknown User"
            ]
          }
        }
      },

      // Stage 13: Clean up output
      {
        $project: {
          embedding: 0,
          embedding_text: 0,
          _timeCalc: 0,
          daysInter: 0,
          daysUnion: 0,
          langInter: 0,
          langUnion: 0,
          intsInter: 0,
          intsUnion: 0,
          userInfo: 0
        }
      }
    ];
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