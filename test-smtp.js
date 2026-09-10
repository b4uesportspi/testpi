import dotenv from 'dotenv';
dotenv.config();

import nodemailer from 'nodemailer';

async function testSMTP() {
  console.log('Testing SMTP configuration...');
  
  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.hostinger.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: parseInt(process.env.SMTP_PORT || '587', 10) === 465,
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
    
    // Verify transporter
    console.log('Verifying transporter...');
    await transporter.verify();
    console.log('✅ SMTP transporter verified successfully');
    
    // Send test email
    console.log('Sending test email...');
    const info = await transporter.sendMail({
      from: `"Test" <${process.env.SMTP_FROM || 'info@b4uesports.com'}>`,
      to: process.env.SMTP_FROM || 'info@b4uesports.com',
      subject: 'Test Email from B4U Esports',
      text: 'This is a test email to verify SMTP configuration',
      html: '<h1>Test Email</h1><p>This is a test email to verify SMTP configuration</p>'
    });
    
    console.log('✅ Test email sent successfully');
    console.log('Message ID:', info.messageId);
    console.log('Accepted:', info.accepted);
    console.log('Rejected:', info.rejected);
    
  } catch (error) {
    console.error('❌ SMTP test failed:', error);
  }
}

testSMTP().then(() => {
  console.log('SMTP test completed');
}).catch((error) => {
  console.error('SMTP test failed:', error);
});