// Deepgram STT Service
const { Deepgram } = require('@deepgram/sdk');
const config = require('../config');

class STTService {
  constructor() {
    this.deepgram = new Deepgram(config.deepgram.apiKey);
  }

  async speechToText(audioBuffer) {
    try {
      const response = await this.deepgram.transcription.preRecorded(
        { buffer: audioBuffer, mimetype: 'audio/mpeg' },
        { punctuate: true, utterances: true }
      );

      // Get the transcript from the first utterance
      if (response.results && 
          response.results.utterances && 
          response.results.utterances.length > 0) {
        return response.results.utterances[0].transcript;
      }
      
      return '';
    } catch (error) {
      console.error('Error with STT service:', error);
      throw error;
    }
  }

  // Create a real-time streaming connection
  createRealTimeStream() {
    try {
      const deepgramLive = this.deepgram.transcription.live({
        punctuate: true,
        interim_results: true,
        language: 'en-US'
      });

      return deepgramLive;
    } catch (error) {
      console.error('Error creating STT stream:', error);
      throw error;
    }
  }
}

module.exports = new STTService();