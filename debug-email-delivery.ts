import dotenv from 'dotenv';
dotenv.config();

import nodemailer from 'nodemailer';

console.log('🔍 B4U Esports Email Delivery Debug Tool');
console.log('=========================================\n');

// Step 1: Environment Variables Check
console.log('1️⃣ Checking Environment Variables...');
const requiredEnvVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.warn('⚠️  Missing SMTP environment variables:', missingEnvVars);
} else {
  console.log('✅ All required SMTP environment variables are present');
  console.log('   Host:', process.env.SMTP_HOST);
  console.log('   Port:', process.env.SMTP_PORT);
  console.log('   User:', process.env.SMTP_USER);
  console.log('   From:', process.env.SMTP_FROM);
}

// Create transporter with debugging enabled
const port = parseInt(process.env.SMTP_PORT || '587', 10);
const isSecure = port === 465; // true for SSL, false for TLS

console.log('\n2️⃣ Creating Transporter with Configuration...');
console.log('   Port:', port);
console.log('   Secure:', isSecure);
console.log('   Require TLS:', !isSecure);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port,
  secure: isSecure,
  requireTLS: !isSecure, // Enforce TLS if using port 587
  auth: {
    user: process.env.SMTP_USER || 'info@b4uesports.com',
    pass: process.env.SMTP_PASS || 'your-password-here'
  },
  tls: {
    rejectUnauthorized: false
  },
  logger: true,   // enables console logs
  debug: true     // shows detailed SMTP communication
});

// Step 2: Check SMTP Connection Before Sending
console.log('\n3️⃣ Verifying SMTP Connection...');
transporter.verify()
  .then(() => {
    console.log('✅ SMTP connection verified successfully');
    
    // Step 1 & 6 & 7: Send test email with full debugging
    console.log('\n4️⃣ Sending Test Email with Full Debugging...');
    sendTestEmail();
  })
  .catch(err => {
    console.error('❌ SMTP verification failed:', err.message);
    console.error('   This means emails won\'t leave your server.');
    console.error('   Common causes: wrong password, wrong port, network blocked, TLS issue.');
    process.exit(1);
  });

async function sendTestEmail() {
  try {
    const info = await transporter.sendMail({
      from: `"B4U Esports" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER || "info@b4uesports.com", // Send to ourselves for testing
      subject: "🧪 Test Email - B4U Esports Debug",
      text: "Hello, this is a test email for debugging purposes.",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e3a8a;">🧪 Test Email - B4U Esports Debug</h2>
          <p>Hello, this is a test email for debugging purposes.</p>
          
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #4b5563;">Debug Information:</h3>
            <ul>
              <li><strong>Host:</strong> ${process.env.SMTP_HOST}</li>
              <li><strong>Port:</strong> ${process.env.SMTP_PORT}</li>
              <li><strong>Secure:</strong> ${isSecure}</li>
              <li><strong>User:</strong> ${process.env.SMTP_USER}</li>
              <li><strong>Time:</strong> ${new Date().toISOString()}</li>
            </ul>
          </div>
          
          <p>If you receive this email, it means your SMTP configuration is working correctly.</p>
          
          <hr style="margin: 20px 0; border: 0; border-top: 1px solid #e2e8f0;">
          <p style="font-size: 12px; color: #94a3b8;">
            This is an automated test email from B4U Esports debugging system.
          </p>
        </div>
      `
    });

    console.log('\n✅ Test email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   Envelope:', info.envelope);
    console.log('   Accepted:', info.accepted);
    console.log('   Rejected:', info.rejected);
    console.log('   Response:', info.response);
    
    // Step 7: Analyze results
    console.log('\n5️⃣ Analyzing Results...');
    if (info.rejected && info.rejected.length > 0) {
      console.warn('⚠️  Some recipients were rejected by the SMTP server:');
      console.warn('   Rejected:', info.rejected);
    } else {
      console.log('✅ All recipients were accepted by the SMTP server');
      console.log('   This means Nodemailer did its job correctly.');
      console.log('   If users don\'t receive emails, check:');
      console.log('   - Spam/Junk folders');
      console.log('   - Hostinger/SMTP logs');
      console.log('   - SPF/DKIM/DMARC configuration');
    }
    
    console.log('\n✅ Debugging Complete!');
    console.log('📋 Summary:');
    console.log('   - SMTP connection: Verified ✓');
    console.log('   - Email sending: Successful ✓');
    console.log('   - Recipients accepted: ' + (info.accepted?.length || 0) + ' ✓');
    console.log('   - Recipients rejected: ' + (info.rejected?.length || 0));
    
  } catch (error: any) {
    console.error('\n❌ Test email sending failed:', error.message);
    console.error('   Code:', error.code);
    console.error('   Command:', error.command);
    console.error('   Response:', error.response);
    
    // Common error codes analysis
    switch (error.code) {
      case 'EAUTH':
        console.error('   🔍 This is an authentication error. Check your SMTP credentials.');
        break;
      case 'ECONNREFUSED':
        console.error('   🔍 Connection refused. Check your SMTP host and port.');
        break;
      case 'ETIMEDOUT':
        console.error('   🔍 Connection timed out. Check your network/firewall settings.');
        break;
      default:
        console.error('   🔍 Unknown error. Check the error details above.');
    }
  }
}