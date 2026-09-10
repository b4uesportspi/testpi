// Import dotenv FIRST, just like in server/index.ts
import dotenv from "dotenv";
dotenv.config();

// Import the actual transporter from the email service
import nodemailer from 'nodemailer';
import { sendPurchaseConfirmationEmail } from './server/services/email.js';

console.log('Testing Port 587 by Modifying Existing Transporter');

// Let's check what the current configuration is
console.log('\nCurrent Environment Configuration:');
console.log('- SMTP_HOST:', process.env.SMTP_HOST || 'NOT SET');
console.log('- SMTP_PORT:', process.env.SMTP_PORT || 'NOT SET');
console.log('- SMTP_SECURE:', process.env.SMTP_SECURE || 'NOT SET');
console.log('- SMTP_USER:', process.env.SMTP_USER || 'NOT SET');

console.log('\n=== Testing Current Working Email Service ===');
// First, test that the existing service works
async function testExistingService() {
  try {
    console.log('Sending test email using existing service...');
    const result = await sendPurchaseConfirmationEmail({
      to: process.env.SMTP_FROM || 'info@b4uesports.com',
      username: 'Port 587 Test',
      packageName: 'Test Package',
      piAmount: '10',
      usdAmount: '2',
      gameAccount: 'TestAccount123',
      transactionId: 'test-transaction-587-existing',
      paymentId: 'test-payment-587-existing',
      isTestnet: false
    });
    
    if (result) {
      console.log('✅ Existing service test email sent successfully');
      return true;
    } else {
      console.log('❌ Failed to send test email using existing service');
      return false;
    }
  } catch (error: any) {
    console.error('❌ Existing service test failed:', error.message);
    return false;
  }
}

// Now, let's try to create a new transporter with port 587
// using the exact same credentials
async function testPort587Direct() {
  console.log('\n=== Testing Port 587 with New Transporter ===');
  
  try {
    console.log('Creating new transporter with port 587...');
    
    // Create a new transporter with port 587
    const transporter587 = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.hostinger.com',
      port: 587,
      secure: false, // STARTTLS for port 587
      auth: {
        user: process.env.SMTP_USER || 'info@b4uesports.com',
        pass: process.env.SMTP_PASS // Use actual password from env, not default
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    console.log('Verifying port 587 transporter...');
    await transporter587.verify();
    console.log('✅ Port 587 transporter verification successful');
    
    console.log('Sending test email via port 587...');
    const info = await transporter587.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'B4U Esports'}" <${process.env.SMTP_FROM || 'info@b4uesports.com'}>`,
      to: process.env.SMTP_FROM || 'info@b4uesports.com',
      subject: 'Direct Port 587 Test - B4U Esports',
      text: 'This is a direct test of port 587 configuration.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e3a8a;">Direct Port 587 Test</h2>
          <p>This email confirms whether port 587 works with a new transporter.</p>
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
  console.log('Port 587 Testing - Comparing Existing Service vs New Transporter');
  
  // Test existing service (we know this works)
  const existingServiceSuccess = await testExistingService();
  
  // Test port 587 with new transporter
  const port587Success = await testPort587Direct();
  
  console.log('\n=== Final Test Results ===');
  console.log(`Existing Service: ${existingServiceSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`Port 587 (New Transporter): ${port587Success ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  if (existingServiceSuccess && !port587Success) {
    console.log('\n⚠️  Interesting result:');
    console.log('- The existing email service works');
    console.log('- But creating a new transporter with the same credentials fails');
    console.log('\nThis suggests there might be something special about how the existing transporter');
    console.log('is configured or maintained that we are missing.');
  } else if (port587Success) {
    console.log('\n🎉 Port 587 configuration is working with new transporter!');
    console.log('To use port 587 in production, update your .env file:');
    console.log('SMTP_PORT=587');
    console.log('SMTP_SECURE=false');
  } else if (existingServiceSuccess) {
    console.log('\n⚠️  Port 587 configuration failed, but existing service works.');
    console.log('Recommendation: Continue using the existing configuration.');
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