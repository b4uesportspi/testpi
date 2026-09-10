const fs = require('fs');
const path = require('path');

// Read the main.ts file
const filePath = path.join(__dirname, 'api', 'main.ts');
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing duplicate PUT endpoint issue...');

// Find the positions of both PUT endpoint implementations
const firstPutMatch = content.indexOf("} else if (req.method === 'PUT') {", 400);
const secondPutMatch = content.indexOf("} else if (req.method === 'PUT') {", firstPutMatch + 1);

if (firstPutMatch !== -1 && secondPutMatch !== -1) {
  console.log(`Found first PUT endpoint at position: ${firstPutMatch}`);
  console.log(`Found second PUT endpoint at position: ${secondPutMatch}`);
  
  // Find the end of the first PUT endpoint implementation
  // Look for the closing brace followed by the second PUT endpoint
  const firstPutEnd = content.indexOf("        } else if (req.method === 'PUT') {", firstPutMatch);
  
  if (firstPutEnd !== -1) {
    // Extract the content to remove (from first PUT to just before second PUT)
    const contentToRemove = content.substring(firstPutMatch, firstPutEnd);
    console.log(`Content to remove (${contentToRemove.length} characters):\n${contentToRemove.substring(0, 200)}...`);
    
    // Remove the first PUT endpoint
    content = content.replace(contentToRemove, '');
    
    // Write the fixed content back to the file
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Successfully removed duplicate PUT endpoint');
  } else {
    console.log('❌ Could not find the end of the first PUT endpoint');
  }
} else {
  console.log('❌ Could not find both PUT endpoint implementations');
}

// Verify the fix
const updatedContent = fs.readFileSync(filePath, 'utf8');
const putMatches = [...updatedContent.matchAll(/} else if \(req\.method === 'PUT'\)/g)];
console.log(`\nVerification: Found ${putMatches.length} PUT endpoint implementations`);
if (putMatches.length === 1) {
  console.log('✅ Fix successful! Only one PUT endpoint remains.');
} else {
  console.log('❌ Fix unsuccessful. Please check manually.');
}