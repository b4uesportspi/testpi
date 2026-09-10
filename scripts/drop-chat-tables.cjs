const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function dropChatTables() {
  try {
    await client.connect();
    console.log('Dropping chat-related tables if they exist...');
    await client.query('DROP TABLE IF EXISTS tournament_chat_messages CASCADE');
    console.log('Dropped tournament_chat_messages (if existed)');
    await client.query('DROP TABLE IF EXISTS chat_messages CASCADE');
    console.log('Dropped chat_messages (if existed)');
    console.log('Done.');
  } catch (err) {
    console.error('Error dropping chat tables:', err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  dropChatTables();
}
