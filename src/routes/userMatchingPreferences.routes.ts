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

/**
 * @swagger
 * /api/preferences/semantic-matches:
 *   post:
 *     summary: Find semantic matches for the authenticated user
 *     tags: [Semantic Matching]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Maximum number of matches to return
 *       - in: query
 *         name: minScore
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 1
 *           default: 0.1
 *         description: Minimum similarity score threshold
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               weights:
 *                 type: object
 *                 properties:
 *                   time:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 1
 *                     default: 0.30
 *                     description: Weight for time overlap similarity
 *                   days:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 1
 *                     default: 0.20
 *                     description: Weight for commute days similarity
 *                   lang:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 1
 *                     default: 0.10
 *                     description: Weight for language similarity
 *                   ints:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 1
 *                     default: 0.15
 *                     description: Weight for interests similarity
 *                   sem:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 1
 *                     default: 0.20
 *                     description: Weight for semantic similarity
 *                   prof:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 1
 *                     default: 0.05
 *                     description: Weight for profession match
 *                 description: Custom weights for different similarity factors
 *     responses:
 *       200:
 *         description: Semantic matches found successfully
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
 *                         matches:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               user:
 *                                 $ref: '#/components/schemas/UserMatchingPreferences'
 *                               hybridScore:
 *                                 type: number
 *                                 description: Overall hybrid similarity score
 *                               semSim:
 *                                 type: number
 *                                 description: Semantic similarity score
 *                               timeRatio:
 *                                 type: number
 *                                 description: Time overlap ratio
 *                               dayJac:
 *                                 type: number
 *                                 description: Days Jaccard similarity
 *                               langJac:
 *                                 type: number
 *                                 description: Languages Jaccard similarity
 *                               intsJac:
 *                                 type: number
 *                                 description: Interests Jaccard similarity
 *                               profMatch:
 *                                 type: number
 *                                 description: Profession match (0 or 1)
 *                         count:
 *                           type: integer
 *                           description: Number of matches returned
 *                         query:
 *                           type: object
 *                           description: Query parameters used
 *       400:
 *         description: Bad request - embedding not found
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User preferences not found
 *       500:
 *         description: Internal server error
 */
router.post('/semantic-matches', controller.findSemanticMatches);

/**
 * @swagger
 * /api/preferences/similarity/{targetUserId}:
 *   get:
 *     summary: Get detailed similarity metrics between current user and target user
 *     tags: [Semantic Matching]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: targetUserId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the target user to compare with
 *     responses:
 *       200:
 *         description: Similarity metrics retrieved successfully
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
 *                         semantic:
 *                           type: number
 *                           description: Cosine similarity of embeddings
 *                         timeOverlap:
 *                           type: number
 *                           description: Time overlap in minutes
 *                         daysSimilarity:
 *                           type: number
 *                           description: Jaccard similarity of commute days
 *                         languagesSimilarity:
 *                           type: number
 *                           description: Jaccard similarity of languages
 *                         interestsSimilarity:
 *                           type: number
 *                           description: Jaccard similarity of interests
 *                         professionMatch:
 *                           type: boolean
 *                           description: Whether professions match exactly
 *       400:
 *         description: Bad request - target user ID required
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User preferences not found
 *       500:
 *         description: Internal server error
 */
router.get('/similarity/:targetUserId', controller.getSimilarityMetrics);

/**
 * @swagger
 * /api/preferences/regenerate-embedding:
 *   post:
 *     summary: Regenerate embedding for the authenticated user's preferences
 *     tags: [Embedding Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Embedding regenerated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User preferences not found
 *       500:
 *         description: Internal server error
 */
router.post('/regenerate-embedding', controller.regenerateEmbedding);

/**
 * @swagger
 * /api/preferences/bulk-generate-embeddings:
 *   post:
 *     summary: Bulk generate embeddings for users without embeddings (Admin only)
 *     tags: [Embedding Management]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 200
 *           default: 50
 *         description: Maximum number of users to process
 *     responses:
 *       200:
 *         description: Bulk embedding generation completed
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
 *                         processed:
 *                           type: integer
 *                           description: Number of users processed
 *                         successful:
 *                           type: integer
 *                           description: Number of successful embedding generations
 *                         failed:
 *                           type: integer
 *                           description: Number of failed embedding generations
 *       500:
 *         description: Internal server error
 */
router.post('/bulk-generate-embeddings', controller.bulkGenerateEmbeddings);

/**
 * @swagger
 * /api/preferences/embedding-stats:
 *   get:
 *     summary: Get embedding coverage statistics
 *     tags: [Embedding Management]
 *     responses:
 *       200:
 *         description: Embedding statistics retrieved successfully
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
 *                         totalUsers:
 *                           type: integer
 *                           description: Total number of users with preferences
 *                         usersWithEmbeddings:
 *                           type: integer
 *                           description: Number of users with embeddings
 *                         usersWithoutEmbeddings:
 *                           type: integer
 *                           description: Number of users without embeddings
 *                         embeddingCoverage:
 *                           type: string
 *                           description: Percentage of users with embeddings
 *       500:
 *         description: Internal server error
 */
router.get('/embedding-stats', controller.getEmbeddingStats);

export default router; 