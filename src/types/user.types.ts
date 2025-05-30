import { Request } from 'express';

export enum UserRole {
  USER = 'user',
  MODERATOR = 'moderator',
  ADMIN = 'admin'
}

export interface IMatchingPreferences {
  preferred_commute_time?: {
    start: string;  // Format: "HH:mm"
    end: string;    // Format: "HH:mm"
  };
  profession: string;
  languages: string[];
  interests: string[];
  preferred_commute_days?: string[];  // ["MONDAY", "TUESDAY", etc.]
  preferred_route?: {
    start_location: {
      latitude: number;
      longitude: number;
      address: string;
    };
    end_location: {
      latitude: number;
      longitude: number;
      address: string;
    };
  };
  preferred_commute_times?: string[];
  preferred_vehicle_type?: 'CAR' | 'MOTORCYCLE' | 'BICYCLE' | 'PUBLIC_TRANSPORT';
  preferred_gender?: 'MALE' | 'FEMALE' | 'ANY';
  preferred_age_range?: {
    min: number;
    max: number;
  };
  smoking_preference?: 'SMOKER' | 'NON_SMOKER' | 'ANY';
  music_preference?: 'YES' | 'NO' | 'ANY';
  max_distance?: number;  // in kilometers
}

export interface IUser {
  _id?: string;
  full_name: string;
  email: string;
  password?: string;
  oauth_provider?: string;
  oauth_id?: string;
  profile_image_url?: string;
  createdAt?: Date;
  updatedAt?: Date;
  role: UserRole;
  matching_preferences?: IMatchingPreferences;
}

export interface IUserRegistration {
  full_name: string;
  email: string;
  password: string;
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