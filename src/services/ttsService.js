// ElevenLabs TTS Service
const axios = require('axios');
const config = require('../config');

class TTSService {
  constructor() {
    this.apiKey = config.elevenLabs.apiKey;
    this.baseUrl = 'https://api.elevenlabs.io/v1';
    this.voiceId = config.elevenLabs.voiceId;
  }

  async textToSpeech(text) {
    try {
      const response = await axios({
        method: 'POST',
        url: `${this.baseUrl}/text-to-speech/${this.voiceId}`,
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey
        },
        data: {
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        },
        responseType: 'arraybuffer'
      });

      return response.data;
    } catch (error) {
      console.error('Error with TTS service:', error);
      throw error;
    }
  }

  // Stream TTS for real-time communication
  async streamTextToSpeech(text, res) {
    try {
      const response = await axios({
        method: 'POST',
        url: `${this.baseUrl}/text-to-speech/${this.voiceId}/stream`,
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey
        },
        data: {
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        },
        responseType: 'stream'
      });

      response.data.pipe(res);
    } catch (error) {
      console.error('Error with TTS streaming:', error);
      throw error;
    }
  }
}

module.exports = new TTSService();