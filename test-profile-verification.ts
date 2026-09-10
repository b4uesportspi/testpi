import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Mock storage functions for testing
const mockUsers: any[] = [
  {
    id: 'test-user-1',
    email: '',
    phone: '',
    isProfileVerified: false,
    username: 'TestUser1'
  },
  {
    id: 'test-user-2',
    email: 'test2@example.com',
    phone: '',
    isProfileVerified: false,
    username: 'TestUser2'
  },
  {
    id: 'test-user-3',
    email: '',
    phone: '+1234567890',
    isProfileVerified: false,
    username: 'TestUser3'
  }
];

async function mockUpdateUser(userId: string, updateData: any) {
  const user = mockUsers.find(u => u.id === userId);
  if (!user) return undefined;
  
  // Apply updates
  Object.assign(user, updateData);
  
  // Check verification status based on our new logic
  const shouldMarkAsVerified = user.email && user.phone && 
                              user.email.trim() !== '' && user.phone.trim() !== '';
  
  if (shouldMarkAsVerified && !user.isProfileVerified) {
    user.isProfileVerified = true;
  } else if (!shouldMarkAsVerified && user.isProfileVerified) {
    user.isProfileVerified = false;
  }
  
  return user;
}

async function testProfileVerification() {
  console.log('Testing profile verification logic...\n');
  
  // Test case 1: User with no email or phone
  console.log('Test 1: User with no email or phone');
  let user = await mockUpdateUser('test-user-1', { email: '', phone: '' });
  console.log(`  Result: isProfileVerified = ${user?.isProfileVerified}`);
  console.log(`  Expected: false\n`);
  
  // Test case 2: User adds email only
  console.log('Test 2: User adds email only');
  user = await mockUpdateUser('test-user-1', { email: 'newuser@example.com' });
  console.log(`  Result: isProfileVerified = ${user?.isProfileVerified}`);
  console.log(`  Expected: false\n`);
  
  // Test case 3: User adds phone only (starting from empty email and phone)
  console.log('Test 3: User adds phone only');
  const user3 = mockUsers.find(u => u.id === 'test-user-1');
  user3.email = ''; // Reset to empty
  user3.phone = ''; // Reset to empty
  user = await mockUpdateUser('test-user-1', { phone: '+1234567890' });
  console.log(`  Result: isProfileVerified = ${user?.isProfileVerified}`);
  console.log(`  Expected: false\n`);
  
  // Test case 4: User adds both email and phone
  console.log('Test 4: User adds both email and phone');
  user = await mockUpdateUser('test-user-1', { email: 'complete@example.com', phone: '+0987654321' });
  console.log(`  Result: isProfileVerified = ${user?.isProfileVerified}`);
  console.log(`  Expected: true\n`);
  
  // Test case 5: User with existing email adds phone
  console.log('Test 5: User with existing email adds phone');
  user = await mockUpdateUser('test-user-2', { phone: '+1111111111' });
  console.log(`  Result: isProfileVerified = ${user?.isProfileVerified}`);
  console.log(`  Expected: true\n`);
  
  // Test case 6: User with existing phone adds email
  console.log('Test 6: User with existing phone adds email');
  user = await mockUpdateUser('test-user-3', { email: 'user3@example.com' });
  console.log(`  Result: isProfileVerified = ${user?.isProfileVerified}`);
  console.log(`  Expected: true\n`);
  
  // Test case 7: User removes email
  console.log('Test 7: User removes email');
  user = await mockUpdateUser('test-user-2', { email: '' });
  console.log(`  Result: isProfileVerified = ${user?.isProfileVerified}`);
  console.log(`  Expected: false\n`);
  
  console.log('Profile verification logic test completed!');
}

testProfileVerification();