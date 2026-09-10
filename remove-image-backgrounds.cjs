const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const REMOVE_BG_API_KEY = 'D6LHj3QrSSmYiXJkr2NpjYs2';

// Images to process - mapping old URL to local filename
const images = [
  {
    url: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png',
    outputName: 'robux-logo.png',
    description: 'Robux Logo'
  },
  {
    url: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020478-1.jpg',
    outputName: 'newstate-logo.png',
    description: 'NEW STATE Logo'
  },
  {
    url: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020480.jpg',
    outputName: 'freefire-diamond-logo.png',
    description: 'FREE FIRE Diamond Logo'
  },
  {
    url: 'https://b4uesports.com/wp-content/uploads/2025/04/1000048821.png',
    outputName: 'freefire-diamond-package.png',
    description: 'FREE FIRE Diamond Package Image'
  },
  {
    url: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034679.png',
    outputName: 'tiktok-coins-logo.png',
    description: 'TikTok Coins Logo'
  },
  {
    url: 'https://b4uesports.com/wp-content/uploads/2026/03/tiktok-coin.jpg',
    outputName: 'tiktok-coins-package.png',
    description: 'TikTok Coins Package Image'
  },
  {
    url: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png',
    outputName: 'tiktok-followers-package.png',
    description: 'TikTok Followers Package Image'
  },
  {
    url: 'https://b4uesports.com/wp-content/uploads/2025/04/1000077314.png',
    outputName: 'tiktok-views-package.png',
    description: 'TikTok Monetization Views Package Image'
  },
  {
    url: 'https://b4uesports.com/wp-content/uploads/2025/04/1000077305.png',
    outputName: 'youtube-subscribers-package.png',
    description: 'YouTube Subscribers Package Image'
  },
  {
    url: 'https://b4uesports.com/wp-content/uploads/2026/03/youtube-wt.jpg',
    outputName: 'youtube-watchtime-package.png',
    description: 'YouTube Watch Time Package Image'
  },
  {
    url: 'https://b4uesports.com/wp-content/uploads/2026/03/facebook-logo.avif',
    outputName: 'facebook-logo.png',
    description: 'Facebook Logo'
  },
  {
    url: 'https://b4uesports.com/wp-content/uploads/2026/03/facebook-followers.jpg',
    outputName: 'facebook-followers-package.png',
    description: 'Facebook Followers Package Image'
  },
  {
    url: 'https://b4uesports.com/wp-content/uploads/2026/03/instagram-logo.jpg',
    outputName: 'instagram-logo.png',
    description: 'Instagram Logo'
  },
  {
    url: 'https://b4uesports.com/wp-content/uploads/2026/03/instagram-followers.jpg',
    outputName: 'instagram-followers-package.png',
    description: 'Instagram Followers Package Image'
  },
  {
    url: 'https://b4uesports.com/wp-content/uploads/2026/03/netflix-logo.png',
    outputName: 'netflix-logo.png',
    description: 'Netflix Logo'
  },
  {
    url: 'https://b4uesports.com/wp-content/uploads/2026/03/canva.jpg',
    outputName: 'canva-logo.png',
    description: 'Canva Logo'
  }
];

// Create output directories if they don't exist
const outputDir = path.join(process.cwd(), 'processed-images');
const publicImagesDir = path.join(process.cwd(), 'client', 'public', 'images');
for (const dir of [outputDir, publicImagesDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

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
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image_file"; filename="image.png"\r\nContent-Type: image/png\r\n\r\n`),
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
          // Try to parse error message
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

// Main processing function
async function processImages() {
  console.log('🎨 Starting image background removal process...\n');
  console.log(`📁 Output directory: ${outputDir}\n`);

  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    console.log(`[${i + 1}/${images.length}] Processing: ${image.description}`);
    console.log(`   URL: ${image.url}`);

    try {
      // Download image
      console.log('   ⬇️  Downloading image...');
      const imageBuffer = await downloadImage(image.url);
      console.log(`   ✓ Downloaded (${(imageBuffer.length / 1024).toFixed(2)} KB)`);

      // Remove background
      console.log('   🧹 Removing background with remove.bg API...');
      const processedBuffer = await removeBackground(imageBuffer);
      console.log(`   ✓ Background removed (${(processedBuffer.length / 1024).toFixed(2)} KB)`);

      // Save to disk in both processed place and public assets
      const outputPath = path.join(outputDir, image.outputName);
      const publicOutputPath = path.join(publicImagesDir, image.outputName);
      fs.writeFileSync(outputPath, processedBuffer);
      fs.writeFileSync(publicOutputPath, processedBuffer);
      console.log(`   💾 Saved to: ${outputPath}`);
      console.log(`   💾 Also saved to: ${publicOutputPath}`);
      console.log(`   ✅ SUCCESS\n`);

      successCount++;
    } catch (error) {
      console.log(`   ❌ FAILED: ${error.message}\n`);
      failureCount++;
    }

    // Add a small delay between requests to avoid rate limiting
    if (i < images.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 PROCESSING SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successfully processed: ${successCount} images`);
  console.log(`❌ Failed: ${failureCount} images`);
  console.log(`📁 Output location: ${outputDir}`);
  console.log('='.repeat(60));

  if (successCount === images.length) {
    console.log('\n🎉 All images processed successfully!');
    console.log('Next steps:');
    console.log('1. Upload the processed PNG files from the processed-images folder to your CDN');
    console.log('2. Update the image URLs in your code with the new CDN paths');
    console.log('3. Commit and push the changes to GitHub');
  }
}

// Run the script
processImages().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
