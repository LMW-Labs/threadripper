// src/analysis/subtextAnalyzer.js - Real Gemini Integration
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { SecretsManager } = require('../config/secrets');

class SubtextAnalyzer {
  constructor() {
    this.secrets = new SecretsManager();
    this.genAI = null;
    this.model = null;
    this.init();
  }

  async init() {
    try {
      const apiKey = await this.secrets.getSecret('GEMINI_API_KEY');
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY not found');
      }
      
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
      
      console.log('✅ SubtextAnalyzer initialized with Gemini API');
    } catch (error) {
      console.error('❌ Error initializing SubtextAnalyzer:', error);
      throw error;
    }
  }

  async analyzeThreadFromUrl(tweetUrl) {
    // For now, this is a placeholder - we'll add Twitter API integration later
    console.log(`Analyzing URL: ${tweetUrl}`);
    
    // Mock thread data for testing
    const mockThreadData = {
      originalTweet: {
        text: "Super excited about our new product launch! The team has been grinding hard and we're ready to disrupt the market. This is going to change everything! 🚀"
      },
      replies: [
        { text: "Congrats! Can't wait to try it" },
        { text: "Finally! When will it be available?" },
        { text: "Hope it's better than your last launch..." }
      ],
      totalEngagement: { like_count: 150, reply_count: 45, retweet_count: 23 }
    };

    return await this.analyzeThreadSubtext(mockThreadData);
  }

  async analyzeThreadSubtext(threadData) {
    try {
      if (!this.model) {
        await this.init();
      }

      const prompt = this.buildTwitterAnalysisPrompt();
      const threadText = this.extractThreadText(threadData);
      
      console.log('🧠 Analyzing thread with Gemini...');
      
      const result = await this.model.generateContent(prompt + "\n\nThread to analyze:\n---\n" + threadText);
      const response = await result.response;
      
      const analysisText = response.text();
      console.log('Raw Gemini response:', analysisText);
      
      return this.parseAnalysisResponse(analysisText);
      
    } catch (error) {
      console.error('❌ Error with Gemini analysis:', error);
      // Return fallback analysis
      return {
        surface_message: "Unable to analyze due to API error",
        hidden_meaning: "Analysis failed", 
        power_dynamics: "Could not determine",
        emotional_tactics: "Could not analyze",
        stress_indicators: "Could not detect",
        confidence: 0.1,
        subtext_score: 1,
        viral_reply: "🧠 This thread has some interesting layers worth exploring...",
        error: error.message
      };
    }
  }

  buildTwitterAnalysisPrompt() {
    return `You are an expert Twitter thread psychologist and business analyst. Your specialty is detecting hidden meanings in social media posts, especially from business leaders, startups, and tech personalities.

Analyze this Twitter thread for psychological subtext, hidden meanings, and emotional undertones that aren't immediately obvious.

Look for:

1. **Surface vs Reality**: What they appear to be saying vs what they're actually communicating
2. **Power Dynamics**: Attempts to establish authority, dominance, or credibility 
3. **Emotional Manipulation**: Any use of FOMO, guilt, urgency, or social pressure
4. **Hidden Stress Indicators**: Signs of burnout, desperation, uncertainty, or problems disguised as confidence
5. **Business Subtext**: What this really reveals about their company/product/situation

Pay special attention to:
- Overly positive language that might hide problems
- Humble brags or subtle boasting
- Defensive responses to criticism
- Buzzwords used to deflect from real issues
- Timeline pressure or urgency that seems manufactured

Return your analysis as valid JSON only (no markdown formatting):

{
  "surface_message": "Brief summary of what they appear to be saying",
  "hidden_meaning": "What they're actually communicating beneath the surface", 
  "power_dynamics": "How they're trying to establish authority or credibility",
  "emotional_tactics": "Any manipulation, pressure, or emotional hooks being used",
  "stress_indicators": "Signs of hidden problems, burnout, or desperation",
  "confidence": 0.85,
  "subtext_score": 8,
  "viral_reply": "A witty, insightful 200-character reply that exposes the subtext in a clever way"
}

The viral_reply should be engaging and shareable, calling out the subtext in a way that adds value to the conversation.`;
  }

  extractThreadText(threadData) {
    let text = `ORIGINAL TWEET: ${threadData.originalTweet.text}\n\n`;
    
    // Add engagement metrics for context
    if (threadData.totalEngagement) {
      text += `ENGAGEMENT: ${threadData.totalEngagement.like_count} likes, ${threadData.totalEngagement.reply_count} replies, ${threadData.totalEngagement.retweet_count} retweets\n\n`;
    }
    
    // Add replies for context (limited to first 10 for token efficiency)
    if (threadData.replies && threadData.replies.length > 0) {
      text += "TOP REPLIES:\n";
      threadData.replies.slice(0, 10).forEach((reply, index) => {
        text += `${index + 1}. ${reply.text}\n`;
      });
    }
    
    return text;
  }

  parseAnalysisResponse(responseText) {
    try {
      // Clean the response - remove any markdown code blocks
      let cleaned = responseText.replace(/```json\s*|\s*```/g, '').trim();
      
      // Sometimes Gemini adds extra text before/after JSON, so try to extract just the JSON part
      const jsonStart = cleaned.indexOf('{');
      const jsonEnd = cleaned.lastIndexOf('}') + 1;
      
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        cleaned = cleaned.substring(jsonStart, jsonEnd);
      }
      
      const parsed = JSON.parse(cleaned);
      
      // Validate required fields
      const requiredFields = ['surface_message', 'hidden_meaning', 'confidence', 'subtext_score', 'viral_reply'];
      for (const field of requiredFields) {
        if (!parsed[field]) {
          console.warn(`Missing required field: ${field}`);
        }
      }
      
      // Ensure confidence is between 0 and 1
      if (parsed.confidence > 1) {
        parsed.confidence = Math.min(parsed.confidence / 100, 1.0);
      }
      
      // Ensure subtext_score is between 1 and 10
      if (parsed.subtext_score > 10) {
        parsed.subtext_score = 10;
      }
      
      console.log('✅ Successfully parsed Gemini analysis');
      return parsed;
      
    } catch (error) {
      console.error('❌ Error parsing Gemini response:', error);
      console.error('Raw response was:', responseText);
      
      // Return a fallback response
      return {
        surface_message: "Could not parse analysis",
        hidden_meaning: "Analysis parsing failed", 
        power_dynamics: "Unknown",
        emotional_tactics: "Unknown",
        stress_indicators: "Unknown",
        confidence: 0.1,
        subtext_score: 1,
        viral_reply: "🧠 There's more to this thread than meets the eye...",
        parse_error: error.message,
        raw_response: responseText.substring(0, 500) + "..." // Include truncated raw response for debugging
      };
    }
  }

  // Method to get analysis statistics
  getAnalysisStats() {
    return {
      model: 'gemini-1.5-flash-latest',
      initialized: !!this.model,
      version: '1.0.0'
    };
  }
}

module.exports = { SubtextAnalyzer };