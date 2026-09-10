/**
 * Quick script to deactivate the 0.06 UC package in the database
 * Run this once to immediately hide the test package
 */

const API_URL = 'http://localhost:3000/api/packages';

async function deactivateTestPackage() {
  try {
    console.log('Fetching packages...');
    
    // Fetch all packages
    const response = await fetch(API_URL);
    const packages = await response.json();
    
    // Find the 0.06 UC package
    const testPackage = packages.find(function(pkg) { return pkg.name === '0.06 UC' && pkg.game === 'PUBG'; });
    
    if (!testPackage) {
      console.error('❌ 0.06 UC package not found!');
      return;
    }
    
    console.log(`Found 0.06 UC package: ${testPackage.id}`);
    console.log(`Current status: ${testPackage.isActive ? 'ACTIVE' : 'INACTIVE'}`);
    
    if (!testPackage.isActive) {
      console.log('✅ Package is already deactivated!');
      return;
    }
    
    // Deactivate the package
    console.log('\nDeactivating package...');
    const toggleResponse = await fetch(`${API_URL}/${testPackage.id}/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        isActive: false
      })
    });
    
    const result = await toggleResponse.json();
    
    if (toggleResponse.ok) {
      console.log('✅ SUCCESS! 0.06 UC package has been deactivated');
      console.log(`Package name: ${result.package.name}`);
      console.log(`New status: ${result.package.isActive ? 'ACTIVE' : 'INACTIVE'}`);
    } else {
      console.error('❌ Failed to deactivate package:', result.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nMake sure your server is running on http://localhost:3000');
  }
}

// Run the script
deactivateTestPackage();
