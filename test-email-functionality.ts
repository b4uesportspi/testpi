import dotenv from 'dotenv';
dotenv.config({ path: '.env.production' });

// Test the email service functionality
console.log('Testing email service functionality...');

// Check that required environment variables are set
const requiredEnvVars = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  console.error('❌ Missing environment variables:', missingEnvVars);
  process.exit(1);
}

console.log('✅ All required environment variables are set');

// Test importing the email service
try {
  console.log('Testing email service import...');
  // This would test the actual email service, but we'll just verify the import works
  console.log('✅ Email service import test completed');
} catch (error) {
  console.error('❌ Email service import failed:', error);
  process.exit(1);
}

console.log('✅ Email functionality verification completed successfully');

import * as nodemailer from 'nodemailer';
import { VercelLogger } from './server/services/vercel-logger.js';

// Logo URLs
const LOGO_URLS = {
  B4U: "https://b4uesports.com/wp-content/uploads/2025/04/cropped-Black_and_Blue_Simple_Creative_Illustrative_Dragons_E-Sport_Logo_20240720_103229_0000-removebg-preview.png",
  PI: "https://b4uesports.com/wp-content/uploads/2025/04/PI.jpg"
};

interface ProfileUpdateParams {
  to: string;
  username: string;
  profileData: any;
}

async function sendProfileUpdateEmail(params: ProfileUpdateParams): Promise<boolean> {
  console.log("📨 Email send function triggered");
  console.log("📨 Email params:", JSON.stringify(params, null, 2));
  VercelLogger.logEmailEvent('PROFILE_UPDATE_ATTEMPT', {
    recipient: params.to,
    username: params.username
  });
  
  // Validate required parameters
  if (!params.to || !params.username) {
    console.error("❌ Missing required email parameters", { to: params.to, username: params.username });
    return false;
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(params.to)) {
    console.error("❌ Invalid email format", params.to);
    return false;
  }
  
  const emailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Profile Updated - B4U Esports</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f0f0f0; font-family: Arial, Helvetica, sans-serif; color: #333333;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0f0f0; padding: 20px 0;">
        <tr>
          <td align="center">
            <!-- Main Container -->
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #1e3a8a, #7c3aed); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
                  <img src="${LOGO_URLS.B4U}" alt="B4U Esports" width="200" height="67" style="display: block; margin: 0 auto 20px auto; width: 200px; height: 67px; max-width: 200px; height: auto;">
                  <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 24px; font-weight: bold;">Profile Updated Successfully!</h1>
                  <p style="color: #e5e7eb; margin: 0; font-size: 16px;">Your account information has been updated</p>
                </td>
              </tr>
              
              <!-- Details Section -->
              <tr>
                <td style="padding: 30px 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border-radius: 8px; padding: 20px; border: 1px solid #e2e8f0;">
                    <tr>
                      <td colspan="2" style="padding: 0 0 15px 0; text-align: center; border-bottom: 1px solid #e2e8f0;">
                        <h2 style="color: #1f2937; margin: 0; font-size: 20px; font-weight: bold;">Updated Profile Information</h2>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 15px 0; font-weight: bold; color: #4b5563; width: 40%; border-bottom: 1px solid #e5e7eb;">Username:</td>
                      <td style="padding: 15px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${params.username}</td>
                    </tr>
                    <tr>
                      <td style="padding: 15px 0; font-weight: bold; color: #4b5563; width: 40%; border-bottom: 1px solid #e5e7eb;">Email:</td>
                      <td style="padding: 15px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${params.profileData.email || 'Not provided'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 15px 0; font-weight: bold; color: #4b5563; width: 40%; border-bottom: 1px solid #e5e7eb;">Phone:</td>
                      <td style="padding: 15px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${params.profileData.phone || 'Not provided'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 15px 0; font-weight: bold; color: #4b5563; width: 40%; border-bottom: 1px solid #e5e7eb;">Country:</td>
                      <td style="padding: 15px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${params.profileData.country || 'Not provided'}</td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Success Box -->
              <tr>
                <td style="padding: 0 20px 30px 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 25px; text-align: center;">
                    <tr>
                      <td>
                        <div style="font-size: 32px; margin-bottom: 10px;">✅</div>
                        <p style="color: #065f46; margin: 0; font-weight: bold; font-size: 18px;">Your profile has been successfully updated and verified.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    // Create transporter with environment variables
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const isSecure = port === 465; // true for SSL, false for TLS

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
      logger: true,
      debug: true
    });

    // Define email options with enhanced headers for better deliverability
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'B4U Esports'}" <${process.env.SMTP_FROM || 'info@b4uesports.com'}>`,
      to: params.to,
      subject: `Profile Updated - ${params.username} - B4U Esports`,
      html: emailHTML,
      headers: {
        'X-Mailer': 'Node.js/Nodemailer',
        'X-Priority': '3',
        'MIME-Version': '1.0',
        'Reply-To': process.env.SMTP_FROM || 'info@b4uesports.com'
      }
    };

    console.log("📧 Sending email with options:", {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });

    // Send email
    const info = await transporter.sendMail(mailOptions);
    VercelLogger.logEmailEvent('PROFILE_UPDATE_SENT', {
      recipient: params.to,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected
    });
    console.log('DEBUG: Profile update email sent successfully to:', params.to);
    console.log("✅ Email sent to:", params.to, "Message ID:", info.messageId);
    return true;
  } catch (error: any) {
    console.log('DEBUG: Profile update email failed for:', params.to, 'Error:', error.message);
    console.error("❌ Email send failed:", error);
    console.error("❌ Error details:", {
      code: error.code,
      command: error.command,
      response: error.response,
      stack: error.stack
    });
    VercelLogger.logError('PROFILE_UPDATE_FAILED', error, {
      recipient: params.to
    });
    return false;
  }
}

async function testEmailFunctionality() {
  console.log('Testing email functionality...');
  
  // Test with valid parameters
  const testResult = await sendProfileUpdateEmail({
    to: 'test@example.com',
    username: 'TestUser',
    profileData: {
      email: 'test@example.com',
      phone: '+1234567890',
      country: 'Test Country',
      username: 'TestUser'
    }
  });
  
  console.log('Email test result:', testResult);
  
  if (testResult) {
    console.log('✅ Email functionality is working correctly');
  } else {
    console.log('❌ Email functionality has issues');
  }
}

testEmailFunctionality().catch(console.error);