// src/index.ts
import dotenv from 'dotenv';
dotenv.config(); // Load environment variables first

import express, { Express, Request, Response, NextFunction } from 'express';
import './config/db'; // Initializes DB connection and logs connection status
import userRoutes from './routes/user.routes';
import adminRoutes from './routes/admin.routes';
import cors from 'cors';
import userMatchingPreferencesRoutes from './routes/userMatchingPreferences.routes';
import { ApiResponse } from './types/response.types';

const app: Express = express();
const PORT: number = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(cors());
app.use(express.json()); // To parse JSON request bodies

// Routes
app.get('/', (req: Request, res: Response) => {
  res.send('Welcome to the Node.js PostgreSQL TypeScript Starter API!');
});

app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/preferences', userMatchingPreferencesRoutes);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  
  const response: ApiResponse = {
    success: false,
    result: null,
    message: err.message || 'Internal server error'
  };
  
  res.status(err.statusCode || 500).json(response);
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Application specific logging, throwing an error, or other logic here
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  // Application specific logging, and forcing shutdown (graceful if possible)
  process.exit(1);
}); 


// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});