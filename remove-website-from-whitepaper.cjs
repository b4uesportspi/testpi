const fs = require('fs');
const path = require('path');

// Read the whitepaper file
const filePath = path.join(__dirname, 'client', 'public', 'documents', 'b4u-esports-whitepaper.md');
let content = fs.readFileSync(filePath, 'utf8');

console.log('Removing website link from whitepaper...');

// Find and remove the website line
const lines = content.split('\n');
const websiteLineIndex = lines.findIndex(line => line.includes('Website: [b4uesports.com]'));

if (websiteLineIndex !== -1) {
  console.log(`Found website line at index ${websiteLineIndex}: ${lines[websiteLineIndex]}`);
  lines.splice(websiteLineIndex, 1);
  
  // Join the lines back together
  const updatedContent = lines.join('\n');
  
  // Write the updated content back to the file
  fs.writeFileSync(filePath, updatedContent, 'utf8');
  console.log('✅ Successfully removed website link from whitepaper');
} else {
  console.log('❌ Website line not found in whitepaper');
}

// Verify the fix
const updatedContent = fs.readFileSync(filePath, 'utf8');
const hasWebsiteLink = updatedContent.includes('b4uesports.com');
console.log(`\nVerification: Website link removed = ${!hasWebsiteLink}`);
if (!hasWebsiteLink) {
  console.log('✅ Fix successful! Website link has been removed.');
} else {
  console.log('❌ Fix unsuccessful. Please check manually.');
}