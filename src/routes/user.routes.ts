import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { validateRegistration, validateLogin } from '../middleware/validation';

const router = Router();
const userController = new UserController();

router.post('/register', validateRegistration, userController.register);
router.post('/login', validateLogin, userController.login);

export default router; 