/**
 * Check all packages and their active status
 * Run this to verify which packages are visible/hidden
 */

const API_URL = 'http://localhost:3000/api/packages';

async function checkPackages() {
  try {
    console.log('📦 Fetching all packages...\n');
    
    const response = await fetch(API_URL);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const packages = await response.json();
    
    console.log(`Found ${packages.length} total packages\n`);
    console.log('='.repeat(80));
    
    // Group by game
    const pubgPackages = packages.filter(p => p.game === 'PUBG');
    const mlbbPackages = packages.filter(p => p.game === 'MLBB');
    const cocPackages = packages.filter(p => p.game === 'COC');
    
    // Display PUBG packages
    if (pubgPackages.length > 0) {
      console.log('\n🎮 PUBG Mobile Packages:');
      console.log('-'.repeat(80));
      pubgPackages.forEach(pkg => {
        const status = pkg.isActive ? '✅ ACTIVE' : '❌ HIDDEN';
        console.log(`${status} | ${pkg.name.padEnd(15)} | ${pkg.usdtValue} USDT | ID: ${pkg.id}`);
      });
    }
    
    // Display MLBB packages
    if (mlbbPackages.length > 0) {
      console.log('\n💎 Mobile Legends Packages:');
      console.log('-'.repeat(80));
      mlbbPackages.forEach(pkg => {
        const status = pkg.isActive ? '✅ ACTIVE' : '❌ HIDDEN';
        console.log(`${status} | ${pkg.name.padEnd(15)} | ${pkg.usdtValue} USDT | ID: ${pkg.id}`);
      });
    }
    
    // Display COC packages
    if (cocPackages.length > 0) {
      console.log('\n⚔️ Clash of Clans Packages:');
      console.log('-'.repeat(80));
      cocPackages.forEach(pkg => {
        const status = pkg.isActive ? '✅ ACTIVE' : '❌ HIDDEN';
        console.log(`${status} | ${pkg.name.padEnd(15)} | ${pkg.usdtValue} USDT | ID: ${pkg.id}`);
      });
    }
    
    console.log('\n' + '='.repeat(80));
    
    // Summary
    const activeCount = packages.filter(p => p.isActive).length;
    const hiddenCount = packages.filter(p => !p.isActive).length;
    
    console.log(`\n📊 Summary:`);
    console.log(`   Active packages: ${activeCount}`);
    console.log(`   Hidden packages: ${hiddenCount}`);
    console.log(`   Total packages: ${packages.length}`);
    
    // Check specifically for 0.06 UC
    const testPackage = packages.find(p => p.name === '0.06 UC');
    if (testPackage) {
      console.log(`\n🔍 0.06 UC Package Status:`);
      console.log(`   Status: ${testPackage.isActive ? '✅ VISIBLE' : '❌ HIDDEN'}`);
      console.log(`   ID: ${testPackage.id}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure your server is running on http://localhost:3000');
    console.log('   Run: npm run dev');
  }
}

checkPackages();
