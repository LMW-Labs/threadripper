// src/config/twitter.js
const { TwitterApi } = require('twitter-api-v2');
const { getSecret } = require('./secrets');

async function initializeTwitterClient(accessType = 'read-only') {
  try {
    if (accessType === 'read-write') {
      console.log('Initializing Read-Write Twitter Client...');
      const appKey = await getSecret('TWITTER_API_KEY');
      const appSecret = await getSecret('TWITTER_API_SECRET');
      const accessToken = await getSecret('TWITTER_ACCESS_TOKEN');
      const accessSecret = await getSecret('TWITTER_ACCESS_TOKEN_SECRET');

      const client = new TwitterApi({
        appKey,
        appSecret,
        accessToken,
        accessSecret,
      });
      console.log('✅ Read-Write Twitter client initialized.');
      return client;
    } else {
      console.log('Initializing Read-Only Twitter Client...');
      const bearerToken = await getSecret('TWITTER_BEARER_TOKEN');
      const client = new TwitterApi(bearerToken);
      console.log('✅ Read-Only Twitter client initialized.');
      return client.readOnly;
    }
  } catch (error) {
    console.error('❌ Failed to initialize Twitter client:', error);
    throw error; // Re-throw to prevent the service from starting in a bad state
  }
}

module.exports = { initializeTwitterClient };