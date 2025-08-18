import OpenAI from 'openai';
import { IMatchingPreferences } from '../types/user.types';

export class EmbeddingService {
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  buildEmbeddingText(preferences: IMatchingPreferences): string {
    const profession = preferences.profession || '';
    const aboutMe = preferences.about_me || '';
    const interests = preferences.interests?.join(', ') || '';
    const languages = preferences.languages?.join(', ') || '';

    return `Profession: ${profession}
About: ${aboutMe}
Interests: ${interests}
Languages: ${languages}`.trim();
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        encoding_format: 'float',
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  async generatePreferencesEmbedding(preferences: IMatchingPreferences): Promise<{
    embeddingText: string;
    embedding: number[];
  }> {
    const embeddingText = this.buildEmbeddingText(preferences);
    const embedding = await this.generateEmbedding(embeddingText);
    
    return {
      embeddingText,
      embedding,
    };
  }

  toMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return (hours * 60 + minutes) % 1440;
  }

  calculateCommuteSegments(start: string, end: string): number[][] {
    const startMinutes = this.toMinutes(start);
    const endMinutes = this.toMinutes(end);

    if (startMinutes <= endMinutes) {
      return [[startMinutes, endMinutes]];
    } else {
      return [[startMinutes, 1440], [0, endMinutes]];
    }
  }

  calculateTimeOverlap(segments1: number[][], segments2: number[][]): number {
    let totalOverlap = 0;

    for (const seg1 of segments1) {
      for (const seg2 of segments2) {
        const overlapStart = Math.max(seg1[0], seg2[0]);
        const overlapEnd = Math.min(seg1[1], seg2[1]);
        
        if (overlapStart < overlapEnd) {
          totalOverlap += overlapEnd - overlapStart;
        }
      }
    }

    return totalOverlap;
  }

  calculateJaccardSimilarity(arr1: string[], arr2: string[]): number {
    const set1 = new Set(arr1.map(item => item.toLowerCase()));
    const set2 = new Set(arr2.map(item => item.toLowerCase()));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  normalizeProfession(profession: string): string {
    return profession.toLowerCase().trim();
  }
}