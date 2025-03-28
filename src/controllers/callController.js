/**
 * Call Controller
 * 
 * Handles all API endpoints related to medication reminder calls,
 * including call initiation, voice handling, response gathering,
 * and call status updates.
 * 
 * @module controllers/callController
 */
const twilioService = require('../services/twilioService');
const CallLog = require('../models/callLog');
const config = require('../config');
const logger = require('../utils/logger');
const { AppError, ErrorTypes } = require('../middleware/errorHandler');

// Define standard messages
const MEDICATION_REMINDER_MESSAGE = "Hello, this is a reminder from your healthcare provider to confirm your medications for the day. Please confirm if you have taken your Aspirin, Cardivol, and Metformin today.";
const VOICEMAIL_MESSAGE = "We called to check on your medication but couldn't reach you. Please call us back or take your medications if you haven't done so.";
const POSITIVE_RESPONSE_MESSAGE = "Thank you for confirming you've taken your medications. Have a nice day.";
const NEGATIVE_RESPONSE_MESSAGE = "Thank you for letting us know. Please take your medications as prescribed. Your health provider will be notified about this. Have a nice day.";
const PARTIAL_RESPONSE_MESSAGE = "Thank you for your response. I've noted that you've taken some but not all of your medications. Please remember to take all your prescribed medications. Your health provider will be notified. Have a nice day.";
const UNCLEAR_RESPONSE_MESSAGE = "Thank you for your response. If you haven't taken all your medications yet, please do so as prescribed. Have a nice day.";

/**
 * Initiates a call to a patient
 * 
 * @function initiateCall
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with call details
 */
exports.initiateCall = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    // Validate phone number
    if (!phoneNumber) {
      throw new AppError('Phone number is required', ErrorTypes.VALIDATION_ERROR);
    }
    
    // E.164 format validation
    if (!phoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
      throw new AppError(
        'Phone number must be in E.164 format (e.g., +12345678900)', 
        ErrorTypes.VALIDATION_ERROR
      );
    }
    
    const call = await twilioService.makeCall(phoneNumber);
    
    // Log the call
    logger.info({
      event: 'call_initiated',
      phoneNumber,
      callSid: call.sid,
      status: call.status,
      requestId: req.requestId
    });
    
    // Store in database if implemented
    try {
      await CallLog.create({
        callSid: call.sid,
        status: 'Initiated',
        patientPhoneNumber: phoneNumber,
        timestamp: new Date()
      });
    } catch (dbError) {
      // Don't fail if database storage fails
      logger.warn({
        event: 'database_error',
        message: 'Failed to store call log in database',
        error: dbError.message,
        callSid: call.sid,
        requestId: req.requestId
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Call initiated successfully',
      callSid: call.sid,
      status: call.status
    });
  } catch (error) {
    console.error('Error initiating call:', error);
    return res.status(500).json({ 
      error: 'Failed to initiate call',
      details: error.message 
    });
  }
};

/**
 * Handles incoming voice calls and generates TwiML response
 * 
 * @function handleVoiceCall
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.handleVoiceCall = (req, res) => {
  try {
    // Check retry count (default to 0)
    const retryCount = parseInt(req.query.retryCount || '0', 10);
    
    // Check if we've exceeded max retries (2 attempts)
    if (retryCount >= 2) {
      // Max retries reached, provide closing message
      const VoiceResponse = require('twilio').twiml.VoiceResponse;
      const response = new VoiceResponse();
      
      response.say("We haven't received a clear response. Your healthcare provider will be notified. Please remember to take your medications as prescribed. Thank you and have a nice day.");
      response.hangup();
      
      logger.info({
        event: 'max_retries_reached',
        callSid: req.body.CallSid,
        retryCount: retryCount,
        message: 'Max retries reached, ending call',
        requestId: req.requestId
      });
      
      res.type('text/xml');
      return res.send(response.toString());
    }
    
    // Choose appropriate message based on retry count
    let message;
    if (retryCount === 0) {
      message = MEDICATION_REMINDER_MESSAGE;
    } else {
      message = "I'm sorry, I didn't catch that. Could you please repeat if you've taken your medications today?";
    }
    
    // Generate TwiML with incremented retry count
    const twiml = twilioService.generateTwiml(message, retryCount + 1);
    
    // Log the call info
    logger.info({
      event: 'voice_call_handling',
      callSid: req.body.CallSid,
      retryCount: retryCount,
      requestId: req.requestId
    });
    
    res.type('text/xml');
    res.send(twiml);
  } catch (error) {
    logger.error({
      event: 'voice_call_error',
      message: 'Error handling voice call',
      error: error.message,
      stack: error.stack,
      callSid: req.body.CallSid,
      requestId: req.requestId
    });
    res.status(500).send('Error processing call');
  }
};

/**
 * Handles gathered speech from patient and provides appropriate response
 * 
 * @function handleGather
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.handleGather = async (req, res) => {
  try {
    const patientResponse = req.body.SpeechResult || '';
    const callSid = req.body.CallSid;
    
    // If no speech was detected, redirect to voice handler with incremented retry count
    if (!patientResponse || patientResponse.trim() === '') {
      const VoiceResponse = require('twilio').twiml.VoiceResponse;
      const twiml = new VoiceResponse();
      
      // Get current retry count from query params, default to 0
      const currentRetryCount = parseInt(req.query.retryCount || '0', 10);
      
      // Redirect to voice handler with incremented retry count
      twiml.redirect(`${config.twilio.webhookUrl}/api/twilio/voice?retryCount=${currentRetryCount + 1}`);
      
      logger.info({
        event: 'no_speech_detected',
        callSid: callSid,
        retryCount: currentRetryCount + 1,
        requestId: req.requestId
      });
      
      res.type('text/xml');
      return res.send(twiml.toString());
    }
    
    // Log the patient's response
    logger.info({
      event: 'response_received',
      callSid: callSid,
      status: 'Answered',
      patientResponse: patientResponse,
      requestId: req.requestId
    });
    
    // Store in database if implemented
    try {
      await CallLog.findOneAndUpdate(
        { callSid },
        { 
          status: 'Answered',
          patientResponse,
        },
        { new: true }
      );
    } catch (dbError) {
      logger.warn({
        event: 'database_error',
        message: 'Failed to update call log in database',
        error: dbError.message,
        callSid: callSid,
        requestId: req.requestId
      });
    }
    
    // Analyze the patient's response
    const VoiceResponse = require('twilio').twiml.VoiceResponse;
    const twiml = new VoiceResponse();
    
    // Check if the response indicates medication was taken
    const positiveKeywords = ['yes', 'yeah', 'yep', 'yup', 'taken', 'did', 'have', 'already', 'completed'];
    const negativeKeywords = ['no', 'not', 'haven\'t', 'didn\'t', 'don\'t', 'forgot', 'later', 'missed'];
    const medicationKeywords = ['medication', 'medicine', 'pill', 'drug', 'tablet', 'aspirin', 'cardivol', 'metformin'];
    
    const responseLower = patientResponse.toLowerCase();
    
    // Determine if the response contains medication-related words
    const hasMedicationContext = medicationKeywords.some(keyword => responseLower.includes(keyword));
    
    // Check for positive and negative indicators
    let isPositive = positiveKeywords.some(keyword => responseLower.includes(keyword));
    let isNegative = negativeKeywords.some(keyword => responseLower.includes(keyword));
    
    // Store adherence status in database if implemented
    let adherenceStatus = 'Unknown';
    
    try {
      // More nuanced classification - prioritize negative responses
      if (isNegative && !isPositive) {
        // Clear no adherence
        twiml.say(NEGATIVE_RESPONSE_MESSAGE);
        logger.info({
          event: 'adherence_analysis',
          callSid: callSid,
          adherenceStatus: 'None',
          patientResponse: patientResponse,
          requestId: req.requestId
        });
        adherenceStatus = 'None';
      } else if (isPositive && !isNegative) {
        // Clear full adherence
        twiml.say(POSITIVE_RESPONSE_MESSAGE);
        logger.info({
          event: 'adherence_analysis',
          callSid: callSid,
          adherenceStatus: 'Full',
          patientResponse: patientResponse,
          requestId: req.requestId
        });
        adherenceStatus = 'Full';
      } else if (isPositive && isNegative) {
        // Mixed signals - partial adherence
        twiml.say(PARTIAL_RESPONSE_MESSAGE);
        logger.info({
          event: 'adherence_analysis',
          callSid: callSid,
          adherenceStatus: 'Partial',
          patientResponse: patientResponse,
          requestId: req.requestId
        });
        adherenceStatus = 'Partial';
      } else if (!hasMedicationContext) {
        // Response doesn't seem to be about medications
        twiml.say(UNCLEAR_RESPONSE_MESSAGE);
        logger.info({
          event: 'adherence_analysis',
          callSid: callSid,
          adherenceStatus: 'Unclear',
          patientResponse: patientResponse,
          note: 'Response not about medications',
          requestId: req.requestId
        });
        adherenceStatus = 'Unclear';
      } else {
        // Default unclear case
        twiml.say(UNCLEAR_RESPONSE_MESSAGE);
        logger.info({
          event: 'adherence_analysis',
          callSid: callSid,
          adherenceStatus: 'Unclear',
          patientResponse: patientResponse,
          requestId: req.requestId
        });
        adherenceStatus = 'Unclear';
      }
      
      twiml.hangup();
      
      res.type('text/xml');
      res.send(twiml.toString());
    } catch (error) {
      console.error('Error generating TwiML response:', error);
      
      // Fallback response in case of error
      const fallbackTwiml = new VoiceResponse();
      fallbackTwiml.say("Thank you for your response. Have a nice day.");
      fallbackTwiml.hangup();
      
      res.type('text/xml');
      res.send(fallbackTwiml.toString());
    }
  } catch (error) {
    console.error('Error handling gather:', error);
    res.status(500).send('Error processing response');
  }
};

/**
 * Handles call status callbacks from Twilio
 * 
 * @function handleStatusCallback
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.handleStatusCallback = async (req, res) => {
  try {
    const { CallSid, CallStatus, To } = req.body;
    
    // Log the call status
    logger.info({
      event: 'call_status_update',
      callSid: CallSid,
      status: CallStatus,
      requestId: req.requestId
    });
    
    // Update call log in database
    try {
      await CallLog.findOneAndUpdate(
        { callSid: CallSid },
        { status: CallStatus },
        { new: true }
      );
    } catch (dbError) {
      logger.warn({
        event: 'database_error',
        message: 'Failed to update call status in database',
        error: dbError.message,
        callSid: CallSid,
        requestId: req.requestId
      });
    }
    
    // Handle unanswered calls with more detailed status checks
    // Twilio status documentation: https://www.twilio.com/docs/voice/api/call-resource#call-status-values
    if (['no-answer', 'busy', 'failed', 'canceled', 'completed'].includes(CallStatus)) {
      // For completed calls, check if they were answered by a person
      // CallStatus will be 'completed' even if the call went to voicemail
      const answeredByHuman = req.body.AnsweredBy === 'human';
      const callDuration = parseInt(req.body.CallDuration || '0', 10);
      
      // If call went to voicemail or was very short (less than 5 seconds)
      if (CallStatus === 'completed' && (!answeredByHuman || callDuration < 5)) {
        console.log(`Call SID: ${CallSid}, Status: completed but likely voicemail or disconnected quickly`);
        
        // Send SMS fallback
        try {
          await twilioService.sendSms(To, VOICEMAIL_MESSAGE);
          console.log(`Call SID: ${CallSid}, SMS sent as fallback`);
          
          // Update call log for SMS
          try {
            await CallLog.findOneAndUpdate(
              { callSid: CallSid },
              { status: 'SMS Sent' },
              { new: true }
            );
          } catch (dbError) {
            console.error('Warning: Failed to update SMS status in database', dbError);
          }
        } catch (smsError) {
          console.error('Error sending SMS fallback:', smsError);
        }
      }
      // Direct handling for other non-completed states
      else if (CallStatus !== 'completed') {
        console.log(`Call SID: ${CallSid}, Status: ${CallStatus}, sending SMS fallback`);
        
        // Send SMS fallback
        try {
          await twilioService.sendSms(To, VOICEMAIL_MESSAGE);
          console.log(`Call SID: ${CallSid}, SMS sent as fallback`);
          
          // Update call log for SMS
          try {
            await CallLog.findOneAndUpdate(
              { callSid: CallSid },
              { status: 'SMS Sent' },
              { new: true }
            );
          } catch (dbError) {
            console.error('Warning: Failed to update SMS status in database', dbError);
          }
        } catch (smsError) {
          console.error('Error sending SMS fallback:', smsError);
        }
      }
    }
    
    // For completed calls, get the recording URL
    if (CallStatus === 'completed') {
      try {
        const recordingUrl = await twilioService.getRecordingUrl(CallSid);
        if (recordingUrl) {
          console.log(`Call SID: ${CallSid}, Recording URL: ${recordingUrl}`);
          
          // Update call log with recording URL
          try {
            await CallLog.findOneAndUpdate(
              { callSid: CallSid },
              { recordingUrl },
              { new: true }
            );
          } catch (dbError) {
            console.error('Warning: Failed to update recording URL in database', dbError);
          }
        }
      } catch (recordingError) {
        console.error('Error getting recording URL:', recordingError);
      }
    }
    
    res.status(200).send('Status received');
  } catch (error) {
    console.error('Error handling status callback:', error);
    res.status(500).send('Error processing status');
  }
};

/**
 * Gets all call logs
 * 
 * @function getCallLogs
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with call logs
 */
exports.getCallLogs = async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // If database is implemented
    const logs = await CallLog.find()
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await CallLog.countDocuments();
    
    return res.status(200).json({
      success: true,
      logs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting call logs:', error);
    return res.status(500).json({ error: 'Failed to retrieve call logs' });
  }
};