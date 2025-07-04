import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';

export const validateRegistration = (req: Request, res: Response, next: NextFunction) => {
  const { full_name, email, password } = req.body;
  const missingFields: string[] = [];

  if (!full_name) missingFields.push('full_name');
  if (!email) missingFields.push('email');
  if (!password) missingFields.push('password');

  if (missingFields.length > 0) {
    throw new AppError(`Missing required fields: ${missingFields.join(', ')}`, 400);
  }

  if (password.length < 6) {
    throw new AppError('Password must be at least 6 characters long', 400);
  }

  if (!email.includes('@')) {
    throw new AppError('Invalid email format', 400);
  }

  next();
};

export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;
  console.log('email',email);
  console.log('password',password);
  const missingFields: string[] = [];

  if (!email) missingFields.push('email');
  if (!password) missingFields.push('password');

  if (missingFields.length > 0) {
    throw new AppError(`Missing required fields: ${missingFields.join(', ')}`, 400);
  }

  next();
}; 