import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  full_name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  oauth_provider: { type: String },
  oauth_id: { type: String },
  profile_image_url: { type: String },
  bio: { type: String },
  profession: {
	type: String,
   },
   languages: {
	type: [String], // ['English', 'Tamil']
	default: [],
   },
   interests: {
	type: [String], // ['Tech', 'Football']
	default: [],
   },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

export default User;
