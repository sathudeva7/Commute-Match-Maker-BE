import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { validateRegistration, validateLogin } from '../middleware/validation';
import { authenticate } from '../middleware/auth';

const router = Router();
const userController = new UserController();

/**
 * @swagger
 * /api/user/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - username
 *               - firstName
 *               - lastName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: securepassword123
 *               username:
 *                 type: string
 *                 example: johndoe
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Doe
 *               phone:
 *                 type: string
 *                 example: "+1234567890"
 *               address:
 *                 type: string
 *                 example: "123 Main St, City, State"
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Validation error or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       500:
 *         description: Internal server error
 */
router.post('/register', validateRegistration, userController.register);

/**
 * @swagger
 * /api/user/login:
 *   post:
 *     summary: Login user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 example: securepassword123
 *     responses:
 *       200:
 *         description: Login successful
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
 *                         token:
 *                           type: string
 *                           description: JWT authentication token
 *                         user:
 *                           $ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       500:
 *         description: Internal server error
 */
router.post('/login', validateLogin, userController.login);

/**
 * @swagger
 * /api/user/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     result:
 *                       allOf:
 *                         - $ref: '#/components/schemas/User'
 *                         - type: object
 *                           properties:
 *                             matching_preferences:
 *                               $ref: '#/components/schemas/UserMatchingPreferences'
 *                               description: User's matching preferences (if they exist)
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       500:
 *         description: Internal server error
 */
router.get('/profile', authenticate, userController.getProfile);

/**
 * @swagger
 * /api/user/update-profile:
 *   put:
 *     summary: Update user profile and/or matching preferences
 *     description: |
 *       This endpoint allows updating both user profile information and matching preferences.
 *       User profile fields are stored in the User collection, while matching preference fields
 *       are stored in the UserMatchingPreferences collection.
 *       
 *       **User Profile Fields** (stored in User collection):
 *       - full_name, phone_number, gender, date_of_birth, bio, profile_image_url
 *       
 *       **Matching Preference Fields** (stored in UserMatchingPreferences collection):
 *       - profession, about_me, interests, languages, preferred_commute_time, preferred_commute_days
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # User Profile Fields
 *               full_name:
 *                 type: string
 *                 minLength: 2
 *                 example: "John Updated Doe"
 *                 description: User's full name
 *               phone_number:
 *                 type: string
 *                 example: "+1234567890"
 *                 description: User's phone number
 *               gender:
 *                 type: string
 *                 enum: [MALE, FEMALE, OTHER]
 *                 example: "MALE"
 *                 description: User's gender
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *                 example: "1990-01-01"
 *                 description: User's date of birth (YYYY-MM-DD format)
 *               bio:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Software engineer with 5 years of experience"
 *                 description: User's bio/description
 *               profile_image_url:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/profile.jpg"
 *                 description: URL to user's profile image
 *               
 *               # Matching Preference Fields
 *               profession:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: "Software Engineer"
 *                 description: User's profession (stored in matching preferences)
 *               about_me:
 *                 type: string
 *                 maxLength: 1000
 *                 example: "I love coding and solving complex problems"
 *                 description: User's self-description (stored in matching preferences)
 *               interests:
 *                 type: array
 *                 items:
 *                   type: string
 *                   minLength: 2
 *                   maxLength: 50
 *                 maxItems: 20
 *                 example: ["Technology", "Music", "Travel"]
 *                 description: User's interests (stored in matching preferences)
 *               languages:
 *                 type: array
 *                 items:
 *                   type: string
 *                   minLength: 2
 *                   maxLength: 30
 *                 maxItems: 10
 *                 example: ["English", "Spanish"]
 *                 description: Languages the user speaks (stored in matching preferences)
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
 *                 description: Preferred commute time window (stored in matching preferences)
 *               preferred_commute_days:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY]
 *                 example: ["MONDAY", "WEDNESDAY", "FRIDAY"]
 *                 description: Preferred commute days (stored in matching preferences)
 *               
 *               # Alternative: Explicit matching preferences object
 *               matching_preferences:
 *                 type: object
 *                 description: |
 *                   Alternative way to provide matching preferences as a single object.
 *                   If provided, this will override individual matching preference fields.
 *                 properties:
 *                   profession:
 *                     type: string
 *                     minLength: 2
 *                     maxLength: 100
 *                   about_me:
 *                     type: string
 *                     maxLength: 1000
 *                   interests:
 *                     type: array
 *                     items:
 *                       type: string
 *                       minLength: 2
 *                       maxLength: 50
 *                     maxItems: 20
 *                   languages:
 *                     type: array
 *                     items:
 *                       type: string
 *                       minLength: 2
 *                       maxLength: 30
 *                     maxItems: 10
 *                   preferred_commute_time:
 *                     type: object
 *                     properties:
 *                       start:
 *                         type: string
 *                         pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
 *                       end:
 *                         type: string
 *                         pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
 *                   preferred_commute_days:
 *                     type: array
 *                     items:
 *                       type: string
 *                       enum: [MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY]
 *     responses:
 *       200:
 *         description: Profile and/or preferences updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     result:
 *                       allOf:
 *                         - $ref: '#/components/schemas/User'
 *                         - type: object
 *                           properties:
 *                             matching_preferences:
 *                               $ref: '#/components/schemas/UserMatchingPreferences'
 *                               description: User's matching preferences (if they exist)
 *                     message:
 *                       type: string
 *                       example: "Profile updated successfully"
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       examples:
 *                         - "Profession must be at least 2 characters long"
 *                         - "Invalid commute time format. Use HH:mm format"
 *                         - "Invalid commute days: INVALID_DAY"
 *                         - "Cannot have more than 20 interests"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.put('/update-profile', authenticate, userController.updateProfile);

export default router; 