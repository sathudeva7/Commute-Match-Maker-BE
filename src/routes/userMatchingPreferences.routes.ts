import { Router } from 'express';
import { UserMatchingPreferencesController } from '../controllers/userMatchingPreferences.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const controller = new UserMatchingPreferencesController();

// All routes require authentication
//router.use(authenticate);

// Create matching preferences
router.post('/', controller.createPreferences);

// Update matching preferences
router.put('/', controller.updatePreferences);

// Get matching preferences
router.get('/', controller.getPreferences);

// Delete matching preferences
router.delete('/', controller.deletePreferences);

export default router; 