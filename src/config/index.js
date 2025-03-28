// Configuration
module.exports = {
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER,
      webhookUrl: process.env.WEBHOOK_BASE_URL || 'http://localhost:3000'
    },
    elevenLabs: {
      apiKey: process.env.ELEVEN_LABS_API_KEY,
      voiceId: process.env.ELEVEN_LABS_VOICE_ID
    },
    deepgram: {
      apiKey: process.env.DEEPGRAM_API_KEY
    },
    mongodb: {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/medication-reminder'
    }
  };