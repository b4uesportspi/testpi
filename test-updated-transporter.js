import { getTransporter } from './dist/server/services/email.js';

async function testTransporter() {
  try {
    console.log('🔍 Testing updated transporter configuration...');
    
    const transporter = getTransporter();
    console.log('📧 Transporter created successfully');
    
    // Verify SMTP connection
    console.log('📧 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!');
    
    console.log('✅ Transporter test completed successfully');
  } catch (error) {
    console.error('❌ Transporter test failed:', error);
  }
}

testTransporter().catch(console.error);