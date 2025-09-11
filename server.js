// server.js - Main application entry
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cron = require('node-cron');
require('dotenv').config();

const { TwitterMonitor } = require('./src/monitors/twitterStream');
const { SubtextAnalyzer } = require('./src/analysis/subtextAnalyzer');
const { AutoReplier } = require('./src/bot/autoReplier');
const { FirestoreClient } = require('./src/database/firestore');

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Initialize components
const db = new FirestoreClient();
const analyzer = new SubtextAnalyzer();
const replier = new AutoReplier();
const monitor = new TwitterMonitor(db, analyzer, replier);

// Routes
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date(),
    service: 'THREADRIPPER v1.0'
  });
});

app.get('/api/stats', async (req, res) => {
  try {
    const stats = await db.getAnalysisStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Manual analysis endpoint (for testing)
app.post('/api/analyze-thread', async (req, res) => {
  try {
    const { tweetUrl } = req.body;
    
    if (!tweetUrl) {
      return res.status(400).json({ error: 'tweetUrl is required' });
    }

    console.log(`Manual analysis requested for: ${tweetUrl}`);
    const analysis = await analyzer.analyzeThreadFromUrl(tweetUrl);
    
    res.json({
      success: true,
      analysis,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error in manual analysis:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start monitoring endpoint
app.post('/api/start-monitoring', async (req, res) => {
  try {
    await monitor.scanForViralThreads();
    res.json({ message: 'Monitoring scan completed' });
  } catch (error) {
    console.error('Error starting monitoring:', error);
    res.status(500).json({ error: error.message });
  }
});

// Schedule monitoring (runs every 15 minutes during peak hours)
// Uncomment this when ready for automated monitoring
// cron.schedule('*/15 9-23 * * *', () => {
//   console.log('Starting scheduled Twitter monitoring...');
//   monitor.scanForViralThreads();
// });

app.listen(port, () => {
  console.log('===========================================');
  console.log(`🧠 THREADRIPPER running on port ${port}`);
  console.log('📊 Health check: http://localhost:8080/health');
  console.log('📈 Stats: http://localhost:8080/api/stats');
  console.log('🔍 Manual analysis: POST /api/analyze-thread');
  console.log('===========================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});