// src/config/db.ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';
import UserMatchingPreferences from '../models/UserMatchingPreferences';
import Chat from '../models/Chat';
import Message from '../models/Message';

dotenv.config(); // To load .env variables

// Ensure mongoose is installed: npm install mongoose

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/commute-match-maker';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB database!');
  })
  .catch((err: Error) => {
    console.error('Error connecting to MongoDB:', err);
    // Potentially exit the application if DB connection is critical for startup
    // process.exit(1);
  });

// Example mongoose model (you can replace or add more models as needed)
const ExampleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Example = mongoose.model('Example', ExampleSchema);

export default {
  mongoose,
  Example,
  User,
  UserMatchingPreferences,
  Chat,
  Message
};