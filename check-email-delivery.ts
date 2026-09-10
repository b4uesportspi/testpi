import dotenv from 'dotenv';
dotenv.config();

import nodemailer from 'nodemailer';

console.log('📧 B4U Esports Email Delivery Checker');
console.log('====================================\n');

// Function to check SMTP configuration
async function checkSMTPConfig() {
  console.log('1️⃣ Checking SMTP Configuration...');
  
  const requiredEnvVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missingEnvVars.length > 0) {
    console.warn('⚠️  Missing SMTP environment variables:', missingEnvVars);
    return false;
  }
  
  console.log('✅ All required SMTP environment variables are present');
  console.log('   Host:', process.env.SMTP_HOST);
  console.log('   Port:', process.env.SMTP_PORT);
  console.log('   User:', process.env.SMTP_USER);
  console.log('   From:', process.env.SMTP_FROM);
  
  return true;
}

// Function to test SMTP connection
async function testSMTPConnection() {
  console.log('\n2️⃣ Testing SMTP Connection...');
  
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const isSecure = port === 465;
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port,
    secure: isSecure,
    requireTLS: !isSecure,
    auth: {
      user: process.env.SMTP_USER || 'info@b4uesports.com',
      pass: process.env.SMTP_PASS || 'your-password-here'
    },
    tls: {
      rejectUnauthorized: false
    }
  });
  
  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully');
    return true;
  } catch (error: any) {
    console.error('❌ SMTP verification failed:', error.message);
    return false;
  }
}

// Function to send a simple test email
async function sendTestEmail() {
  console.log('\n3️⃣ Sending Test Email...');
  
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const isSecure = port === 465;
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port,
    secure: isSecure,
    requireTLS: !isSecure,
    auth: {
      user: process.env.SMTP_USER || 'info@b4uesports.com',
      pass: process.env.SMTP_PASS || 'your-password-here'
    },
    tls: {
      rejectUnauthorized: false
    },
    logger: true,
    debug: true
  });
  
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'B4U Esports'}" <${process.env.SMTP_FROM || 'info@b4uesports.com'}>`,
      to: process.env.SMTP_USER || 'info@b4uesports.com',
      subject: '📧 Test Email - B4U Esports Delivery Check',
      text: 'This is a test email to verify email delivery functionality.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e3a8a;">📧 Test Email - B4U Esports Delivery Check</h2>
          <p>This is a test email to verify email delivery functionality.</p>
          
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #4b5563;">Configuration Info:</h3>
            <ul>
              <li><strong>Host:</strong> ${process.env.SMTP_HOST}</li>
              <li><strong>Port:</strong> ${process.env.SMTP_PORT}</li>
              <li><strong>Secure:</strong> ${isSecure}</li>
              <li><strong>User:</strong> ${process.env.SMTP_USER}</li>
              <li><strong>Time:</strong> ${new Date().toISOString()}</li>
            </ul>
          </div>
          
          <p>If you receive this email, your email configuration is working correctly.</p>
        </div>
      `
    });
    
    console.log('\n✅ Test email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   Accepted:', info.accepted);
    console.log('   Rejected:', info.rejected);
    console.log('   Response:', info.response);
    
    return true;
  } catch (error: any) {
    console.error('❌ Test email sending failed:', error.message);
    return false;
  }
}

// Main function
async function main() {
  console.log('🔍 Starting Email Delivery Check...\n');
  
  // Check configuration
  const configOk = await checkSMTPConfig();
  if (!configOk) {
    console.log('\n❌ Configuration check failed. Please fix the missing environment variables.');
    process.exit(1);
  }
  
  // Test connection
  const connectionOk = await testSMTPConnection();
  if (!connectionOk) {
    console.log('\n❌ SMTP connection test failed. Please check your SMTP configuration.');
    process.exit(1);
  }
  
  // Send test email
  const emailOk = await sendTestEmail();
  if (!emailOk) {
    console.log('\n❌ Test email sending failed. Please check your SMTP configuration.');
    process.exit(1);
  }
  
  console.log('\n✅ All checks passed! Your email configuration is working correctly.');
  console.log('\n📋 Next steps if users report not receiving emails:');
  console.log('   1. Check spam/junk folders');
  console.log('   2. Verify SPF/DKIM/DMARC DNS records');
  console.log('   3. Check Hostinger SMTP logs');
  console.log('   4. Test with different email providers (Gmail, Outlook, etc.)');
}

// Run the checker
main().catch(console.error);