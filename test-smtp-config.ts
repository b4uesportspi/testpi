import dotenv from 'dotenv';
import { sendProfileUpdateEmail } from './server/services/email.js';

// Load environment variables
dotenv.config();

async function testSMTPConfiguration() {
  console.log('Testing SMTP configuration with environment variables...\n');
  
  // Check environment variables
  const requiredEnvVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missingEnvVars.length > 0) {
    console.log('⚠️  Missing environment variables:', missingEnvVars);
  } else {
    console.log('✅ All required SMTP environment variables are present');
  }
  
  // Show current SMTP configuration
  console.log('\nCurrent SMTP Configuration:');
  console.log('SMTP_HOST:', process.env.SMTP_HOST || 'Not set');
  console.log('SMTP_PORT:', process.env.SMTP_PORT || 'Not set');
  console.log('SMTP_USER:', process.env.SMTP_USER || 'Not set');
  console.log('SMTP_FROM:', process.env.SMTP_FROM || 'Not set');
  console.log('SMTP_FROM_NAME:', process.env.SMTP_FROM_NAME || 'Not set');
  
  // Test sending an email
  console.log('\n--- Testing Profile Update Email ---');
  try {
    const result = await sendProfileUpdateEmail({
      to: process.env.ADMIN_EMAIL || 'info@b4uesports.com',
      username: 'TestUser',
      profileData: {
        email: 'testuser@b4uesports.com',
        phone: '+97517875099',
        country: 'Bhutan',
        isProfileVerified: true
      }
    });
    
    if (result) {
      console.log('✅ Profile update email sent successfully!');
    } else {
      console.log('❌ Failed to send profile update email');
    }
  } catch (error) {
    console.error('Error sending profile update email:', error);
  }
  
  console.log('\n📝 Note: Check Vercel logs for production deployment to see if emails are being sent correctly.');
  console.log('📝 Make sure to redeploy after setting environment variables in Vercel Dashboard.');
}

testSMTPConfiguration();