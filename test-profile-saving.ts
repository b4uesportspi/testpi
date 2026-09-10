import dotenv from 'dotenv';
import { storage } from './server/storage.js';

// Load environment variables
dotenv.config();

async function testProfileSaving() {
  console.log('Testing profile saving functionality...');
  
  try {
    // Let's try to create a test user first
    console.log('Creating a test user...');
    const testUser = await storage.createUser({
      piUID: 'test_pi_uid_' + Date.now(),
      username: 'testuser',
      email: '',
      phone: '',
      country: 'Test Country',
      language: 'en',
      walletAddress: 'test_wallet_address',
      gameAccounts: null,
      referralCode: null,
      passphrase: null,
      isActive: true,
      isProfileVerified: false
    });
    
    console.log('Test user created:', testUser.id);
    
    // Try to update the user's profile
    console.log('Updating user profile...');
    const updatedUser = await storage.updateUser(testUser.id, {
      email: 'test@example.com',
      phone: '+1234567890',
      country: 'Updated Test Country',
      language: 'es',
      isProfileVerified: true
    });
    
    if (updatedUser) {
      console.log('✅ Profile updated successfully!');
      console.log('Updated user:', {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        phone: updatedUser.phone,
        country: updatedUser.country,
        language: updatedUser.language,
        isProfileVerified: updatedUser.isProfileVerified
      });
      
      // Verify the update by fetching the user again
      console.log('Verifying update...');
      const verifiedUser = await storage.getUser(testUser.id);
      if (verifiedUser) {
        console.log('✅ Profile verified successfully!');
        console.log('Verified user:', {
          id: verifiedUser.id,
          username: verifiedUser.username,
          email: verifiedUser.email,
          phone: verifiedUser.phone,
          country: verifiedUser.country,
          language: verifiedUser.language,
          isProfileVerified: verifiedUser.isProfileVerified
        });
        
        if (verifiedUser.email === 'test@example.com' && 
            verifiedUser.phone === '+1234567890' && 
            verifiedUser.isProfileVerified === true) {
          console.log('✅ Profile saving is working correctly!');
        } else {
          console.log('❌ Profile data mismatch');
        }
      } else {
        console.log('❌ Failed to verify profile update');
      }
    } else {
      console.log('❌ Failed to update profile');
    }
  } catch (error) {
    console.error('Error testing profile saving:', error);
  }
}

testProfileSaving();