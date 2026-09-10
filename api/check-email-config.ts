import { VercelRequest, VercelResponse } from '@vercel/node';
import dotenv from 'dotenv';
dotenv.config();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    console.log('📧 Checking Email Configuration in Vercel...');
    
    // Check required environment variables
    const requiredEnvVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    const smtpConfig = {
      SMTP_HOST: process.env.SMTP_HOST || '❌ Not set',
      SMTP_PORT: process.env.SMTP_PORT || '❌ Not set',
      SMTP_USER: process.env.SMTP_USER ? '✅ Set (value hidden)' : '❌ Not set',
      SMTP_PASS: process.env.SMTP_PASS ? '✅ Set (value hidden)' : '❌ Not set',
      SMTP_FROM: process.env.SMTP_FROM || '❌ Not set',
      SMTP_FROM_NAME: process.env.SMTP_FROM_NAME || 'Not set',
      SMTP_SECURE: process.env.SMTP_SECURE || 'Not set'
    };
    
    console.log('📧 Email Configuration Status:', JSON.stringify(smtpConfig, null, 2));
    
    if (missingEnvVars.length > 0) {
      console.warn('⚠️  Missing SMTP environment variables:', missingEnvVars);
    } else {
      console.log('✅ All required SMTP environment variables are present');
    }
    
    // Parse port and security settings
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const isSecure = port === 465;
    const expectedSecure = process.env.SMTP_SECURE === 'true';
    
    console.log('📧 Port Configuration:');
    console.log('   Port:', port);
    console.log('   Is Secure (port 465):', isSecure);
    console.log('   SMTP_SECURE env var:', process.env.SMTP_SECURE);
    console.log('   Expected Secure Setting:', expectedSecure);
    
    // Recommendations
    const recommendations: string[] = [];
    
    if (port === 465 && !expectedSecure) {
      recommendations.push('⚠️  For port 465, set SMTP_SECURE=true');
    } else if (port === 587 && expectedSecure) {
      recommendations.push('⚠️  For port 587, set SMTP_SECURE=false');
    }
    
    if (missingEnvVars.length > 0) {
      recommendations.push(`❌ Set missing environment variables: ${missingEnvVars.join(', ')}`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ Configuration looks good');
    }
    
    console.log('📧 Recommendations:', recommendations.join('; '));
    
    return res.status(200).json({
      success: true,
      smtpConfig,
      missingEnvVars,
      portConfiguration: {
        port,
        isSecure,
        expectedSecure
      },
      recommendations,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Email configuration check failed:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}