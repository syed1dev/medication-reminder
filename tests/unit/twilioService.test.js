// Unit tests for Twilio Service
const TwilioService = require('../../src/services/twilioService');
const config = require('../../src/config');

// Mock Twilio client
jest.mock('twilio', () => {
  return jest.fn().mockImplementation(() => {
    return {
      calls: {
        create: jest.fn().mockResolvedValue({
          sid: 'test-call-sid',
          status: 'queued'
        })
      },
      messages: {
        create: jest.fn().mockResolvedValue({
          sid: 'test-message-sid',
          status: 'sent'
        })
      },
      recordings: {
        list: jest.fn().mockResolvedValue([
          { uri: 'https://api.twilio.com/recordings/test-recording-sid' }
        ])
      }
    };
  });
});

describe('TwilioService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('makeCall should create a call and return the call object', async () => {
    const phoneNumber = '+1234567890';
    const result = await TwilioService.makeCall(phoneNumber);
    
    expect(result).toEqual({
      sid: 'test-call-sid',
      status: 'queued'
    });
    
    expect(TwilioService.client.calls.create).toHaveBeenCalledWith({
      url: expect.stringContaining('/api/twilio/voice'),
      to: phoneNumber,
      from: config.twilio.phoneNumber,
      statusCallback: expect.stringContaining('/api/twilio/status'),
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST',
    });
  });

  test('sendSms should send a message and return the message object', async () => {
    const phoneNumber = '+1234567890';
    const message = 'Test message';
    const result = await TwilioService.sendSms(phoneNumber, message);
    
    expect(result).toEqual({
      sid: 'test-message-sid',
      status: 'sent'
    });
    
    expect(TwilioService.client.messages.create).toHaveBeenCalledWith({
      body: message,
      to: phoneNumber,
      from: config.twilio.phoneNumber
    });
  });

  test('generateTwiml should return valid TwiML for voice calls', () => {
    const message = 'Test message';
    const twiml = TwilioService.generateTwiml(message);
    
    expect(twiml).toContain('<Gather');
    expect(twiml).toContain('input="speech"');
    expect(twiml).toContain(message);
  });
  
  test('getRecordingUrl should return URI of the first recording', async () => {
    const callSid = 'test-call-sid';
    const result = await TwilioService.getRecordingUrl(callSid);
    
    expect(result).toBe('https://api.twilio.com/recordings/test-recording-sid');
    expect(TwilioService.client.recordings.list).toHaveBeenCalledWith({ callSid });
  });
});