import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Commute Match Maker API',
      version: '1.0.0',
      description: 'API documentation for the Commute Match Maker backend service',
      contact: {
        name: 'API Support',
        email: 'support@commutematacher.com'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://your-production-url.com/api' 
          : `http://localhost:${process.env.PORT || 3000}/api`,
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Indicates if the request was successful'
            },
            result: {
              type: 'object',
              description: 'The response data'
            },
            message: {
              type: 'string',
              description: 'Response message'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'User ID'
            },
            full_name: {
              type: 'string',
              description: 'User full name'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            date_of_birth: {
              type: 'string',
              format: 'date',
              description: 'User date of birth (YYYY-MM-DD format)'
            },
            phone_number: {
              type: 'string',
              description: 'User phone number'
            },
            gender: {
              type: 'string',
              enum: ['MALE', 'FEMALE', 'OTHER'],
              description: 'User gender'
            },
            role: {
              type: 'string',
              enum: ['user', 'moderator', 'admin'],
              description: 'User role'
            },
            oauth_provider: {
              type: 'string',
              enum: ['google', 'facebook', null],
              description: 'OAuth provider if using social login'
            },
            oauth_id: {
              type: 'string',
              description: 'OAuth ID from provider'
            },
            profile_image_url: {
              type: 'string',
              format: 'uri',
              description: 'Profile image URL'
            },
            bio: {
              type: 'string',
              description: 'User bio/description'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation date'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update date'
            }
          }
        },
        UserMatchingPreferences: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Preferences ID'
            },
            user: {
              type: 'string',
              description: 'User ID reference'
            },
            matching_preferences: {
              type: 'object',
              properties: {
                profession: {
                  type: 'string',
                  minLength: 2,
                  maxLength: 100,
                  description: 'User profession'
                },
                about_me: {
                  type: 'string',
                  maxLength: 1000,
                  description: 'User self-description'
                },
                interests: {
                  type: 'array',
                  items: {
                    type: 'string',
                    minLength: 2,
                    maxLength: 50
                  },
                  maxItems: 20,
                  description: 'User interests'
                },
                languages: {
                  type: 'array',
                  items: {
                    type: 'string',
                    minLength: 2,
                    maxLength: 30
                  },
                  maxItems: 10,
                  description: 'Languages user speaks'
                },
                preferred_commute_time: {
                  type: 'object',
                  properties: {
                    start: {
                      type: 'string',
                      pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$',
                      description: 'Start time in HH:mm format'
                    },
                    end: {
                      type: 'string',
                      pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$',
                      description: 'End time in HH:mm format'
                    }
                  },
                  description: 'Preferred commute time window'
                },
                preferred_commute_days: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
                  },
                  description: 'Preferred commute days'
                },
                preferred_commute_times: {
                  type: 'array',
                  items: {
                    type: 'string'
                  },
                  description: 'Preferred commute time periods (e.g., morning, evening)'
                },


              }
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Preferences creation date'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update date'
            }
          }
        },
        Journey: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Journey ID'
            },
            userId: {
              type: 'string',
              description: 'User ID who created the journey'
            },
            startLocation: {
              type: 'object',
              properties: {
                address: { type: 'string' },
                latitude: { type: 'number' },
                longitude: { type: 'number' }
              }
            },
            endLocation: {
              type: 'object',
              properties: {
                address: { type: 'string' },
                latitude: { type: 'number' },
                longitude: { type: 'number' }
              }
            },
            departureTime: {
              type: 'string',
              format: 'date-time',
              description: 'Departure time'
            },
            availableSeats: {
              type: 'number',
              description: 'Available seats'
            },
            pricePerSeat: {
              type: 'number',
              description: 'Price per seat'
            },
            description: {
              type: 'string',
              description: 'Journey description'
            },
            status: {
              type: 'string',
              enum: ['active', 'completed', 'cancelled'],
              description: 'Journey status'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Journey creation date'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts']
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Express): void => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Commute Match Maker API Documentation'
  }));
};

export { specs };