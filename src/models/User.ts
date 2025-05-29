import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  full_name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  oauth_provider: { type: String },
  oauth_id: { type: String },
  profile_image_url: { type: String },
  bio: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});


const User = mongoose.model<any>('User', UserSchema);

export default User;
