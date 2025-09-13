// src/bot/autoReplier.js
const { initializeTwitterClient } = require('../config/twitter');

class AutoReplier {
  constructor() {
    this.twitterClient = null;
  }

  async initialize() {
    if (!this.twitterClient) {
      // Initialize a read-write client for replying
      this.twitterClient = await initializeTwitterClient('read-write');
      console.log('🤖 AutoReplier initialized with read-write Twitter client.');
    }
  }

  /**
   * Constructs and sends a reply to a given tweet.
   * @param {string} tweetId The ID of the tweet to reply to.
   * @param {object} analysis The analysis result from Gemini.
   */
  async replyWithInsight(tweetId, analysis) {
    if (!this.twitterClient) {
      throw new Error('AutoReplier is not initialized. Call initialize() first.');
    }

    if (!tweetId || !analysis || !analysis.insight) {
      console.error('❌ Invalid data provided for replying.');
      return;
    }

    const insightText = `🧠 Thread Psychology Analysis:\n\n${analysis.insight}\n\n#ThreadAnalysis #SubtextExposed`;

    try {
      await this.twitterClient.v2.reply(insightText, tweetId);
      console.log(`✅ Successfully replied to tweet ${tweetId}`);
    } catch (error) {
      console.error(`❌ Failed to reply to tweet ${tweetId}:`, error);
    }
  }
}

module.exports = { AutoReplier };