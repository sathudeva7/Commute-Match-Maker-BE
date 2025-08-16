import { Router } from 'express';
import { JourneyController } from '../controllers/journey.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const journeyController = new JourneyController();

/**
 * @swagger
 * /api/journey:
 *   post:
 *     summary: Create a new journey
 *     tags: [Journeys]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - startLocation
 *               - endLocation
 *               - departureTime
 *               - availableSeats
 *               - pricePerSeat
 *             properties:
 *               startLocation:
 *                 type: object
 *                 properties:
 *                   address:
 *                     type: string
 *                     example: "123 Start St, City, State"
 *                   latitude:
 *                     type: number
 *                     example: 40.7128
 *                   longitude:
 *                     type: number
 *                     example: -74.0060
 *               endLocation:
 *                 type: object
 *                 properties:
 *                   address:
 *                     type: string
 *                     example: "456 End Ave, City, State"
 *                   latitude:
 *                     type: number
 *                     example: 40.7589
 *                   longitude:
 *                     type: number
 *                     example: -73.9851
 *               departureTime:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-01-15T08:00:00Z"
 *               availableSeats:
 *                 type: integer
 *                 minimum: 1
 *                 example: 3
 *               pricePerSeat:
 *                 type: number
 *                 minimum: 0
 *                 example: 15.50
 *               description:
 *                 type: string
 *                 example: "Daily commute to downtown, comfortable car with AC"
 *     responses:
 *       201:
 *         description: Journey created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     result:
 *                       $ref: '#/components/schemas/Journey'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/', authenticate, journeyController.createJourney);

/**
 * @swagger
 * /api/journey/my-journeys:
 *   get:
 *     summary: Get current user's journeys
 *     tags: [Journeys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, completed, cancelled]
 *         description: Filter journeys by status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: User journeys retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     result:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Journey'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/my-journeys', authenticate, journeyController.getUserJourneys);

/**
 * @swagger
 * /api/journey/{id}:
 *   put:
 *     summary: Update a journey
 *     tags: [Journeys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Journey ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startLocation:
 *                 type: object
 *                 properties:
 *                   address:
 *                     type: string
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *               endLocation:
 *                 type: object
 *                 properties:
 *                   address:
 *                     type: string
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *               departureTime:
 *                 type: string
 *                 format: date-time
 *               availableSeats:
 *                 type: integer
 *                 minimum: 1
 *               pricePerSeat:
 *                 type: number
 *                 minimum: 0
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, completed, cancelled]
 *     responses:
 *       200:
 *         description: Journey updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     result:
 *                       $ref: '#/components/schemas/Journey'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Can only update own journeys
 *       404:
 *         description: Journey not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', authenticate, journeyController.updateJourney);

/**
 * @swagger
 * /api/journey/{id}:
 *   delete:
 *     summary: Delete a journey
 *     tags: [Journeys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Journey ID
 *     responses:
 *       200:
 *         description: Journey deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Can only delete own journeys
 *       404:
 *         description: Journey not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', authenticate, journeyController.deleteJourney);

/**
 * @swagger
 * /api/journey/find-similar:
 *   post:
 *     summary: Find similar journeys based on location and time
 *     tags: [Journeys]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - startLocation
 *               - endLocation
 *               - departureTime
 *             properties:
 *               startLocation:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *               endLocation:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *               departureTime:
 *                 type: string
 *                 format: date-time
 *               radiusKm:
 *                 type: number
 *                 default: 5
 *                 description: Search radius in kilometers
 *               timeWindowHours:
 *                 type: number
 *                 default: 2
 *                 description: Time window in hours
 *     responses:
 *       200:
 *         description: Similar journeys found
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     result:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Journey'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/find-similar', authenticate, journeyController.findSimilarJourneys);

/**
 * @swagger
 * /api/journey/stats:
 *   get:
 *     summary: Get user's journey statistics
 *     tags: [Journeys]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Journey statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     result:
 *                       type: object
 *                       properties:
 *                         totalJourneys:
 *                           type: integer
 *                         activeJourneys:
 *                           type: integer
 *                         completedJourneys:
 *                           type: integer
 *                         totalEarnings:
 *                           type: number
 *                         totalSaved:
 *                           type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/stats', authenticate, journeyController.getJourneyStats);

/**
 * @swagger
 * /api/journey:
 *   get:
 *     summary: Get all public journeys
 *     tags: [Journeys]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, completed, cancelled]
 *         description: Filter journeys by status
 *     responses:
 *       200:
 *         description: Journeys retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     result:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Journey'
 *       500:
 *         description: Internal server error
 */
router.get('/', journeyController.getAllJourneys);

/**
 * @swagger
 * /api/journey/{id}:
 *   get:
 *     summary: Get journey by ID
 *     tags: [Journeys]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Journey ID
 *     responses:
 *       200:
 *         description: Journey retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     result:
 *                       $ref: '#/components/schemas/Journey'
 *       404:
 *         description: Journey not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       500:
 *         description: Internal server error
 */
router.get('/:id', journeyController.getJourneyById);

/**
 * @swagger
 * /api/journey/route/{travel_mode}/{route_id}:
 *   get:
 *     summary: Get journeys by travel mode and route ID
 *     tags: [Journeys]
 *     parameters:
 *       - in: path
 *         name: travel_mode
 *         required: true
 *         schema:
 *           type: string
 *           enum: [car, bus, train, bike, walk]
 *         description: Travel mode
 *       - in: path
 *         name: route_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Route identifier
 *     responses:
 *       200:
 *         description: Journeys retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     result:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Journey'
 *       500:
 *         description: Internal server error
 */
router.get('/route/:travel_mode/:route_id', journeyController.getJourneysByRoute);

export default router; 