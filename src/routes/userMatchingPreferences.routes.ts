import { Router } from 'express';
import { UserMatchingPreferencesController } from '../controllers/userMatchingPreferences.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const controller = new UserMatchingPreferencesController();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/preferences:
 *   post:
 *     summary: Create user matching preferences
 *     tags: [User Preferences]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - profession
 *               - languages
 *               - interests
 *             properties:
 *               # New Core Fields
 *               profession:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: User's profession
 *                 example: "Software Engineer"
 *               about_me:
 *                 type: string
 *                 maxLength: 1000
 *                 description: User's self-description
 *                 example: "I love coding and solving complex problems"
 *               interests:
 *                 type: array
 *                 items:
 *                   type: string
 *                   minLength: 2
 *                   maxLength: 50
 *                 maxItems: 20
 *                 description: User's interests
 *                 example: ["Technology", "Music", "Travel"]
 *               languages:
 *                 type: array
 *                 items:
 *                   type: string
 *                   minLength: 2
 *                   maxLength: 30
 *                 maxItems: 10
 *                 description: Languages the user speaks
 *                 example: ["English", "Spanish"]
 *               preferred_commute_time:
 *                 type: object
 *                 properties:
 *                   start:
 *                     type: string
 *                     pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
 *                     example: "08:00"
 *                     description: Start time in HH:mm format
 *                   end:
 *                     type: string
 *                     pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
 *                     example: "09:00"
 *                     description: End time in HH:mm format
 *                 description: Preferred commute time window
 *               preferred_commute_days:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY]
 *                 description: Preferred commute days
 *                 example: ["MONDAY", "WEDNESDAY", "FRIDAY"]
 *               
 *               # Legacy Fields (for backward compatibility)
 *               maxDistance:
 *                 type: number
 *                 minimum: 0
 *                 description: Maximum distance in kilometers
 *                 example: 10
 *               timeWindow:
 *                 type: number
 *                 minimum: 0
 *                 description: Time window in minutes
 *                 example: 30
 *               priceRange:
 *                 type: object
 *                 properties:
 *                   min:
 *                     type: number
 *                     minimum: 0
 *                     example: 5
 *                   max:
 *                     type: number
 *                     minimum: 0
 *                     example: 50
 *               preferredGender:
 *                 type: string
 *                 enum: [male, female, any]
 *                 default: any
 *               smokingPreference:
 *                 type: boolean
 *                 description: Whether smoking is allowed
 *               musicPreference:
 *                 type: boolean
 *                 description: Whether music is preferred
 *               conversationLevel:
 *                 type: string
 *                 enum: [quiet, moderate, chatty]
 *                 default: moderate
 *     responses:
 *       201:
 *         description: Preferences created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Validation error or preferences already exist
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/', controller.createPreferences);

/**
 * @swagger
 * /api/preferences:
 *   put:
 *     summary: Update user matching preferences
 *     tags: [User Preferences]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # New Core Fields
 *               profession:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: User's profession
 *                 example: "Software Engineer"
 *               about_me:
 *                 type: string
 *                 maxLength: 1000
 *                 description: User's self-description
 *                 example: "I love coding and solving complex problems"
 *               interests:
 *                 type: array
 *                 items:
 *                   type: string
 *                   minLength: 2
 *                   maxLength: 50
 *                 maxItems: 20
 *                 description: User's interests
 *                 example: ["Technology", "Music", "Travel"]
 *               languages:
 *                 type: array
 *                 items:
 *                   type: string
 *                   minLength: 2
 *                   maxLength: 30
 *                 maxItems: 10
 *                 description: Languages the user speaks
 *                 example: ["English", "Spanish"]
 *               preferred_commute_time:
 *                 type: object
 *                 properties:
 *                   start:
 *                     type: string
 *                     pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
 *                     example: "08:00"
 *                     description: Start time in HH:mm format
 *                   end:
 *                     type: string
 *                     pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
 *                     example: "09:00"
 *                     description: End time in HH:mm format
 *                 description: Preferred commute time window
 *               preferred_commute_days:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY]
 *                 description: Preferred commute days
 *                 example: ["MONDAY", "WEDNESDAY", "FRIDAY"]
 *               
 *               # Legacy Fields (for backward compatibility)
 *               maxDistance:
 *                 type: number
 *                 minimum: 0
 *                 description: Maximum distance in kilometers
 *               timeWindow:
 *                 type: number
 *                 minimum: 0
 *                 description: Time window in minutes
 *               priceRange:
 *                 type: object
 *                 properties:
 *                   min:
 *                     type: number
 *                     minimum: 0
 *                   max:
 *                     type: number
 *                     minimum: 0
 *               preferredGender:
 *                 type: string
 *                 enum: [male, female, any]
 *               smokingPreference:
 *                 type: boolean
 *                 description: Whether smoking is allowed
 *               musicPreference:
 *                 type: boolean
 *                 description: Whether music is preferred
 *               conversationLevel:
 *                 type: string
 *                 enum: [quiet, moderate, chatty]
 *     responses:
 *       200:
 *         description: Preferences updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Preferences not found
 *       500:
 *         description: Internal server error
 */
router.put('/', controller.updatePreferences);

/**
 * @swagger
 * /api/preferences:
 *   get:
 *     summary: Get user matching preferences
 *     tags: [User Preferences]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preferences retrieved successfully
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
 *                         # New Core Fields
 *                         profession:
 *                           type: string
 *                           description: User's profession
 *                           example: "Software Engineer"
 *                         about_me:
 *                           type: string
 *                           description: User's self-description
 *                           example: "I love coding and solving complex problems"
 *                         interests:
 *                           type: array
 *                           items:
 *                             type: string
 *                           description: User's interests
 *                           example: ["Technology", "Music", "Travel"]
 *                         languages:
 *                           type: array
 *                           items:
 *                             type: string
 *                           description: Languages the user speaks
 *                           example: ["English", "Spanish"]
 *                         preferred_commute_time:
 *                           type: object
 *                           properties:
 *                             start:
 *                               type: string
 *                               example: "08:00"
 *                             end:
 *                               type: string
 *                               example: "09:00"
 *                           description: Preferred commute time window
 *                         preferred_commute_days:
 *                           type: array
 *                           items:
 *                             type: string
 *                           description: Preferred commute days
 *                           example: ["MONDAY", "WEDNESDAY", "FRIDAY"]
 *                         
 *                         # Legacy Fields (for backward compatibility)
 *                         maxDistance:
 *                           type: number
 *                         timeWindow:
 *                           type: number
 *                         priceRange:
 *                           type: object
 *                           properties:
 *                             min:
 *                               type: number
 *                             max:
 *                               type: number
 *                         preferredGender:
 *                           type: string
 *                         smokingPreference:
 *                           type: boolean
 *                         musicPreference:
 *                           type: boolean
 *                         conversationLevel:
 *                           type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Preferences not found
 *       500:
 *         description: Internal server error
 */
router.get('/', controller.getPreferences);

/**
 * @swagger
 * /api/preferences:
 *   delete:
 *     summary: Delete user matching preferences
 *     tags: [User Preferences]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preferences deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Preferences not found
 *       500:
 *         description: Internal server error
 */
router.delete('/', controller.deletePreferences);

export default router; 