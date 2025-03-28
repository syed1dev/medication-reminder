# Medication Reminder System

A voice-driven medication reminder system built with Node.js and Twilio that helps patients keep track of their medication schedules.

## Features

- **Voice Calls**: Automatically calls patients to remind them about medications
- **Speech Recognition**: Captures and logs patient spoken responses
- **Intelligent Response Analysis**: Categorizes patient responses as full, partial, or no adherence
- **Personalized Feedback**: Provides appropriate responses based on adherence
- **Voicemail/SMS Fallback**: Handles unanswered calls by leaving voicemail or sending SMS
- **Call Logging**: Records all interactions and responses
- **Admin API**: Simple REST API for triggering calls and reviewing logs

## Database Integration (Optional)

The system is designed to work with or without a database:

- **With MongoDB**: Enables persistent storage of call logs and adherence data
- **Without MongoDB**: Falls back to console logging with no loss of core functionality
- **Graceful Degradation**: Automatically detects if MongoDB is available and adapts accordingly

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Twilio account
- ElevenLabs account (for Text-to-Speech)
- Deepgram account (for Speech-to-Text)
- MongoDB (optional - for call logs storage)
- Ngrok (for local development and testing)

## Setup and Installation

### 1. Clone the repository

```bash
git clone https://github.com/syed1dev/medication-reminder.git
cd medication-reminder
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the `.env.example` file to `.env` and fill in your API keys and credentials:

```bash
cp .env.example .env
```

Edit the `.env` file with your own values:

```
# Server configuration
PORT=3000
NODE_ENV=development
WEBHOOK_BASE_URL=https://your-ngrok-url.ngrok.io

# Twilio configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# ElevenLabs configuration (TTS)
ELEVEN_LABS_API_KEY=your_elevenlabs_api_key
ELEVEN_LABS_VOICE_ID=your_elevenlabs_voice_id

# Deepgram configuration (STT)
DEEPGRAM_API_KEY=your_deepgram_api_key

# MongoDB configuration (optional)
MONGODB_URI=mongodb://localhost:27017/medication-reminder
```

### 4. Set up third-party services

#### Twilio Setup

1. Create a Twilio account at [https://www.twilio.com](https://www.twilio.com)
2. Purchase a phone number with voice and SMS capabilities
3. Set up your Twilio webhook URLs (using Ngrok for local development):
   - Voice Webhook: `https://your-ngrok-url.ngrok.io/api/twilio/voice`
   - Status Callback URL: `https://your-ngrok-url.ngrok.io/api/twilio/status`
   - Gather Webhook: `https://your-ngrok-url.ngrok.io/api/twilio/gather`
4. Add your Twilio credentials to the `.env` file
5. If using a trial account, verify your personal phone number in the Twilio console

#### ElevenLabs Setup (TTS)

1. Create an account at [https://elevenlabs.io](https://elevenlabs.io)
2. Generate an API key in your profile settings
3. Select a voice ID or use the default provided
4. Add your ElevenLabs credentials to the `.env` file

#### Deepgram Setup (STT)

1. Create an account at [https://deepgram.com](https://deepgram.com)
2. Generate an API key in the console
3. Add your Deepgram API key to the `.env` file

#### Ngrok Setup (for local testing)

1. Download and install Ngrok from [https://ngrok.com](https://ngrok.com)
2. Start Ngrok and expose your local server:
   ```bash
   ngrok http 3000
   ```
3. Update your `.env` file with the Ngrok URL
4. Update your Twilio webhook URLs with the new Ngrok URL

### 5. Start the application

```bash
# For production
npm start

# For development with auto-reload
npm run dev
```

The server will start on the specified port (default: 3000)

## API Usage

### Trigger a Call

```
POST /api/call
```

Example using curl:
```bash
curl -X POST http://localhost:3000/api/call \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+12345678900"}'
```

Response:
```json
{
  "success": true,
  "message": "Call initiated successfully",
  "callSid": "CA1234567890abcdef",
  "status": "queued"
}
```

### Get Call Logs

```
GET /api/logs?page=1&limit=10
```

## Testing

```bash
npm test
```

## Troubleshooting

### MongoDB Connection Issues

If you see database connection warnings, the system will continue to function without database support. Just verify your connection string in `.env` if you want to use MongoDB.

### Twilio Webhook Issues

If calls are not being connected properly:
- Check that Ngrok is running and the URL is up to date
- Verify webhook URLs in the Twilio console
- Ensure your phone number is verified (for trial accounts)

## Project Structure

```
medication-reminder/
├── .env.example           # Environment variables template
├── .gitignore             # Git ignore file
├── README.md              # Documentation
├── package.json           # Dependencies
├── src/
│   ├── app.js             # Main application
│   ├── config/            # Configuration
│   │   └── index.js       # Config settings
│   ├── controllers/       # API controllers
│   │   └── callController.js # Call control logic
│   ├── models/            # Database models
│   │   └── callLog.js     # Call log schema
│   ├── routes/            # API routes
│   │   └── callRoutes.js  # API endpoints
│   ├── services/          # Service integrations
│   │   ├── twilioService.js # Twilio integration
│   │   ├── ttsService.js    # Text-to-Speech
│   │   └── sttService.js    # Speech-to-Text
│   ├── utils/             # Utility functions
│   │   └── logger.js      # Structured logging
│   └── middleware/        # Express middleware
│       └── errorHandler.js  # Error handling
└── tests/                 # Test files
    └── unit/              # Unit tests
        └── twilioService.test.js # Twilio service tests
```

## License

MIT