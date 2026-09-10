import https from 'https';

// Test if logo URLs are accessible
async function testLogoUrls() {
  const logoUrls = {
    B4U: "https://b4uesports.com/wp-content/uploads/2025/04/cropped-Black_and_Blue_Simple_Creative_Illustrative_Dragons_E-Sport_Logo_20240720_103229_0000-removebg-preview.png",
    PI: "https://b4uesports.com/wp-content/uploads/2025/04/PI.jpg"
  };

  console.log('Testing logo URLs accessibility...\n');

  for (const [name, url] of Object.entries(logoUrls)) {
    try {
      await new Promise((resolve, reject) => {
        const req = https.get(url, (res) => {
          console.log(`${name} Logo URL Status: ${res.statusCode}`);
          if (res.statusCode === 200) {
            console.log(`✅ ${name} logo URL is accessible\n`);
          } else {
            console.log(`❌ ${name} logo URL returned status ${res.statusCode}\n`);
          }
          resolve(null);
        });
        
        req.on('error', (error) => {
          console.log(`❌ ${name} logo URL failed with error: ${error.message}\n`);
          reject(error);
        });
        
        req.end();
      });
    } catch (error) {
      console.log(`❌ ${name} logo URL test failed: ${error}\n`);
    }
  }
}

testLogoUrls();