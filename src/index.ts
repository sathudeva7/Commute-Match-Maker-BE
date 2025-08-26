// src/index.ts
import dotenv from 'dotenv';
dotenv.config(); // Load environment variables first

import express, { Express, Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import './config/db'; // Initializes DB connection and logs connection status
import userRoutes from './routes/user.routes';
import adminRoutes from './routes/admin.routes';
import journeyRoutes from './routes/journey.routes';
import chatRoutes from './routes/chat.routes';
import cors from 'cors';
import userMatchingPreferencesRoutes from './routes/userMatchingPreferences.routes';
import { ApiResponse } from './types/response.types';
import { SocketService } from './services/socket.service';
import { setupSwagger } from './config/swagger';

const app: Express = express();
const server = createServer(app);
const PORT: number = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(cors());
app.use(express.json()); // To parse JSON request bodies

// Setup Swagger documentation
setupSwagger(app);

// Routes
app.get('/', (req: Request, res: Response) => {
  res.send('Welcome to the Node.js PostgreSQL TypeScript Starter API!');
});

app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/journey', journeyRoutes);
app.use('/api/preferences', userMatchingPreferencesRoutes);
app.use('/api/chat', chatRoutes);

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


// Initialize Socket.IO
const socketService = new SocketService(server);

// Start the server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`WebSocket server is ready for real-time chat`);
});