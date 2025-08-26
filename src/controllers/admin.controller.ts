import { Request, Response } from 'express';
import { UserRepository } from '../repositories/user.repository';
import { UserRole } from '../types/user.types';
import { AppError } from '../utils/appError';
import { ApiResponse } from '../types/response.types';

export class AdminController {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  getAllUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const users = await this.userRepository.getAllUsers();
      
      const response: ApiResponse = {
        success: true,
        result: users,
        message: 'Users retrieved successfully'
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

  updateUserRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!Object.values(UserRole).includes(role)) {
        throw new AppError('Invalid role specified', 400);
      }

      const updatedUser = await this.userRepository.updateRole(userId, role);
      
      const response: ApiResponse = {
        success: true,
        result: updatedUser,
        message: 'User role updated successfully'
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