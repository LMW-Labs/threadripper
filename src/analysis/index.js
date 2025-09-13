// src/analysis/index.js - Analysis Service Entry Point
const express = require('express');
const bodyParser = require('body-parser');
const { PubSub } = require('@google-cloud/pubsub');
const { SubtextAnalyzer } = require('./subtextAnalyzer');
const { AutoReplier } = require('../bot/autoReplier');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(bodyParser.json());

const pubsub = new PubSub();
const subscriptionName = 'twitter-analyzer-new-thread-sub';
const subscription = pubsub.subscription(subscriptionName);

// Initialize our components
const analyzer = new SubtextAnalyzer(); // For Gemini calls
const replier = new AutoReplier();     // For replying to tweets

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// This is the main endpoint that Pub/Sub will push messages to.
app.post('/', async (req, res) => {
  if (!req.body || !req.body.message) {
    console.warn('Received invalid Pub/Sub message.');
    return res.status(400).send('Bad Request: Invalid Pub/Sub message format.');
  }

  const pubSubMessage = req.body.message;
  const tweetData = pubSubMessage.data
    ? JSON.parse(Buffer.from(pubSubMessage.data, 'base64').toString())
    : null;

  if (!tweetData || !tweetData.tweetId) {
    console.warn('Received Pub/Sub message with no tweet data.');
    return res.status(400).send('Bad Request: No tweet data in message.');
  }

  console.log(`Received tweet ${tweetData.tweetId} for analysis.`);

  try {
    // 1. Analyze the tweet with Gemini
    const analysisResult = await analyzer.analyzeTweet(tweetData);
    console.log(`Analysis complete for tweet ${tweetData.tweetId}.`);

    // 2. Reply to the tweet with the analysis
    await replier.replyWithInsight(tweetData.tweetId, analysisResult);

    // Acknowledge the message so Pub/Sub doesn't resend it
    res.status(204).send();
  } catch (error) {
    console.error(`Error processing tweet ${tweetData.tweetId}:`, error);
    // Don't acknowledge the message, so Pub/Sub will retry
    res.status(500).send('Internal Server Error');
  }
});

async function startAnalysisServer() {
  try {
    // Initialize the replier once at startup
    await replier.initialize();
    app.listen(PORT, () => {
      console.log(`🚀 Analysis service listening on port ${PORT}`);
      console.log('Waiting for tweet analysis tasks from Pub/Sub...');
    });
  } catch (error) {
    console.error('💥 Failed to start analysis service:', error);
    process.exit(1);
  }
}

startAnalysisServer();

module.exports = app;