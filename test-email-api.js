import dotenv from 'dotenv';
dotenv.config();

// Import the existing API handler
import { handleDebugTransactions } from './api/main.js';

// Create a mock request and response
const mockRequest = {
  method: 'GET',
  query: {},
  body: {},
  headers: {}
};

const mockResponse = {
  status: function(code) {
    this.statusCode = code;
    return this;
  },
  json: function(data) {
    this.body = data;
    console.log(`Response Status: ${this.statusCode}`);
    console.log('Response Data:', JSON.stringify(data, null, 2));
    return this;
  },
  getHeader: function(header) {
    return this.headers ? this.headers[header] : undefined;
  }
};

async function testEmailAPI() {
  console.log('Testing email functionality through API...');
  
  try {
    // Test the debug transactions endpoint which will show transaction data
    console.log('Calling debug transactions endpoint...');
    await handleDebugTransactions(mockRequest, mockResponse);
    
    console.log('Debug transactions response:', mockResponse.body);
    
  } catch (error) {
    console.error('Error testing email API:', error);
  }
}

testEmailAPI().then(() => {
  console.log('API test completed');
}).catch((error) => {
  console.error('API test failed:', error);
});