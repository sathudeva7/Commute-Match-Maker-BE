import { IMatchingPreferences, IUser, IUserRegistration, UserRole } from '../types/user.types';
import User from '../models/User';
import UserMatchingPreferences from '../models/UserMatchingPreferences';

export class UserRepository {
  async create(userData: IUserRegistration): Promise<IUser> {
    const user = new User(userData);
    const savedUser = await user.save();
    return savedUser.toObject();
  }

  async findByEmail(email: string): Promise<IUser | null> {
    const user = await User.findOne({ email });
    return user ? user.toObject() : null;
  }

  async findById(id: string): Promise<IUser | null> {
    const user = await User.findById(id);
    return user ? user.toObject() : null;
  }

  async update(id: string, data: Partial<IUser>): Promise<IUser | null> {
    const user = await User.findByIdAndUpdate(id, data, { new: true });
    return user ? user.toObject() : null;
  }



  async delete(id: string): Promise<boolean> {
    const result = await User.findByIdAndDelete(id);
    return !!result;
  }

  async getAllUsers(): Promise<IUser[]> {
    const users = await User.find({}, { password: 0 }); // Exclude password from results
    return users.map(user => user.toObject());
  }

  async updateRole(userId: string, newRole: UserRole): Promise<IUser> {
    const user = await User.findByIdAndUpdate(
      userId,
      { role: newRole },
      { new: true }
    );

    if (!user) {
      throw new Error('User not found');
    }

    return user.toObject();
  }

  // Add missing methods for tests
  async deleteMany(filter: any): Promise<void> {
    await User.deleteMany(filter);
  }

  async findAll(page: number = 1, limit: number = 10, filter: any = {}): Promise<IUser[]> {
    const skip = (page - 1) * limit;
    const users = await User.find(filter, { password: 0 })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    return users.map(user => user.toObject());
  }

  async count(filter: any = {}): Promise<number> {
    return await User.countDocuments(filter);
  }

  async findWithPreferences(userId: string): Promise<IUser | null> {
    const user = await User.findById(userId, { password: 0 });
    return user ? user.toObject() : null;
  }
} 