const fs = require('fs');
const path = require('path');

// Function to recursively get all files in a directory
function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  
  arrayOfFiles = arrayOfFiles || [];
  
  files.forEach(function(file) {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  });
  
  return arrayOfFiles;
}

// Function to remove b4uesports.com links from a file
function removeB4UEsportsLinks(filePath) {
  try {
    // Only process text-based files
    const textExtensions = ['.md', '.ts', '.tsx', '.js', '.jsx', '.html', '.css', '.scss', '.json', '.txt'];
    const ext = path.extname(filePath).toLowerCase();
    
    if (!textExtensions.includes(ext)) {
      return false;
    }
    
    // Read the file content
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if the file contains b4uesports.com links
    if (!content.includes('b4uesports.com')) {
      return false;
    }
    
    console.log(`Processing file: ${filePath}`);
    
    // Remove website links but keep email addresses
    // Remove full website URLs
    content = content.replace(/https:\/\/b4uesports\.com[^\s"'>)"]*/g, '');
    
    // Remove website links in markdown format
    content = content.replace(/\[b4uesports\.com\]\(https:\/\/b4uesports\.com[^\)]*\)/g, '');
    
    // Remove website links in HTML href attributes (but keep admin links for now)
    content = content.replace(/href="https:\/\/b4uesports\.com(?!\/admin)[^"]*"/g, 'href="#"');
    
    // Remove image URLs from b4uesports.com
    content = content.replace(/src="https:\/\/b4uesports\.com[^"]*"/g, 'src="#"');
    
    // Remove powered by B4U Esports text with logo
    content = content.replace(/<p[^>]*>Powered by <img[^>]*b4uesports\.com[^>]*>.*?<\/p>/g, '');
    
    // Remove "visit our website" text
    content = content.replace(/please visit our website or contact/gi, 'please contact');
    
    // Remove website contact line but keep email and phone
    content = content.replace(/- Website:.*b4uesports\.com.*/gi, '');
    
    // Remove go to admin panel links (these are external links)
    content = content.replace(/<a[^>]*href="https:\/\/b4uesports\.com\/admin[^>]*>Go to Admin Panel<\/a>/gi, '');
    
    // Write the updated content back to the file
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}: ${error.message}`);
    return false;
  }
}

// Main function
function main() {
  console.log('Removing b4uesports.com external links from project...');
  
  // Get all files in the project
  const allFiles = getAllFiles('.', []);
  
  let updatedFiles = 0;
  
  // Process each file
  allFiles.forEach(filePath => {
    if (removeB4UEsportsLinks(filePath)) {
      updatedFiles++;
    }
  });
  
  console.log(`\n✅ Completed! Updated ${updatedFiles} files.`);
  console.log('All external b4uesports.com links have been removed while preserving:');
  console.log('- Email addresses (info@b4uesports.com)');
  console.log('- Phone numbers');
  console.log('- Social media links');
  console.log('- Internal links (like admin panel - replaced with #)');
}

// Run the script
main();