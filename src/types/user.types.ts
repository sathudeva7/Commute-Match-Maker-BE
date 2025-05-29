import { Request } from 'express';

export enum UserRole {
  USER = 'user',
  MODERATOR = 'moderator',
  ADMIN = 'admin'
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