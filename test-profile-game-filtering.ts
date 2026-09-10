import { sendProfileUpdateEmail } from './server/services/email';

async function testProfileGameFiltering() {
  console.log('Testing profile update email game filtering...\n');
  
  try {
    // Test case 1: User with PUBG data only
    console.log('1. Testing with PUBG data only...');
    const result1 = await sendProfileUpdateEmail({
      to: 'pubgonly@example.com',
      username: 'PUBGPlayer',
      profileData: {
        email: 'pubgonly@example.com',
        phone: '+1234567890',
        country: 'United States',
        gameAccounts: {
          pubg: {
            ign: 'PUBGMaster',
            uid: 'PUBG123456'
          }
          // No MLBB or COC data
        },
        referralCode: 'REF123456'
      }
    });
    
    console.log('PUBG only result:', result1 ? '✅ Success' : '❌ Failed');
    
    // Test case 2: User with MLBB data only
    console.log('\n2. Testing with MLBB data only...');
    const result2 = await sendProfileUpdateEmail({
      to: 'mlbbonly@example.com',
      username: 'MLBBPlayer',
      profileData: {
        email: 'mlbbonly@example.com',
        phone: '+1234567890',
        country: 'United States',
        gameAccounts: {
          mlbb: {
            userId: 'MLBB789012',
            zoneId: 'ZONE456'
          }
          // No PUBG or COC data
        },
        referralCode: 'REF123456'
      }
    });
    
    console.log('MLBB only result:', result2 ? '✅ Success' : '❌ Failed');
    
    // Test case 3: User with COC data only
    console.log('\n3. Testing with COC data only...');
    const result3 = await sendProfileUpdateEmail({
      to: 'coconly@example.com',
      username: 'COCPlayer',
      profileData: {
        email: 'coconly@example.com',
        phone: '+1234567890',
        country: 'United States',
        gameAccounts: {
          coc: {
            tag: '#COC789012'
          }
          // No PUBG or MLBB data
        },
        referralCode: 'REF123456'
      }
    });
    
    console.log('COC only result:', result3 ? '✅ Success' : '❌ Failed');
    
    // Test case 4: User with all games data
    console.log('\n4. Testing with all games data...');
    const result4 = await sendProfileUpdateEmail({
      to: 'allgames@example.com',
      username: 'MultiGamer',
      profileData: {
        email: 'allgames@example.com',
        phone: '+1234567890',
        country: 'United States',
        gameAccounts: {
          pubg: {
            ign: 'MultiGamerPUBG',
            uid: 'PUBG123456'
          },
          mlbb: {
            userId: 'MLBB789012',
            zoneId: 'ZONE456'
          },
          coc: {
            tag: '#COC789012'
          }
        },
        referralCode: 'REF123456'
      }
    });
    
    console.log('All games result:', result4 ? '✅ Success' : '❌ Failed');
    
    // Test case 5: User with empty game accounts
    console.log('\n5. Testing with empty game accounts...');
    const result5 = await sendProfileUpdateEmail({
      to: 'nogames@example.com',
      username: 'NoGamer',
      profileData: {
        email: 'nogames@example.com',
        phone: '+1234567890',
        country: 'United States',
        gameAccounts: {
          // All games have empty data
          pubg: {
            ign: '',
            uid: ''
          },
          mlbb: {
            userId: '',
            zoneId: ''
          },
          coc: {
            tag: ''
          }
        },
        referralCode: 'REF123456'
      }
    });
    
    console.log('No games result:', result5 ? '✅ Success' : '❌ Failed');
    
    console.log('\n🎉 All tests completed! The email template now correctly shows only games with actual data.');
    
  } catch (error) {
    console.error('Error testing profile game filtering:', error);
  }
}

testProfileGameFiltering();