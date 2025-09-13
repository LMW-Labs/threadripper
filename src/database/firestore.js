// src/database/firestore.js
const { Firestore } = require('@google-cloud/firestore');

const db = new Firestore();
const MONITORED_THREADS_COLLECTION = 'monitored_threads';
const BOT_RESPONSES_COLLECTION = 'bot_responses'; // Assuming this is where final analyses are stored

/**
 * Checks if a tweet has already been analyzed by looking it up in Firestore.
 * @param {string} tweetId The ID of the tweet to check.
 * @returns {Promise<boolean>} True if the tweet has been analyzed, false otherwise.
 */
async function hasAnalyzed(tweetId) {
  try {
    // Check if it's been marked for monitoring recently
    const monitoredRef = db.collection(MONITORED_THREADS_COLLECTION).doc(tweetId);
    const monitoredDoc = await monitoredRef.get();
    if (monitoredDoc.exists) {
      return true;
    }

    // Check if a final reply/analysis has ever been stored for it
    const responseRef = db.collection(BOT_RESPONSES_COLLECTION).doc(tweetId);
    const responseDoc = await responseRef.get();
    return responseDoc.exists;

  } catch (error) {
    console.error(`Error checking Firestore for tweet ${tweetId}:`, error);
    // To be safe, assume it has been analyzed if we can't check.
    return true;
  }
}

/**
 * Marks a tweet as analyzed by adding it to Firestore.
 * @param {string} tweetId The ID of the tweet to mark as analyzed.
 * @param {object} tweetData The tweet data to store.
 */
async function markAsAnalyzed(tweetId, tweetData) {
  try {
    const docRef = db.collection(MONITORED_THREADS_COLLECTION).doc(tweetId);
    await docRef.set({ ...tweetData, analyzedAt: new Date() });
  } catch (error) {
    console.error(`Error marking tweet ${tweetId} as analyzed in Firestore:`, error);
  }
}

module.exports = { hasAnalyzed, markAsAnalyzed };