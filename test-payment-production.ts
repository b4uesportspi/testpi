/**
 * Production test script for payment-fix module
 * Uses actual environment variables
 */

import dotenv from 'dotenv';
import { completePayment, getPaymentDetails } from './payment-fix';

// Load production environment variables
dotenv.config({ path: '.env.production' });

async function testPaymentProduction() {
  console.log('Testing payment-fix module with production environment...');
  
  // Verify that the API key is loaded
  console.log('PI_SERVER_API_KEY loaded:', !!process.env.PI_SERVER_API_KEY);
  if (process.env.PI_SERVER_API_KEY) {
    console.log('API Key length:', process.env.PI_SERVER_API_KEY.length);
  }
  
  // Test with dummy data (this will fail but should not throw TypeScript errors)
  try {
    console.log('Testing completePayment with dummy data...');
    const result = await completePayment('dummy-payment-id', 'dummy-txid');
    console.log('completePayment result:', result);
  } catch (error) {
    console.log('Expected error with dummy data:', error.message);
  }
  
  try {
    console.log('Testing getPaymentDetails with dummy data...');
    const result = await getPaymentDetails('dummy-payment-id');
    console.log('getPaymentDetails result:', result);
  } catch (error) {
    console.log('Expected error with dummy data:', error.message);
  }
  
  console.log('Production test completed.');
}

testPaymentProduction();