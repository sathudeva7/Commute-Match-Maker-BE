import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { validateRegistration, validateLogin } from '../middleware/validation';
import { authenticate } from '../middleware/auth';

const router = Router();
const userController = new UserController();

router.post('/register', validateRegistration, userController.register);
router.post('/login', validateLogin, userController.login);
router.put('/update-profile', authenticate, userController.updateProfile);

export default router; 