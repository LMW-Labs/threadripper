// src/monitors/twitterStream.js

const express = require('express');
const bodyParser = require('body-parser');
const { calculateViralScore } = require('./viralDetector');
const { hasAnalyzed, markAsAnalyzed } = require('../database/firestore');
const { initializeTwitterClient } = require('../config/twitter');
const { PubSub } = require('@google-cloud/pubsub');

const PORT = process.env.PORT || 8080;

// Your existing TwitterMonitor class
class TwitterMonitor {
  constructor(pubsub, twitterClient) {
    if (!pubsub || !twitterClient) {
      throw new Error('PubSub and Twitter clients must be provided.');
    }
    this.pubsub = pubsub;
    this.twitter = twitterClient;
    this.analysisTopicName = 'twitter-analyzer-new-thread'; // Topic for analysis service
    this.keywords = ['startup', 'AI', 'tech', 'business'];
    console.log('🐦 TwitterMonitor initialized');
  }

  async scanForViralThreads() {
    console.log(`🔍 Scanning for viral threads with keywords: [${this.keywords.join(', ')}]`);

    const query = `(${this.keywords.join(' OR ')}) -is:retweet -is:reply lang:en`;

    try {
      const response = await this.twitter.v2.search({
        query,
        'tweet.fields': ['public_metrics', 'created_at', 'author_id'],
        'expansions': ['author_id'],
        'user.fields': ['public_metrics'],
        max_results: 20, // Fetch a small batch to analyze
      });

      if (!response.data.data) {
        console.log('No tweets found for the given query.');
        return { message: 'Scan completed, no tweets found.' };
      }

      for (const tweet of response.data.data) {
        // Check if we've already analyzed this tweet
        if (await hasAnalyzed(tweet.id)) {
          console.log(`-> Skipping already analyzed tweet ${tweet.id}`);
          continue;
        }

        const score = calculateViralScore(tweet);
        const tweetUrl = `https://twitter.com/${tweet.author_id}/status/${tweet.id}`;
        console.log(`-> Analyzing tweet ${tweet.id} | Score: ${score.toFixed(2)}`);

        if (score > 20) {
          console.log(`✅ Viral tweet found! Publishing for analysis: ${tweetUrl}`);
          const payload = {
            tweetId: tweet.id,
            text: tweet.text,
            authorId: tweet.author_id,
            tweetUrl: tweetUrl,
            public_metrics: tweet.public_metrics,
            created_at: tweet.created_at,
          };
          await this.pubsub.topic(this.analysisTopicName).publishJSON(payload);
          await markAsAnalyzed(tweet.id, payload); // Mark as analyzed in Firestore
        }
      }
    } catch (error) {
      console.error('Error searching tweets:', error);
      throw error;
    }

    return { message: 'Scan completed' };
  }
}

// --- Express App Setup ---
const app = express();
app.use(bodyParser.json());

let monitor; // Will be initialized asynchronously

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// This is the endpoint Cloud Scheduler will hit to trigger a scan
app.post('/', async (req, res) => {
  console.log('Received HTTP request to trigger monitoring scan.');
  if (!monitor) {
    console.error('Monitor not initialized yet.');
    return res.status(503).send('Service Unavailable: Monitor not ready.');
  }

  try {
    await monitor.scanForViralThreads(); // Call your monitoring logic
    res.status(200).send('Monitoring triggered successfully!');
  } catch (error) {
    console.error('Error during monitoring trigger:', error);
    res.status(500).send('Error triggering monitoring.');
  }
});

async function startServer() {
  try {
    const pubsub = new PubSub();
    const twitterClient = await initializeTwitterClient();
    monitor = new TwitterMonitor(pubsub, twitterClient);

    app.listen(PORT, () => {
      console.log(`🚀 Monitoring service listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('💥 Failed to start monitoring service:', error);
    process.exit(1);
  }
}

startServer();

// You can still export the class if other modules need it,
// but for the Cloud Run entry point, the server needs to start.
module.exports = { TwitterMonitor };
