/**
 * Payment Completion Fix for Pi Network Integration
 * 
 * This module provides a clean implementation of the payment completion endpoint
 * with enhanced debugging and error handling to resolve the 400 error issue.
 */

import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Pi Network API configuration
const PI_API_BASE = 'https://api.minepi.com';
const PI_SERVER_API_KEY = process.env.PI_SERVER_API_KEY || 'your_pi_server_api_key_here';

// Helper function to check if Pi Server API Key is configured
const isPiServerConfigured = () => PI_SERVER_API_KEY && PI_SERVER_API_KEY !== 'your_pi_server_api_key_here';

/**
 * Enhanced payment completion function with detailed debugging
 * @param paymentId - The Pi Network payment ID
 * @param txid - The blockchain transaction ID
 * @returns boolean indicating success or failure
 */
export async function completePayment(paymentId: string, txid: string): Promise<boolean> {
  // Validate inputs
  if (!paymentId || !txid) {
    console.error('Payment Complete: Missing paymentId or txid');
    return false;
  }

  // Check if Pi Server is configured
  if (!isPiServerConfigured()) {
    console.error('Payment Complete: Pi Server API Key not configured');
    return false;
  }

  // Debug logging for payment completion
  console.log('Payment complete debug', {
    paymentId,
    txid,
    apiUrl: `${PI_API_BASE}/v2/payments/${paymentId}/complete`,
    headers: {
      Authorization: `Key ${PI_SERVER_API_KEY ? '***' : 'MISSING'}`,
      'Content-Type': 'application/json'
    }
  });

  // Check payment status before attempting to complete
  try {
    console.log('Payment Complete: Checking payment status before completion');
    const paymentStatusResponse = await axios.get(`${PI_API_BASE}/v2/payments/${paymentId}`, {
      headers: {
        'Authorization': `Key ${PI_SERVER_API_KEY}`,
      }
    });

    if (paymentStatusResponse.status === 200) {
      const paymentStatus = paymentStatusResponse.data;
      console.log('Payment Complete: Payment status:', paymentStatus);

      // Check if payment is already completed
      if (paymentStatus.status && paymentStatus.status.developer_completed) {
        console.log('Payment Complete: Payment already completed, skipping completion');
        return true;
      }
      // Check if payment is approved by user
      else if (paymentStatus.status && !paymentStatus.status.developer_approved) {
        console.warn('Payment Complete: Payment not yet approved by developer, cannot complete');
        return false;
      }
      else if (paymentStatus.status && !paymentStatus.status.transaction_verified) {
        console.warn('Payment Complete: Payment transaction not yet verified, cannot complete');
        return false;
      }
    } else {
      console.error('Payment Complete: Failed to get payment status:', paymentStatusResponse.status);
      const statusErrorData = await paymentStatusResponse.data;
      console.error('Payment Complete: Payment status error data:', statusErrorData);
    }
  } catch (statusError) {
    console.error('Payment Complete: Error checking payment status:', statusError);
  }

  // Retry mechanism with exponential backoff
  const maxRetries = 3;
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`Payment Complete: Pi Network completion attempt ${attempt + 1}`);
      const piResponse = await axios.post(
        `${PI_API_BASE}/v2/payments/${paymentId}/complete`,
        { txid },
        {
          headers: {
            'Authorization': `Key ${PI_SERVER_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (piResponse.status === 200) {
        console.log('Payment Complete: Pi Network completion successful');
        const completionData = piResponse.data;
        console.log('Payment Complete: Pi Network completion response:', completionData);
        return true;
      } else {
        console.error(`Payment Complete: Pi Network completion attempt ${attempt + 1} failed with status:`, piResponse.status);
        const errorData = piResponse.data;
        console.error('Payment Complete: Pi Network error data:', errorData);

        // If we get a 400 error, log additional details
        if (piResponse.status === 400) {
          console.error('Payment Complete: 400 error indicates invalid request - check payment state, txid validity, and authorization header');
          console.error('Payment Complete: Common causes of 400 errors:');
          console.error('  1. Payment already completed');
          console.error('  2. Invalid txid');
          console.error('  3. Payment not yet approved by user');
          console.error('  4. Wrong network (testnet vs mainnet)');
          console.error('  5. Expired App Access Token');
        }
      }
    } catch (piError: any) {
      console.error(`Payment Complete: Pi Network completion attempt ${attempt + 1} failed:`, piError.message);
      console.error('Payment Complete: Pi Network completion error details:', piError);

      // If this is not the last attempt and the error might be temporary, wait before retrying
      if (attempt < maxRetries - 1) {
        const waitTime = Math.pow(2, attempt) * 2000; // 2s, 4s, 6s
        console.warn(`Payment Complete: Retry ${attempt + 1}/${maxRetries}: Waiting ${waitTime/1000}s before retrying...`);
        await delay(waitTime);
      }
    }
  }

  console.log('Payment Complete: All attempts failed, but continuing with local transaction completion');
  return false;
}

/**
 * Get payment details from Pi Network
 * @param paymentId - The Pi Network payment ID
 * @returns Payment details or null if failed
 */
export async function getPaymentDetails(paymentId: string): Promise<any | null> {
  if (!isPiServerConfigured()) {
    console.error('Get Payment: Pi Server API Key not configured');
    return null;
  }

  try {
    const response = await axios.get(`${PI_API_BASE}/v2/payments/${paymentId}`, {
      headers: {
        'Authorization': `Key ${PI_SERVER_API_KEY}`,
      }
    });

    if (response.status === 200) {
      return response.data;
    } else {
      console.error('Get Payment: Failed to get payment details:', response.status);
      return null;
    }
  } catch (error) {
    console.error('Get Payment: Error fetching payment details:', error);
    return null;
  }
}