import dotenv from 'dotenv';
import * as nodemailer from 'nodemailer';

// Load environment variables
dotenv.config();

console.log('Testing Port 587 Configuration with Hostinger');

// Test the exact configuration that Hostinger recommends for port 587
// According to Hostinger documentation:
// Port: 587
// Encryption: STARTTLS (which means secure: false in nodemailer)
// Authentication: Same as port 465

async function testHostingerPort587() {
  console.log('\n=== Testing Hostinger SMTP Port 587 Configuration ===');
  
  const transporter587 = nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 587,
    secure: false, // STARTTLS
    auth: {
      user: process.env.SMTP_USER || 'info@b4uesports.com',
      pass: process.env.SMTP_PASS // Using actual password from env
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Verifying Hostinger port 587 configuration...');
    await transporter587.verify();
    console.log('✅ Hostinger port 587 transporter verification successful');
    
    console.log('Sending test email via Hostinger port 587...');
    const info = await transporter587.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'B4U Esports'}" <${process.env.SMTP_FROM || 'info@b4uesports.com'}>`,
      to: process.env.SMTP_FROM || 'info@b4uesports.com',
      subject: 'Hostinger Port 587 Test - B4U Esports',
      text: 'This is a test email to verify Hostinger SMTP port 587 configuration.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e3a8a;">Hostinger Port 587 Test</h2>
          <p>This email confirms whether the Hostinger SMTP configuration with port 587 works.</p>
          <div style="background-color: #f0f8ff; padding: 15px; border-left: 4px solid #1e3a8a; margin: 20px 0;">
            <p><strong>Configuration Details:</strong></p>
            <ul>
              <li>Host: smtp.hostinger.com</li>
              <li>Port: 587</li>
              <li>Secure: STARTTLS (false)</li>
              <li>User: ${process.env.SMTP_USER || 'info@b4uesports.com'}</li>
            </ul>
          </div>
        </div>
      `
    });
    
    console.log('✅ Test email sent successfully via Hostinger port 587');
    console.log('Message ID:', info.messageId);
    
    return true;
  } catch (error: any) {
    console.error('❌ Hostinger port 587 test failed:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response
    });
    
    // Let's also check if it's a specific error we can identify
    if (error.code === 'EAUTH') {
      console.log('\n⚠️  Authentication failed. This could be due to:');
      console.log('  1. Incorrect username or password');
      console.log('  2. Port 587 might not be enabled for your Hostinger account');
      console.log('  3. Hostinger might require port 465 for security reasons');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️  Connection refused. This could be due to:');
      console.log('  1. Port 587 might be blocked by your network');
      console.log('  2. Port 587 might not be available on Hostinger');
    }
    
    return false;
  }
}

// Also test the current working configuration for comparison
async function testCurrentWorkingConfig() {
  console.log('\n=== Testing Current Working Configuration (Port 465) ===');
  
  const transporter465 = nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true, // SSL
    auth: {
      user: process.env.SMTP_USER || 'info@b4uesports.com',
      pass: process.env.SMTP_PASS // Using actual password from env
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Verifying current working configuration...');
    await transporter465.verify();
    console.log('✅ Current working configuration verification successful');
    
    return true;
  } catch (error: any) {
    console.error('❌ Current working configuration test failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('Hostinger SMTP Port 587 vs Port 465 Comparison Test');
  
  console.log('\nSMTP Configuration:');
  console.log('- User:', process.env.SMTP_USER || 'info@b4uesports.com');
  console.log('- Host: smtp.hostinger.com');
  console.log('- Current .env Port:', process.env.SMTP_PORT || '465');
  console.log('- Current .env Secure:', process.env.SMTP_SECURE || 'true');
  
  // Test current working configuration
  const port465Success = await testCurrentWorkingConfig();
  
  // Test port 587
  const port587Success = await testHostingerPort587();
  
  console.log('\n=== Final Test Results ===');
  console.log(`Port 465 (Current): ${port465Success ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`Port 587 (Requested): ${port587Success ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  if (port587Success) {
    console.log('\n🎉 Port 587 configuration is working!');
    console.log('You can update your .env file to use port 587:');
    console.log('SMTP_PORT=587');
    console.log('SMTP_SECURE=false');
  } else if (port465Success) {
    console.log('\n⚠️  Port 587 configuration failed, but port 465 works.');
    console.log('Recommendation: Continue using port 465 as it is currently working.');
    console.log('Possible reasons port 587 failed:');
    console.log('  1. Hostinger may prefer/recommend port 465 for security');
    console.log('  2. Port 587 might not be enabled for your specific account');
    console.log('  3. Network restrictions might block port 587');
  } else {
    console.log('\n❌ Both configurations failed.');
    console.log('Please check your SMTP credentials and network connectivity.');
  }
}

// Execute tests
runTests().catch(console.error);