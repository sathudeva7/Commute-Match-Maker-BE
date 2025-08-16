import mongoose from 'mongoose';
import { IMatchingPreferences } from '../types/user.types';

const UserMatchingPreferencesSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  matching_preferences: {
    profession: {
      type: String,
      required: true
    },
    languages: {
      type: [String],
      default: [],
      required: true
    },
    about_me: {
      type: String,
      default: ''
    },
    interests: {
      type: [String],
      default: [],
      required: true
    },
    preferred_commute_time: {
      start: { type: String }, // Format: "HH:mm"
      end: { type: String }    // Format: "HH:mm"
    },
    preferred_commute_days: {
      type: [String], // e.g., ['MONDAY', 'WEDNESDAY', 'FRIDAY']
      default: []
    },
    // Additional fields that might be useful for matching
    preferred_commute_times: {
      type: [String], // e.g., ['morning', 'evening']
      default: []
    },


  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Create individual indexes for fields we'll query frequently
UserMatchingPreferencesSchema.index({ 'matching_preferences.interests': 1 });
UserMatchingPreferencesSchema.index({ 'matching_preferences.languages': 1 });
UserMatchingPreferencesSchema.index({ 'matching_preferences.profession': 1 });
UserMatchingPreferencesSchema.index({ 'matching_preferences.preferred_commute_days': 1 });

const UserMatchingPreferences = mongoose.model('UserMatchingPreferences', UserMatchingPreferencesSchema);

export default UserMatchingPreferences; 