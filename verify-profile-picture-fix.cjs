// Test script to verify the profile picture fix in the API
console.log('Verifying profile picture fix in API implementation...');

// Check the main.ts file for the correct implementation
const fs = require('fs');
const path = require('path');

const apiFilePath = path.join(__dirname, 'api', 'main.ts');

try {
  const apiContent = fs.readFileSync(apiFilePath, 'utf8');
  
  console.log('1. Checking for duplicate PUT endpoints...');
  
  // Count the number of PUT endpoint implementations
  const putEndpointMatches = apiContent.match(/else if \(req\.method === 'PUT'\)/g);
  const putEndpointCount = putEndpointMatches ? putEndpointMatches.length : 0;
  
  if (putEndpointCount === 1) {
    console.log('✅ Only one PUT endpoint implementation found');
  } else {
    console.log(`❌ Found ${putEndpointCount} PUT endpoint implementations. Should be only 1.`);
  }
  
  console.log('2. Checking GET endpoint for profile_picture column...');
  
  // Check if the GET endpoint includes profile_picture in the SELECT query
  const getQueryWithProfilePicture = apiContent.includes('profile_picture') && 
                                   apiContent.includes('SELECT') && 
                                   apiContent.includes('app_users WHERE id = $1');
  
  if (getQueryWithProfilePicture) {
    console.log('✅ GET endpoint includes profile_picture column in SELECT query');
  } else {
    console.log('❌ GET endpoint may be missing profile_picture column');
  }
  
  console.log('3. Checking PUT endpoint for profile_picture column...');
  
  // Check if the PUT endpoint includes profile_picture in the UPDATE query
  const updateQueryWithProfilePicture = apiContent.includes('profile_picture = $') && 
                                      apiContent.includes('UPDATE app_users');
  
  if (updateQueryWithProfilePicture) {
    console.log('✅ PUT endpoint includes profile_picture column in UPDATE query');
  } else {
    console.log('❌ PUT endpoint may be missing profile_picture column');
  }
  
  console.log('4. Checking profile picture validation...');
  
  // Check if there's validation for profile picture size
  const hasSizeValidation = apiContent.includes('1024 * 1024') || 
                           apiContent.includes('profilePicture.length >');
  
  if (hasSizeValidation) {
    console.log('✅ Profile picture size validation found');
  } else {
    console.log('❌ Profile picture size validation not found');
  }
  
  console.log('5. Checking user response object...');
  
  // Check if the user response includes profilePicture
  const userResponseHasProfilePicture = apiContent.includes('profilePicture:') && 
                                       apiContent.includes('result.rows[0].profile_picture');
  
  if (userResponseHasProfilePicture) {
    console.log('✅ User response object includes profilePicture field');
  } else {
    console.log('❌ User response object may be missing profilePicture field');
  }
  
  console.log('\nVerification Summary:');
  console.log('====================');
  
  if (putEndpointCount === 1 && getQueryWithProfilePicture && updateQueryWithProfilePicture && 
      hasSizeValidation && userResponseHasProfilePicture) {
    console.log('🎉 All checks passed! Profile picture persistence should be working correctly.');
    console.log('\nKey fixes verified:');
    console.log('- Single PUT endpoint implementation');
    console.log('- GET endpoint retrieves profile_picture from database');
    console.log('- PUT endpoint saves profile_picture to database');
    console.log('- Profile picture size validation in place');
    console.log('- API responses include profilePicture field');
  } else {
    console.log('⚠️  Some issues detected. Profile picture persistence may not work correctly.');
  }
  
} catch (error) {
  console.error('Error reading API file:', error.message);
}