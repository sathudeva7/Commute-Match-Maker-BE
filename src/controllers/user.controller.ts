import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { IUserRegistration, IUserLogin } from '../types/user.types';
import { AppError } from '../utils/appError';
import { ApiResponse } from '../types/response.types';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const userData: IUserRegistration = req.body;
      const result = await this.userService.register(userData);
      
      const response: ApiResponse = {
        success: true,
        result,
        message: 'User registered successfully'
      };
      
      res.status(201).json(response);
    } catch (error) {
      if (error instanceof AppError) {
        const response: ApiResponse = {
          success: false,
          result: null,
          message: error.message
        };
        res.status(error.statusCode).json(response);
      } else {
        const response: ApiResponse = {
          success: false,
          result: null,
          message: 'Internal server error'
        };
        res.status(500).json(response);
      }
    }
  };

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const loginData: IUserLogin = req.body;
      const result = await this.userService.login(loginData);
      
      const response: ApiResponse = {
        success: true,
        result,
        message: 'Login successful'
      };
      
      res.status(200).json(response);
    } catch (error) {
      if (error instanceof AppError) {
        const response: ApiResponse = {
          success: false,
          result: null,
          message: error.message
        };
        res.status(error.statusCode).json(response);
      } else {
        const response: ApiResponse = {
          success: false,
          result: null,
          message: 'Internal server error'
        };
        res.status(500).json(response);
      }
    }
  };
} 