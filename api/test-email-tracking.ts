import { VercelRequest, VercelResponse } from '@vercel/node';
import { sendTrackedPurchaseConfirmationEmail } from '../monitor-emails.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests for testing
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    console.log('📧 Testing email tracking in Vercel environment...');
    
    // Send a test email to verify logging works
    const testResult = await sendTrackedPurchaseConfirmationEmail({
      to: process.env.SMTP_USER || 'info@b4uesports.com',
      username: 'Vercel Test User',
      packageName: 'Test Package - For Vercel Logging Verification',
      piAmount: '1.0',
      usdAmount: '0.25',
      gameAccount: 'TEST123456',
      transactionId: 'vercel-test-txn-001',
      paymentId: 'vercel-test-pay-001'
    });
    
    console.log('📧 Test email tracking completed with result:', testResult);
    
    return res.status(200).json({
      success: true,
      message: 'Email tracking test completed',
      result: testResult,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Email tracking test failed:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}