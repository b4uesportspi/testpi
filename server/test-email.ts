import { sendProfileUpdateEmail } from './services/email.js';

async function testProfileUpdateEmail() {
  try {
    console.log('Testing profile update email...');
    
    const result = await sendProfileUpdateEmail({
      to: 'test@example.com',
      username: 'testuser',
      profileData: {
        email: 'test@example.com',
        phone: '+1234567890',
        country: 'Test Country',
        isProfileVerified: true
      }
    });
    
    console.log('Email send result:', result);
    if (result) {
      console.log('✅ Profile update email sent successfully!');
    } else {
      console.log('❌ Failed to send profile update email');
    }
  } catch (error) {
    console.error('Error testing profile update email:', error);
  }
}

testProfileUpdateEmail();