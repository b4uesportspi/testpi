const fs = require('fs');
let vercelJson = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
if (vercelJson.crons) {
  delete vercelJson.crons;
  fs.writeFileSync('vercel.json', JSON.stringify(vercelJson, null, 2));
  console.log('Removed crons from vercel.json');
}
