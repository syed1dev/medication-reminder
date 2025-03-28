/**
 * Call Log Model
 * 
 * Defines the schema for storing call logs in MongoDB.
 * Implements graceful fallback when database is not available.
 * 
 * @module models/callLog
 */
const mongoose = require('mongoose');
const config = require('../config');

/**
 * Call Log Schema
 * 
 * @property {string} callSid - Twilio Call SID (unique identifier)
 * @property {string} status - Current status of the call
 * @property {string} patientPhoneNumber - Patient's phone number
 * @property {string} patientResponse - Transcribed response from the patient
 * @property {string} adherenceStatus - Medication adherence status
 * @property {string} recordingUrl - URL to the call recording
 * @property {Date} timestamp - When the call was made
 * @property {boolean} notificationSent - Whether a notification was sent to healthcare provider
 */
const callLogSchema = new mongoose.Schema({
  callSid: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  status: {
    type: String,
    enum: ['Initiated', 'Ringing', 'In-Progress', 'Answered', 'Completed', 'Failed', 'Busy', 'No Answer', 'Voicemail Left', 'SMS Sent'],
    required: true,
    index: true
  },
  patientPhoneNumber: {
    type: String,
    required: true,
    index: true
  },
  patientResponse: {
    type: String,
    default: null
  },
  adherenceStatus: {
    type: String,
    enum: ['Full', 'Partial', 'None', 'Unclear', 'Unknown'],
    default: 'Unknown',
    index: true
  },
  recordingUrl: {
    type: String,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  notificationSent: {
    type: Boolean,
    default: false
  }
});

// Compound indexes for common query patterns
callLogSchema.index({ patientPhoneNumber: 1, timestamp: -1 });
callLogSchema.index({ adherenceStatus: 1, timestamp: -1 });

// Virtual for human-readable time
callLogSchema.virtual('formattedTimestamp').get(function() {
  return this.timestamp ? this.timestamp.toLocaleString() : 'Unknown';
});

// Pre-save hook for data validation
callLogSchema.pre('save', function(next) {
  next();
});

// Setup mock object for when database is unavailable
const mockCallLog = {
  create: async (data) => {
    console.log('Mock database: Created call log', data);
    return data;
  },
  find: async () => {
    console.log('Mock database: Find operation called');
    return [];
  },
  findOneAndUpdate: async (query, update) => {
    console.log('Mock database: Updated call log', { query, update });
    return { ...query, ...update };
  },
  countDocuments: async () => {
    console.log('Mock database: Count documents called');
    return 0;
  }
};

// Conditionally connect to database if URI is provided
let CallLog;

if (process.env.MONGODB_URI) {
  try {
    // Use existing model if it exists
    CallLog = mongoose.model('CallLog');
  } catch (error) {
    // Create new model if it doesn't exist
    CallLog = mongoose.model('CallLog', callLogSchema);
  }
  
  // Connect to MongoDB if not already connected
  if (mongoose.connection.readyState === 0) {
    mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Fail fast if MongoDB unavailable
    })
      .then(() => console.log('Connected to MongoDB'))
      .catch(err => {
        console.error('MongoDB connection error:', err);
        console.log('Running without database support');
        CallLog = mockCallLog;
      });
  }
} else {
  console.log('No MongoDB URI provided. Running without database support.');
  CallLog = mockCallLog;
}

module.exports = CallLog;