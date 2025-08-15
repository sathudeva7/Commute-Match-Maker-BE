import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate } from '../../../src/middleware/auth';
import { UserRepository } from '../../../src/repositories/user.repository';
import { AppError } from '../../../src/utils/appError';
import { UserRole } from '../../../src/types/user.types';

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../../../src/repositories/user.repository');

const mockJwt = jwt as jest.Mocked<typeof jwt>;
const mockUserRepository = UserRepository as jest.MockedClass<typeof UserRepository>;

describe('Auth Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let mockUserRepo: jest.Mocked<UserRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    req = {
      headers: {}
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    next = jest.fn();
    
    mockUserRepo = new mockUserRepository() as jest.Mocked<UserRepository>;
    // Mock the static constructor
    (UserRepository as any).mockImplementation(() => mockUserRepo);
  });

  describe('authenticateToken', () => {
    it('should authenticate user with valid token', async () => {
      const mockUser = {
        _id: 'user123',
        email: 'john@example.com',
        full_name: 'John Doe',
        role: UserRole.USER
      };

      req.headers!.authorization = 'Bearer valid.jwt.token';
      mockJwt.verify.mockReturnValue({ id: 'user123' } as any);
      mockUserRepo.findById.mockResolvedValue(mockUser);

      await authenticate(req as Request, res as Response, next);

      expect(mockJwt.verify).toHaveBeenCalledWith('valid.jwt.token', process.env.JWT_SECRET);
      expect(mockUserRepo.findById).toHaveBeenCalledWith('user123');
      expect((req as any).user).toEqual(mockUser);
      expect(next).toHaveBeenCalledWith();
    });

    it('should return 401 when no token provided', async () => {
      await authenticate(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = (next as jest.Mock).mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Authentication required');
    });

    it('should return 401 when token format is invalid', async () => {
      req.headers!.authorization = 'InvalidTokenFormat';

      await authenticate(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = (next as jest.Mock).mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Authentication required');
    });

    it('should return 401 when token is invalid', async () => {
      req.headers!.authorization = 'Bearer invalid.jwt.token';
      mockJwt.verify.mockImplementation(() => {
        throw new jwt.JsonWebTokenError('Invalid token');
      });

      await authenticate(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = (next as jest.Mock).mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Invalid token');
    });

    it('should return 401 when user not found', async () => {
      req.headers!.authorization = 'Bearer valid.jwt.token';
      mockJwt.verify.mockReturnValue({ id: 'nonexistent' } as any);
      mockUserRepo.findById.mockResolvedValue(null);

      await authenticate(req as Request, res as Response, next);

      expect(mockUserRepo.findById).toHaveBeenCalledWith('nonexistent');
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = (next as jest.Mock).mock.calls[0][0];
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('User not found');
    });

    it('should return 500 for database errors', async () => {
      req.headers!.authorization = 'Bearer valid.jwt.token';
      mockJwt.verify.mockReturnValue({ id: 'user123' } as any);
      mockUserRepo.findById.mockRejectedValue(new Error('Database error'));

      await authenticate(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      const error = (next as jest.Mock).mock.calls[0][0];
      expect(error.message).toBe('Database error');
    });

    it('should handle token from query parameter', async () => {
      const mockUser = {
        _id: 'user123',
        email: 'john@example.com',
        full_name: 'John Doe',
        role: UserRole.USER
      };

      req.query = { token: 'valid.jwt.token' };
      mockJwt.verify.mockReturnValue({ id: 'user123' } as any);
      mockUserRepo.findById.mockResolvedValue(mockUser);

      await authenticate(req as Request, res as Response, next);

      expect(mockJwt.verify).toHaveBeenCalledWith('valid.jwt.token', process.env.JWT_SECRET);
      expect((req as any).user).toEqual(mockUser);
      expect(next).toHaveBeenCalledWith();
    });
  });
});