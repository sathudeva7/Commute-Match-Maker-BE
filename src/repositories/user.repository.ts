import { IMatchingPreferences, IUser, IUserRegistration, UserRole } from '../types/user.types';
import User from '../models/User';
import UserMatchingPreferences from '../models/UserMatchingPreferences';

export class UserRepository {
  async create(userData: IUserRegistration): Promise<IUser> {
    const user = new User(userData);
    return await user.save();
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return await User.findOne({ email });
  }

  async findById(id: string): Promise<IUser | null> {
    return await User.findById(id);
  }

  async update(id: string, data: Partial<IUser>): Promise<IUser | null> {
    return await User.findByIdAndUpdate(id, data, { new: true });
  }

  async updateMatchingPreferences(id: string, data: Partial<any>): Promise<IUser | null> {
    return await UserMatchingPreferences.findByIdAndUpdate(id, { matching_preferences: data }, { new: true });
  }

  async delete(id: string): Promise<boolean> {
    const result = await User.findByIdAndDelete(id);
    return !!result;
  }

  async getAllUsers(): Promise<IUser[]> {
    return await User.find({}, { password: 0 }); // Exclude password from results
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

    return user;
  }
} 