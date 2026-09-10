import { VercelRequest, VercelResponse } from '@vercel/node';
import dotenv from 'dotenv';
dotenv.config();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests for security
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Simple auth - check for debug token in query params
  const debugToken = req.query.token;
  const expectedToken = process.env.DEBUG_TOKEN;
  
  if (expectedToken && debugToken !== expectedToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    console.log('📧 Starting Vercel Email Debug...');
    
    // Check environment variables
    const smtpConfig = {
      host: process.env.SMTP_HOST || 'Not set',
      port: process.env.SMTP_PORT || 'Not set',
      user: process.env.SMTP_USER || 'Not set',
      from: process.env.SMTP_FROM || 'Not set',
      secure: process.env.SMTP_SECURE || 'Not set'
    };
    
    console.log('📧 SMTP Configuration:', JSON.stringify(smtpConfig, null, 2));
    
    // Test SMTP connection using nodemailer
    const nodemailer = await import('nodemailer');
    
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const isSecure = port === 465;
    
    const transporter = nodemailer.default.createTransport({
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
    
    console.log('📧 Testing SMTP connection...');
    
    // Verify connection
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully');
    
    // Send test email
    console.log('📧 Sending test email...');
    const testEmail = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'B4U Esports'}" <${process.env.SMTP_FROM || 'info@b4uesports.com'}>`,
      to: process.env.SMTP_USER || 'info@b4uesports.com',
      subject: '📧 Vercel Email Debug Test',
      text: 'This is a test email to verify email functionality in Vercel.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e3a8a;">📧 Vercel Email Debug Test</h2>
          <p>This is a test email to verify email functionality in Vercel.</p>
          
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
          
          <p>If you receive this email, your email configuration is working correctly in Vercel.</p>
        </div>
      `
    });
    
    console.log('✅ Test email sent successfully');
    console.log('📧 Message ID:', testEmail.messageId);
    console.log('📧 Accepted:', testEmail.accepted);
    console.log('📧 Rejected:', testEmail.rejected);
    
    return res.status(200).json({
      success: true,
      message: 'Email debug completed successfully',
      smtpConfig,
      testEmail: {
        messageId: testEmail.messageId,
        accepted: testEmail.accepted,
        rejected: testEmail.rejected
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Email debug failed:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    });
  }
}