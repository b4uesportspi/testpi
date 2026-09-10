const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();

async function testPiAPI() {
  console.log('Testing Pi Network API with your configured API key...');
  
  // Check if PI_SERVER_API_KEY is configured
  if (!process.env.PI_SERVER_API_KEY || process.env.PI_SERVER_API_KEY === 'your_pi_server_api_key_here') {
    console.log('❌ PI_SERVER_API_KEY is not properly configured');
    return;
  }
  
  console.log('✅ PI_SERVER_API_KEY is configured');
  
  try {
    // Test the Pi Network API
    const response = await axios.get('https://api.minepi.com/v2/me', {
      headers: {
        'Authorization': `Key ${process.env.PI_SERVER_API_KEY}`,
      },
      timeout: 5000 // 5 second timeout
    });
    
    console.log('✅ Pi Network API is accessible');
    console.log('API Response:', response.data);
  } catch (error) {
    console.log('❌ Pi Network API test failed:', error.message);
    
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

testPiAPI();