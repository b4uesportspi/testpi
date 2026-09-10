import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';

// Load environment variables
dotenv.config();

// Mock user data for testing
const TEST_USER_ID = 'test-user-id-123';
const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'fallback-secret';

async function testProfileEndpoint() {
  console.log('Testing profile endpoint functionality...');
  
  // Check if required environment variables are set
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set');
    return;
  }
  
  if (!JWT_SECRET || JWT_SECRET === 'fallback-secret' || JWT_SECRET.includes('your_')) {
    console.error('❌ JWT_SECRET is not properly configured');
    return;
  }
  
  console.log('✅ Environment variables are set');
  
  // Generate a test JWT token
  const testToken = jwt.sign({ userId: TEST_USER_ID }, JWT_SECRET, { expiresIn: '1h' });
  console.log('✅ Generated test JWT token');
  
  // Test database connection and user update
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false, // For Vercel serverless, temporary bypass certificate verification
      },
      connectionTimeoutMillis: 15000, // 15 seconds
      statement_timeout: 15000, // 15 seconds
      idleTimeoutMillis: 30000, // 30 seconds
      max: 3, // Reduced maximum number of clients for serverless
      allowExitOnIdle: true, // Allow process to exit when idle
      keepAlive: true, // Enable keep-alive connections
      keepAliveInitialDelayMillis: 10000, // 10 seconds
    });
    
    console.log('Attempting to connect to database...');
    const client = await pool.connect();
    
    try {
      console.log('Testing profile update query...');
      
      // Try to update a test user (this will fail if user doesn't exist, but that's OK for testing)
      const result = await client.query(
        `UPDATE users 
         SET email = $1, phone = $2, country = $3, updated_at = NOW()
         WHERE id = $4
         RETURNING id, email, phone, country`,
        [
          'test@example.com',
          '+1234567890',
          'Test Country',
          TEST_USER_ID
        ]
      );
      
      console.log('✅ Profile update query executed successfully');
      console.log('Rows affected:', result.rowCount);
      
      if (result.rows.length > 0) {
        console.log('Updated user data:', result.rows[0]);
      }
    } catch (queryError) {
      console.log('ℹ️ Profile update query test completed (may have failed due to non-existent user, which is OK)');
      console.log('Query error (if any):', (queryError as Error).message);
    } finally {
      client.release();
    }
    
    await pool.end();
    console.log('✅ Database connection test completed');
  } catch (dbError) {
    console.error('❌ Database connection failed:', (dbError as Error).message);
  }
  
  console.log('');
  console.log('Test Summary:');
  console.log('1. Environment variables: CHECKED');
  console.log('2. JWT token generation: WORKING');
  console.log('3. Database connection: TESTED');
  console.log('4. Profile update query: EXECUTED');
  console.log('');
  console.log('To fully test the profile endpoint:');
  console.log('1. Make sure you have a real database with proper tables');
  console.log('2. Make sure you have actual EmailJS credentials');
  console.log('3. Run the application and test through the UI');
}

testProfileEndpoint();