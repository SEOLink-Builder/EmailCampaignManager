const OpenAI = require('openai');

// Initialize OpenAI client conditionally - only if API key is present
let openai = null;

/**
 * Initialize or reinitialize the OpenAI client with an API key
 * @param {string} apiKey - The OpenAI API key
 * @returns {boolean} - Whether initialization was successful
 */
function initializeOpenAI(apiKey = process.env.OPENAI_API_KEY) {
  try {
    if (apiKey) {
      openai = new OpenAI({ apiKey });
      console.log('OpenAI client initialized successfully');
      return true;
    } else {
      console.log('OpenAI API key not set - AI features will be disabled');
      return false;
    }
  } catch (error) {
    console.error('Error initializing OpenAI client:', error.message);
    return false;
  }
}

// Initial setup
initializeOpenAI();

/**
 * Generate optimized email subject lines using AI
 * @param {string} originalSubject - The original subject line
 * @param {string} emailContent - The content of the email
 * @param {string} category - The email category (promotional, newsletter, etc.)
 * @param {string} audience - Target audience description (if available)
 * @returns {Promise<Array<string>>} - Array of optimized subject lines
 */
async function generateOptimizedSubjects(originalSubject, emailContent, category = 'other', audience = '') {
  try {
    // Check if we have an API key and if the client is initialized
    if (!openai || !process.env.OPENAI_API_KEY) {
      const error = new Error('OpenAI API key is required. Please add your API key in Settings → Advanced → AI Integration.');
      error.code = 'OPENAI_API_KEY_MISSING';
      throw error;
    }

    // Extract the text content from HTML for better context
    const plainTextContent = emailContent
      .replace(/<[^>]*>/g, ' ')  // Remove HTML tags
      .replace(/\s+/g, ' ')      // Replace multiple spaces with a single space
      .trim();

    // Create the prompt with detailed instructions
    const prompt = `
You are an expert email marketing specialist. Your task is to generate 3 high-converting subject lines for an email.

Original subject: "${originalSubject}"

Email content excerpt: "${plainTextContent.substring(0, 500)}${plainTextContent.length > 500 ? '...' : ''}"

Email category: ${category}
${audience ? `Target audience: ${audience}` : ''}

Guidelines for creating optimized subject lines:
- Create subject lines that will maximize open rates
- Keep subject lines between 30-65 characters when possible
- Avoid spam trigger words and excessive capitalization
- Create a sense of urgency or curiosity where appropriate
- Each subject line should have a different approach/angle
- Personalize when possible

Please respond with a JSON object containing exactly 3 subject lines and a predicted effectiveness score for each one (0-100):
`;

    // Generate optimized subject lines using gpt-4o
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    // Parse the response
    const result = JSON.parse(response.choices[0].message.content);
    const subjects = result.subject_lines || result.subjects || [];

    // Return the optimized subject lines
    return subjects.map(s => typeof s === 'object' ? s.subject : s);
  } catch (error) {
    console.error('Error generating optimized subject lines:', error);
    
    // Check for rate limit or quota errors
    if (error.code === 'insufficient_quota' || (error.error && error.error.type === 'insufficient_quota')) {
      const quotaError = new Error('OpenAI API quota exceeded. Please check your billing details or try again later.');
      quotaError.code = 'OPENAI_QUOTA_EXCEEDED';
      throw quotaError;
    }
    
    return [originalSubject + ' (AI optimization failed)', originalSubject];
  }
}

/**
 * Analyze email content and provide improvement suggestions
 * @param {string} emailContent - The HTML content of the email
 * @returns {Promise<Object>} - Analysis results and suggestions
 */
async function analyzeEmailContent(emailContent) {
  try {
    // Check if we have an API key and if the client is initialized
    if (!openai || !process.env.OPENAI_API_KEY) {
      const error = new Error('OpenAI API key is required. Please add your API key in Settings → Advanced → AI Integration.');
      error.code = 'OPENAI_API_KEY_MISSING';
      throw error;
    }

    // Extract the text content from HTML
    const plainTextContent = emailContent
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const prompt = `
Analyze this email content for marketing effectiveness. Consider:
1. Clarity and conciseness
2. Persuasiveness
3. Call to action effectiveness
4. Personalization 
5. Tone and voice
6. Potential spam triggers

Email content: "${plainTextContent.substring(0, 1000)}${plainTextContent.length > 1000 ? '...' : ''}"

Respond with a JSON object containing:
1. "score": An overall effectiveness score from 0-100
2. "suggestions": An array of specific improvement suggestions (3-5 items)
3. "strengths": An array highlighting what works well (2-3 items)
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('Error analyzing email content:', error);
    
    // Check for rate limit or quota errors
    if (error.code === 'insufficient_quota' || (error.error && error.error.type === 'insufficient_quota')) {
      const quotaError = new Error('OpenAI API quota exceeded. Please check your billing details or try again later.');
      quotaError.code = 'OPENAI_QUOTA_EXCEEDED';
      throw quotaError;
    }
    
    return {
      score: 0,
      suggestions: ['Analysis failed due to an error: ' + (error.message || 'Unknown error')],
      strengths: []
    };
  }
}

/**
 * Generate personalized content recommendations based on subscriber data
 * @param {Object} subscriberData - Subscriber data including interests, past behavior
 * @param {string} emailPurpose - The purpose of the email (promotional, newsletter, etc.)
 * @returns {Promise<string>} - Personalized content recommendation
 */
async function generatePersonalizedRecommendations(subscriberData, emailPurpose) {
  try {
    // Check if we have an API key and if the client is initialized
    if (!openai || !process.env.OPENAI_API_KEY) {
      const error = new Error('OpenAI API key is required. Please add your API key in Settings → Advanced → AI Integration.');
      error.code = 'OPENAI_API_KEY_MISSING';
      throw error;
    }
    
    // Implementation similar to other AI functions
    // This would use subscriber data to generate personalized content sections
    const prompt = `
Generate personalized content recommendations for the following subscriber:

Subscriber data: ${JSON.stringify(subscriberData)}
Email purpose: ${emailPurpose}

Please respond with content recommendations based on the subscriber's interests and behavior.
Include subject line suggestions, content blocks, and call-to-action recommendations.
Format your response as a JSON object.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('Error generating personalized recommendations:', error);
    
    // Check for rate limit or quota errors
    if (error.code === 'insufficient_quota' || (error.error && error.error.type === 'insufficient_quota')) {
      const quotaError = new Error('OpenAI API quota exceeded. Please check your billing details or try again later.');
      quotaError.code = 'OPENAI_QUOTA_EXCEEDED';
      throw quotaError;
    }
    
    throw error;
  }
}

module.exports = {
  initializeOpenAI,
  generateOptimizedSubjects,
  analyzeEmailContent,
  generatePersonalizedRecommendations
};