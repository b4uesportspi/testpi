import { createRequire } from 'module';
const require = createRequire(import.meta.url);
console.log('node version:', process.version);
try{
  const { Client } = require('pg');
  console.log('pg module loaded');
}catch(e){
  console.error('pg require failed:', e.message);
}
