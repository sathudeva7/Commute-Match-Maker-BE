import mongoose from 'mongoose';

const JourneySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  travel_mode: {
    type: String,
    enum: ['bus', 'tube', 'overground'],
    required: true
  },
  route_id: {
    type: String, // e.g., bus number, tube line
    required: true
  },
  start_point: {
    type: String, // e.g., stop/station name or code
    required: true
  },
  end_point: {
    type: String,
    required: true
  },
  departure_time: {
    type: String, // Format: "HH:mm"
    required: true
  },
  arrival_time: {
    type: String, // Format: "HH:mm"
    required: false
  },
  days_of_week: [{
    type: String,
    enum: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
  }],
  description: {
    type: String,
    trim: true
  },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

const Journey = mongoose.model('Journey', JourneySchema);

export default Journey; 