import mongoose, { Schema, Document } from 'mongoose';
import { IUser, UserRole } from '../types/user.types';


const userSchema = new Schema({
  full_name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  date_of_birth: {
    type: String,
    trim: true
  },
  phone_number: {
    type: String,
    trim: true
  },
  gender: {
    type: String,
    enum: ['MALE', 'FEMALE', 'OTHER'],
    trim: true
  },
  role: {
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.USER
  },
  oauth_provider: {
    type: String,
    enum: ['google', 'facebook', null],
    default: null
  },
  oauth_id: {
    type: String,
    default: null
  },
  profile_image_url: {
    type: String,
    default: null
  },
  bio: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

const User = mongoose.model<IUser>('User', userSchema);

export default User;
