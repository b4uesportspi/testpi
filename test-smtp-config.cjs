// Test SMTP configuration
require('dotenv').config();

const nodemailer = require('nodemailer');

// Create transporter with current configuration
const port = parseInt(process.env.SMTP_PORT || '587', 10);
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

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP transporter verification failed:', error.message);
    console.error('Error details:', error);
  } else {
    console.log('✅ SMTP transporter is ready to send emails');
    console.log('Success response:', success);
  }
  
  // Close the process
  process.exit(0);
});