const fs = require('fs');

const vercelJsonPath = 'vercel.json';
let vercelJson = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));

vercelJson.crons = [
  {
    "path": "/api/weekly-marketing",
    "schedule": "0 10 * * 1"
  },
  {
    "path": "/api/monthly-marketing",
    "schedule": "0 10 1 * *"
  },
  {
    "path": "/api/cron/sync-transactions",
    "schedule": "0 * * * *"
  }
];

fs.writeFileSync(vercelJsonPath, JSON.stringify(vercelJson, null, 2));
console.log('Added crons to vercel.json');
