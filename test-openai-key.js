const OpenAI = require('openai');
require('dotenv').config();

console.log('Testing OpenAI API key...');
console.log('API Key (first 20 chars):', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 20) + '...' : 'NOT SET');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function testOpenAI() {
  try {
    console.log('Sending test request to OpenAI...');
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: "Hello! Please respond with 'OpenAI API is working correctly' if you receive this message."
        }
      ],
      max_tokens: 50
    });

    console.log('✅ OpenAI API Response:', response.choices[0].message.content);
    console.log('✅ OpenAI API is working correctly!');
    
  } catch (error) {
    console.error('❌ OpenAI API Error:', error.message);
    
    if (error.message.includes('401')) {
      console.error('❌ API Key is invalid or expired');
    } else if (error.message.includes('429')) {
      console.error('❌ Rate limit exceeded or quota exceeded');
    } else if (error.message.includes('network')) {
      console.error('❌ Network connection issue');
    }
  }
}

testOpenAI();