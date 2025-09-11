// src/database/firestore.js - Database operations
const { Firestore } = require('@google-cloud/firestore');

class FirestoreClient {
  constructor() {
    try {
      this.db = new Firestore();
      console.log('✅ Firestore client initialized');
    } catch (error) {
      console.error('❌ Error initializing Firestore:', error);
      // For development, we can continue without Firestore
      this.db = null;
    }
  }

  collection(name) {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }
    return this.db.collection(name);
  }

  async saveAnalysis(tweetId, analysis) {
    if (!this.db) {
      console.log('Firestore not available - would save analysis:', { tweetId, analysis });
      return;
    }

    try {
      await this.db.collection('analyzed_threads').doc(tweetId).set({
        ...analysis,
        timestamp: new Date(),
        tweetId
      });
      console.log(`✅ Saved analysis for tweet ${tweetId}`);
    } catch (error) {
      console.error('❌ Error saving analysis:', error);
      throw error;
    }
  }

  async hasAnalyzed(tweetId) {
    if (!this.db) {
      return false;
    }

    try {
      const doc = await this.db.collection('analyzed_threads').doc(tweetId).get();
      return doc.exists;
    } catch (error) {
      console.error('Error checking if analyzed:', error);
      return false;
    }
  }

  async getAnalysisStats() {
    if (!this.db) {
      return {
        total: 0,
        recent: [],
        message: 'Firestore not connected (development mode)'
      };
    }

    try {
      const snapshot = await this.db.collection('analyzed_threads')
        .orderBy('timestamp', 'desc')
        .limit(100)
        .get();
      
      return {
        total: snapshot.size,
        recent: snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      throw error;
    }
  }

  // Save viral thread candidate
  async saveViralCandidate(tweet, viralScore) {
    if (!this.db) {
      console.log('Would save viral candidate:', { tweetId: tweet.id, viralScore });
      return;
    }

    try {
      await this.db.collection('viral_candidates').add({
        tweetId: tweet.id,
        tweetText: tweet.text,
        authorId: tweet.author_id,
        viralScore,
        metrics: tweet.public_metrics,
        timestamp: new Date(),
        processed: false
      });
    } catch (error) {
      console.error('Error saving viral candidate:', error);
    }
  }

  // Get unprocessed viral candidates
  async getUnprocessedCandidates(limit = 10) {
    if (!this.db) {
      return [];
    }

    try {
      const snapshot = await this.db.collection('viral_candidates')
        .where('processed', '==', false)
        .orderBy('viralScore', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting unprocessed candidates:', error);
      return [];
    }
  }

  // Mark candidate as processed
  async markAsProcessed(candidateId) {
    if (!this.db) {
      return;
    }

    try {
      await this.db.collection('viral_candidates').doc(candidateId).update({
        processed: true,
        processedAt: new Date()
      });
    } catch (error) {
      console.error('Error marking as processed:', error);
    }
  }
}

module.exports = { FirestoreClient };
