// Send a test email
require('dotenv').config();

const nodemailer = require('nodemailer');

// Create transporter with current configuration
const port = parseInt(process.env.SMTP_PORT || '465', 10);
const isSecure = port === 465; // true for SSL, false for TLS

console.log('SMTP Configuration:');
console.log('- Host:', process.env.SMTP_HOST || 'smtp.hostinger.com');
console.log('- Port:', port);
console.log('- Secure:', isSecure);
console.log('- User:', process.env.SMTP_USER || 'info@b4uesports.com');
console.log('- From:', process.env.SMTP_FROM || 'info@b4uesports.com');
console.log('- From Name:', process.env.SMTP_FROM_NAME || 'B4U Esports');

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
  }
});

// Send a test email
async function sendTestEmail() {
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'B4U Esports'}" <${process.env.SMTP_FROM || 'info@b4uesports.com'}>`,
      to: process.env.SMTP_FROM || 'info@b4uesports.com',
      subject: 'Test Email from B4U Esports',
      text: 'This is a test email to verify SMTP configuration.',
      html: '<h1>Test Email from B4U Esports</h1><p>This is a test email to verify SMTP configuration.</p>'
    });
    
    console.log('✅ Email sent successfully!');
    console.log('- Message ID:', info.messageId);
    console.log('- Accepted:', info.accepted);
    console.log('- Rejected:', info.rejected);
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    console.error('Error details:', error);
  }
}

// Run the test
sendTestEmail();