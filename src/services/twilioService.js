/**
 * Twilio Service Module
 * 
 * Handles all Twilio-related interactions including voice calls,
 * SMS messaging, TwiML generation, and call recording.
 * 
 * @module services/twilioService
 */
const twilio = require('twilio');
const config = require('../config');

class TwilioService {
  constructor() {
    this.client = twilio(config.twilio.accountSid, config.twilio.authToken);
  }

  /**
   * Initiates an outbound call to a patient
   * 
   * @param {string} phoneNumber - Patient's phone number in E.164 format
   * @returns {Promise<Object>} - Twilio call object
   * @throws {Error} - If the call cannot be initiated
   */
  async makeCall(phoneNumber) {
    try {
      if (!phoneNumber || !phoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
        throw new Error('Invalid phone number format. Must be in E.164 format.');
      }

      const call = await this.client.calls.create({
        url: `${config.twilio.webhookUrl}/api/twilio/voice`,
        to: phoneNumber,
        from: config.twilio.phoneNumber,
        statusCallback: `${config.twilio.webhookUrl}/api/twilio/status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
      });
      
      return call;
    } catch (error) {
      console.error('Error making call:', error);
      throw error;
    }
  }

  /**
   * Sends an SMS message to a patient
   * 
   * @param {string} phoneNumber - Patient's phone number in E.164 format
   * @param {string} message - SMS message content
   * @returns {Promise<Object>} - Twilio message object
   * @throws {Error} - If the SMS cannot be sent
   */
  async sendSms(phoneNumber, message) {
    try {
      if (!phoneNumber || !phoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
        throw new Error('Invalid phone number format. Must be in E.164 format.');
      }

      if (!message || message.trim() === '') {
        throw new Error('Message cannot be empty.');
      }

      const sms = await this.client.messages.create({
        body: message,
        to: phoneNumber,
        from: config.twilio.phoneNumber,
      });
      
      return sms;
    } catch (error) {
      console.error('Error sending SMS:', error);
      throw error;
    }
  }

  /**
   * Generates TwiML for voice calls with speech recognition
   * 
   * @param {string} message - Message to be spoken via TTS
   * @param {number} [nextRetryCount=1] - The retry count to pass to the next request
   * @returns {string} - TwiML XML response as string
   */
  generateTwiml(message, nextRetryCount = 1) {
    try {
      const VoiceResponse = twilio.twiml.VoiceResponse;
      const response = new VoiceResponse();
      
      // Add a Gather verb to collect patient's spoken response
      const gather = response.gather({
        input: 'speech',
        action: `${config.twilio.webhookUrl}/api/twilio/gather`,
        speechTimeout: 'auto',
        language: 'en-US',
      });
      
      gather.say(message);
      
      // If the patient doesn't say anything, retry with incremented count
      response.redirect(`${config.twilio.webhookUrl}/api/twilio/voice?retryCount=${nextRetryCount}`);
      
      return response.toString();
    } catch (error) {
      console.error('Error generating TwiML:', error);
      // Fallback for tests or if Twilio client fails
      return `<Response><Gather input="speech" action="${config.twilio.webhookUrl}/api/twilio/gather" speechTimeout="auto" language="en-US"><Say>${message}</Say></Gather><Redirect>${config.twilio.webhookUrl}/api/twilio/voice?retryCount=${nextRetryCount}</Redirect></Response>`;
    }
  }

  /**
   * Generates TwiML for voicemail messages
   * 
   * @param {string} message - Message to be spoken via TTS
   * @returns {string} - TwiML XML response as string
   */
  generateVoicemailTwiml(message) {
    try {
      const VoiceResponse = twilio.twiml.VoiceResponse;
      const response = new VoiceResponse();
      
      response.say(message);
      
      return response.toString();
    } catch (error) {
      console.error('Error generating voicemail TwiML:', error);
      return `<Response><Say>${message}</Say></Response>`;
    }
  }

  /**
   * Gets the recording URL for a call
   * 
   * @param {string} callSid - Twilio Call SID
   * @returns {Promise<string|null>} - Recording URL or null if not found
   */
  async getRecordingUrl(callSid) {
    try {
      const recordings = await this.client.recordings.list({ callSid });
      return recordings.length > 0 ? recordings[0].uri : null;
    } catch (error) {
      console.error('Error getting recording URL:', error);
      return null;
    }
  }
}

module.exports = new TwilioService();