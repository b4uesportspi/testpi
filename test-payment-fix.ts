/**
 * Test script for payment-fix module
 */

import { completePayment, getPaymentDetails } from './payment-fix';

async function testPaymentFix() {
  console.log('Testing payment-fix module...');
  
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
  
  console.log('Test completed.');
}

testPaymentFix();