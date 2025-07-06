import { Router } from 'express';
import { JourneyController } from '../controllers/journey.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const journeyController = new JourneyController();

// Protected routes (require authentication)
router.post('/', authenticate, journeyController.createJourney);
router.get('/my-journeys', authenticate, journeyController.getUserJourneys);
router.put('/:id', authenticate, journeyController.updateJourney);
router.delete('/:id', authenticate, journeyController.deleteJourney);
router.post('/find-similar', authenticate, journeyController.findSimilarJourneys);
router.get('/stats', authenticate, journeyController.getJourneyStats);

// Public routes (no authentication required)
router.get('/', journeyController.getAllJourneys);
router.get('/:id', journeyController.getJourneyById);
router.get('/route/:travel_mode/:route_id', journeyController.getJourneysByRoute);

export default router; 