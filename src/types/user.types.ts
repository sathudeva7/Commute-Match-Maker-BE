import { Request } from 'express';

export enum UserRole {
  USER = 'user',
  MODERATOR = 'moderator',
  ADMIN = 'admin'
}

export interface IMatchingPreferences {
  profession: string;
  languages: string[];
  about_me: string;
  interests: string[];
  preferred_commute_time?: {
    start: string;  // Format: "HH:mm"
    end: string;    // Format: "HH:mm"
  };
  preferred_commute_days?: string[];  // ["MONDAY", "TUESDAY", etc.]
  preferred_commute_times?: string[];
}

export interface IUser {
  _id?: string;
  full_name: string;
  email: string;
  password?: string;
  date_of_birth?: string;
  phone_number?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  oauth_provider?: string;
  oauth_id?: string;
  profile_image_url?: string;
  bio?: string;
  createdAt?: Date;
  updatedAt?: Date;
  role: UserRole;
  matching_preferences?: IMatchingPreferences;
}

export interface IUserRegistration {
  full_name: string;
  email: string;
  password: string;
  date_of_birth?: string;
  phone_number?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  role?: UserRole; // Optional, defaults to USER
}

export interface IUserLogin {
  email: string;
  password: string;
}

export interface IAuthResponse {
  user: IUser;
  token: string;
}

// Extend Express Request type to include user
export interface AuthenticatedRequest extends Request {
  user?: IUser;
} 