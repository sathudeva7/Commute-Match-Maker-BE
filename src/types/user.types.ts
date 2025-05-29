import { Request } from 'express';

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
}

export interface IUserRegistration {
  full_name: string;
  email: string;
  password: string;
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