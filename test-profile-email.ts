import dotenv from 'dotenv';
import { sendProfileUpdateEmail } from './server/services/email.ts';

// Load environment variables
dotenv.config();

async function testProfileEmail() {
  console.log('Testing profile update email functionality with Hostinger SMTP...');
  
  try {
    console.log('Sending test profile update email...');
    
    const result = await sendProfileUpdateEmail({
      to: 'info@b4uesports.com',
      username: 'Test User',
      profileData: {
        email: 'test@b4uesports.com',
        phone: '+1234567890',
        country: 'Bhutan',
        gameAccounts: {
          pubg: {
            ign: 'TestPlayer',
            uid: '123456'
          },
          mlbb: {
            userId: 'MLBB123',
            zoneId: 'ZONE456'
          }
        },
        referralCode: 'TEST123456'
      }
    });
    
    if (result) {
      console.log('✅ Profile update email sent successfully!');
    } else {
      console.log('❌ Failed to send profile update email');
    }
  } catch (error) {
    console.error('Error sending profile update email:', error);
    console.log('❌ Failed to send profile update email');
  }
}

testProfileEmail();