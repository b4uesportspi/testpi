// Import dotenv FIRST, just like in server/index.ts
import dotenv from "dotenv";
dotenv.config();

import nodemailer from 'nodemailer';
import { sendPurchaseConfirmationEmail } from './server/services/email.js';

console.log('Port 587 Test with Proper Environment Loading');
console.log('==========================================');

console.log('SMTP Environment Variables:');
console.log('- SMTP_HOST:', process.env.SMTP_HOST);
console.log('- SMTP_PORT:', process.env.SMTP_PORT);
console.log('- SMTP_SECURE:', process.env.SMTP_SECURE);
console.log('- SMTP_USER:', process.env.SMTP_USER);
console.log('- SMTP_PASS:', process.env.SMTP_PASS ? 'SET' : 'NOT SET');
console.log('- SMTP_FROM:', process.env.SMTP_FROM);

console.log('\n=== Testing Existing Email Service ===');

async function testExistingService() {
  try {
    console.log('Sending test email using existing service...');
    const result = await sendPurchaseConfirmationEmail({
      to: process.env.SMTP_FROM || 'info@b4uesports.com',
      username: 'Existing Service Test',
      packageName: 'Existing Service Package',
      piAmount: '10',
      usdAmount: '2',
      gameAccount: 'ExistingAccount123',
      transactionId: 'existing-transaction',
      paymentId: 'existing-payment',
      isTestnet: false
    });
    
    if (result) {
      console.log('✅ Existing service email sent successfully');
      return true;
    } else {
      console.log('❌ Failed to send email using existing service');
      return false;
    }
  } catch (error: any) {
    console.error('❌ Existing service test failed:', error.message);
    return false;
  }
}

console.log('\n=== Testing Port 587 Configuration ===');

async function testPort587() {
  try {
    console.log('Creating transporter with port 587...');
    
    // Create transporter with port 587 configuration
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.hostinger.com',
      port: 587,
      secure: false, // STARTTLS for port 587
      auth: {
        user: process.env.SMTP_USER || 'info@b4uesports.com',
        pass: process.env.SMTP_PASS // Use actual password from env
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    console.log('Configuration details:');
    console.log('- Host:', process.env.SMTP_HOST || 'smtp.hostinger.com');
    console.log('- Port:', 587);
    console.log('- Secure:', false);
    console.log('- User:', process.env.SMTP_USER || 'info@b4uesports.com');
    
    console.log('Verifying port 587 transporter...');
    await transporter.verify();
    console.log('✅ Port 587 transporter verification successful');
    
    console.log('Sending test email via port 587...');
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'B4U Esports'}" <${process.env.SMTP_FROM || 'info@b4uesports.com'}>`,
      to: process.env.SMTP_FROM || 'info@b4uesports.com',
      subject: 'Port 587 Test - B4U Esports',
      text: 'This is a test of port 587 configuration.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e3a8a;">Port 587 Test</h2>
          <p>This email confirms whether port 587 works with the current environment.</p>
          <div style="background-color: #f0f8ff; padding: 15px; border-left: 4px solid #1e3a8a; margin: 20px 0;">
            <p><strong>Configuration Details:</strong></p>
            <ul>
              <li>Host: ${process.env.SMTP_HOST || 'smtp.hostinger.com'}</li>
              <li>Port: 587</li>
              <li>Secure: STARTTLS (false)</li>
              <li>User: ${process.env.SMTP_USER || 'info@b4uesports.com'}</li>
            </ul>
          </div>
        </div>
      `
    });
    
    console.log('✅ Test email sent successfully via port 587');
    console.log('Message ID:', info.messageId);
    
    return true;
  } catch (error: any) {
    console.error('❌ Port 587 test failed:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response
    });
    
    return false;
  }
}

async function runTests() {
  console.log('Port 587 Testing with Proper Environment Loading');
  
  // Test existing service (we know this works)
  const existingSuccess = await testExistingService();
  
  // Test port 587
  const port587Success = await testPort587();
  
  console.log('\n=== Final Test Results ===');
  console.log(`Existing Service: ${existingSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`Port 587: ${port587Success ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  if (port587Success) {
    console.log('\n🎉 Port 587 configuration is working!');
    console.log('To use port 587 in production, update your .env file:');
    console.log('SMTP_PORT=587');
    console.log('SMTP_SECURE=false');
  } else if (existingSuccess) {
    console.log('\n⚠️  Port 587 configuration failed, but existing service works.');
    console.log('Recommendation: Continue using port 465 as it is currently working.');
    console.log('\nTo try port 587 in the future, update your .env file with:');
    console.log('SMTP_PORT=587');
    console.log('SMTP_SECURE=false');
  } else {
    console.log('\n❌ Both configurations failed.');
    console.log('Please check your SMTP credentials and network connectivity.');
  }
}

// Execute tests
runTests().catch(console.error);