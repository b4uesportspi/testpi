const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const REMOVE_BG_API_KEY = 'D6LHj3QrSSmYiXJkr2NpjYs2';

// Function to download image
function downloadImage(url) {
  return new Promise((resolve, reject) => {
    (url.startsWith('https') ? https : http).get(url, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// Function to remove background using remove.bg API
function removeBackground(imageBuffer) {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const formData = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image_file"; filename="image.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
      imageBuffer,
      Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="type"\r\n\r\nauto\r\n--${boundary}--\r\n`)
    ]);

    const options = {
      hostname: 'api.remove.bg',
      port: 443,
      path: '/v1.0/removebg',
      method: 'POST',
      headers: {
        'X-Api-Key': REMOVE_BG_API_KEY,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(formData)
      }
    };

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(Buffer.concat(chunks));
        } else {
          try {
            const errorData = JSON.parse(Buffer.concat(chunks).toString());
            reject(new Error(`remove.bg API error: ${errorData.errors?.[0]?.title || 'Unknown error'}`));
          } catch {
            reject(new Error(`remove.bg API error: ${res.statusCode}`));
          }
        }
      });
      res.on('error', reject);
    });

    req.on('error', reject);
    req.write(formData);
    req.end();
  });
}

// Process Facebook AVIF logo
async function processFacebookLogo() {
  const outputDir = path.join(process.cwd(), 'processed-images');
  
  console.log('🎨 Processing Facebook Logo (AVIF → PNG)...\n');

  try {
    const url = 'https://b4uesports.com/wp-content/uploads/2026/03/facebook-logo.avif';
    
    console.log('Processing: Facebook Logo');
    console.log(`URL: ${url}`);
    console.log('⬇️  Downloading image...');
    const imageBuffer = await downloadImage(url);
    console.log(`✓ Downloaded (${(imageBuffer.length / 1024).toFixed(2)} KB)`);

    console.log('🧹 Removing background with remove.bg API...');
    const processedBuffer = await removeBackground(imageBuffer);
    console.log(`✓ Background removed (${(processedBuffer.length / 1024).toFixed(2)} KB)`);

    const outputPath = path.join(outputDir, 'facebook-logo.png');
    fs.writeFileSync(outputPath, processedBuffer);
    console.log(`💾 Saved to: facebook-logo.png`);
    console.log(`✅ SUCCESS\n`);

    console.log('============================================================');
    console.log('✨ All 16 images have been successfully processed!');
    console.log('============================================================');
    console.log('📁 All processed images are in: processed-images/');
    console.log('\nNext steps:');
    console.log('1. ☁️  Upload all PNG files from processed-images folder to your CDN');
    console.log('2. 🔗 Update image URLs in your code once uploaded');
    console.log('3. 📤 Commit and push to GitHub');
  } catch (error) {
    console.log(`❌ FAILED: ${error.message}\n`);
    process.exit(1);
  }
}

processFacebookLogo();
