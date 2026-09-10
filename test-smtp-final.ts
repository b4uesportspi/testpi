import dotenv from 'dotenv';
dotenv.config();

import nodemailer from 'nodemailer';

console.log('🔍 Testing SMTP Configuration...\n');

// Log environment variables (masked for security)
console.log('📋 Environment Variables:');
console.log('SMTP_HOST:', process.env.SMTP_HOST || 'NOT SET');
console.log('SMTP_PORT:', process.env.SMTP_PORT || 'NOT SET');
console.log('SMTP_USER:', process.env.SMTP_USER ? 'SET (' + process.env.SMTP_USER + ')' : 'NOT SET');
console.log('SMTP_PASS:', process.env.SMTP_PASS ? 'SET (length: ' + process.env.SMTP_PASS.length + ')' : 'NOT SET');
console.log('SMTP_FROM:', process.env.SMTP_FROM || 'NOT SET');
console.log('');

const port = parseInt(process.env.SMTP_PORT || '587', 10);
const isSecure = port === 465;

console.log('🔧 Creating transporter with:');
console.log('  Host:', process.env.SMTP_HOST);
console.log('  Port:', port);
console.log('  Secure:', isSecure);
console.log('  Require TLS:', !isSecure);
console.log('');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: port,
  secure: isSecure,
  requireTLS: !isSecure,
  auth: {
    user: process.env.SMTP_USER || 'info@b4uesports.com',
    pass: process.env.SMTP_PASS || '',
  },
  tls: {
    rejectUnauthorized: false,
  },
  debug: true,
  logger: true,
});

console.log('🔄 Verifying SMTP connection...\n');

transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP Verification FAILED!');
    console.error('Error:', error.message);
    console.error('Error Code:', (error as any).code);
    console.error('Response Code:', (error as any).responseCode);
    console.error('Response:', (error as any).response);
    console.error('Command:', (error as any).command);
    console.log('\n💡 Troubleshooting Tips:');
    console.log('1. Verify your password is correct in Hostinger email settings');
    console.log('2. Make sure SMTP access is enabled in Hostinger control panel');
    console.log('3. Check if your password contains special characters that need escaping');
    console.log('4. Try resetting your email password in Hostinger');
    console.log('5. Contact Hostinger support to verify SMTP access is enabled');
    process.exit(1);
  } else {
    console.log('✅ SMTP Verification SUCCESSFUL!');
    console.log('✅ Transporter is ready to send emails');
    
    // Try sending a test email
    console.log('\n📧 Attempting to send test email...');
    const testMailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'B4U Esports'}" <${process.env.SMTP_FROM || 'info@b4uesports.com'}>`,
      to: process.env.SMTP_USER,
      subject: 'SMTP Test - B4U Esports',
      html: `
        <h2>✅ SMTP Configuration Test Successful!</h2>
        <p>This is a test email to verify SMTP configuration.</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        <p><strong>Status:</strong> All systems operational</p>
      `,
    };

    transporter.sendMail(testMailOptions, (err, info) => {
      if (err) {
        console.error('❌ Test email sending failed:', err.message);
        process.exit(1);
      } else {
        console.log('✅ Test email sent successfully!');
        console.log('Message ID:', info.messageId);
        process.exit(0);
      }
    });
  }
});
