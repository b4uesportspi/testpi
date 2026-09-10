import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function debugDatabaseConnection() {
  console.log('Debugging database connection...');
  
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in environment variables');
    return;
  }
  
  console.log('Using DATABASE_URL:', DATABASE_URL.replace(/:[^:@]+@/, ':***@')); // Hide password
  
  // Test different connection configurations
  const configs = [
    {
      name: 'Standard SSL config',
      config: {
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000,
      }
    },
    {
      name: 'No SSL config',
      config: {
        connectionString: DATABASE_URL,
        connectionTimeoutMillis: 5000,
      }
    },
    {
      name: 'Alternative SSL config',
      config: {
        connectionString: DATABASE_URL,
        ssl: {
          rejectUnauthorized: false,
          sslmode: 'require'
        },
        connectionTimeoutMillis: 5000,
      }
    }
  ];
  
  for (const { name, config } of configs) {
    console.log(`\n🔄 Testing configuration: ${name}`);
    console.log('Config:', {
      ...config,
      connectionString: config.connectionString.replace(/:[^:@]+@/, ':***@')
    });
    
    const pool = new Pool(config);
    
    try {
      console.log('Attempting to connect...');
      const client = await pool.connect();
      console.log('✅ Connected successfully');
      
      console.log('Testing simple query...');
      const result = await client.query('SELECT version()');
      console.log('✅ Query result:', result.rows[0]);
      
      client.release();
      await pool.end();
      console.log('✅ Test completed successfully for', name);
      return; // If one works, we're done
    } catch (error) {
      console.error(`❌ Failed with ${name}:`, error.message);
      try {
        await pool.end();
      } catch (endError) {
        console.error('Error ending pool:', endError.message);
      }
    }
  }
  
  console.log('\n❌ All connection configurations failed');
}

debugDatabaseConnection().catch(console.error);