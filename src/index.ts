// src/index.ts
import dotenv from 'dotenv';
dotenv.config(); // Load environment variables first

import express, { Express, Request, Response, NextFunction } from 'express';
import './config/db'; // Initializes DB connection and logs connection status

const app: Express = express();
const PORT: number = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(express.json()); // To parse JSON request bodies

// Routes
app.get('/', (req: Request, res: Response) => {
  res.send('Welcome to the Node.js PostgreSQL TypeScript Starter API!');
});

//app.use('/api/items', itemRoutes);

// Basic Error Handling Middleware
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!', message: err.message });
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
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});