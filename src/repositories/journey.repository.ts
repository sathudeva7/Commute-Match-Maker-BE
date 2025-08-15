import { IJourney, IJourneyCreate, IJourneyUpdate, IJourneyQuery } from '../types/journey.types';
import Journey from '../models/Journey';

export class JourneyRepository {
  async create(userId: string, journeyData: IJourneyCreate): Promise<IJourney> {
    const journey = new Journey({
      ...journeyData,
      user: userId
    });
    return await journey.save() as IJourney;
  }

  async findById(id: string): Promise<IJourney | null> {
    return await Journey.findById(id).populate('user', 'full_name email') as IJourney | null;
  }

  async findByUser(userId: string): Promise<IJourney[]> {
    return await Journey.find({ user: userId }).populate('user', 'full_name email') as IJourney[];
  }

  async findAll(query: IJourneyQuery = {}): Promise<IJourney[]> {
    const filter: any = {};
    
    if (query.travel_mode) {
      filter.travel_mode = query.travel_mode;
    }
    
    if (query.route_id) {
      filter.route_id = { $regex: query.route_id, $options: 'i' };
    }
    
    if (query.start_point) {
      filter.start_point = { $regex: query.start_point, $options: 'i' };
    }
    
    if (query.end_point) {
      filter.end_point = { $regex: query.end_point, $options: 'i' };
    }
    
    if (query.user) {
      filter.user = query.user;
    }

    return await Journey.find(filter).populate('user', 'full_name email').sort({ createdAt: -1 }) as IJourney[];
  }

  async update(id: string, userId: string, updateData: IJourneyUpdate): Promise<IJourney | null> {
    return await Journey.findOneAndUpdate(
      { _id: id, user: userId },
      updateData,
      { new: true }
    ).populate('user', 'full_name email') as IJourney | null;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await Journey.findOneAndDelete({ _id: id, user: userId });
    return !!result;
  }

  async deleteByUser(userId: string): Promise<number> {
    const result = await Journey.deleteMany({ user: userId });
    return result.deletedCount || 0;
  }

  async findByRoute(travel_mode: string, route_id: string): Promise<IJourney[]> {
    return await Journey.find({ 
      travel_mode, 
      route_id 
    }).populate('user', 'full_name email') as IJourney[];
  }

  async findSimilarJourneys(userId: string, journey: IJourneyCreate): Promise<IJourney[]> {
    return await Journey.find({
      user: { $ne: userId }, // Exclude current user
      travel_mode: journey.travel_mode,
      $or: [
        { start_point: { $regex: journey.start_point, $options: 'i' } },
        { end_point: { $regex: journey.end_point, $options: 'i' } }
      ]
    }).populate('user', 'full_name email') as IJourney[];
  }

  async count(query: IJourneyQuery = {}): Promise<number> {
    const filter: any = {};
    
    if (query.travel_mode) {
      filter.travel_mode = query.travel_mode;
    }
    
    if (query.user) {
      filter.user = query.user;
    }

    return await Journey.countDocuments(filter);
  }

  // Add missing methods for tests
  async deleteMany(filter: any): Promise<void> {
    await Journey.deleteMany(filter);
  }
} 