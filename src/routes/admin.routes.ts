import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth';
import { authorizeRole } from '../middleware/auth';
import { UserRole } from '../types/user.types';

const router = Router();
const adminController = new AdminController();

// Get all users (admin only)
router.get(
  '/users',
  authenticate,
  authorizeRole([UserRole.ADMIN]),
  adminController.getAllUsers
);

// Update user role (admin only)
router.patch(
  '/users/:userId/role',
  authenticate,
  authorizeRole([UserRole.ADMIN]),
  adminController.updateUserRole
);

export default router; 