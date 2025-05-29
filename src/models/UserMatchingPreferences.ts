import mongoose from 'mongoose';

const UserMatchingPreferencesSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  profession: {
    type: String,
    required: true
  },
  languages: {
    type: [String],
    default: [],
    required: true
  },
  interests: {
    type: [String],
    default: [],
    required: true
  },
  // Additional fields that might be useful for matching
  preferred_commute_times: {
    type: [String], // e.g., ['morning', 'evening']
    default: []
  },
  preferred_commute_days: {
    type: [String], // e.g., ['monday', 'wednesday', 'friday']
    default: []
  },
  preferred_commute_radius: {
    type: Number, // in kilometers
    default: 10
  },
  embedding: {
	type: [Number],   // Array of floats (1536-dimensional vector)
	default: []
   },
   embedding_version: {
	type: String,
	default: "text-embedding-ada-002"
   },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index for faster queries
UserMatchingPreferencesSchema.index({ profession: 1, languages: 1, interests: 1 });

const UserMatchingPreferences = mongoose.model('UserMatchingPreferences', UserMatchingPreferencesSchema);

export default UserMatchingPreferences; 