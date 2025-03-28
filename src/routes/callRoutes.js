// API Routes
const express = require('express');
const callController = require('../controllers/callController');
const router = express.Router();

// Trigger a call to a patient
router.post('/call', callController.initiateCall);

// Twilio webhook for voice calls
router.post('/twilio/voice', callController.handleVoiceCall);

// Twilio webhook for gathering spoken responses
router.post('/twilio/gather', callController.handleGather);

// Twilio webhook for call status updates
router.post('/twilio/status', callController.handleStatusCallback);

// Get all call logs
router.get('/logs', callController.getCallLogs);

module.exports = router;