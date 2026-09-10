// Simple Node.js script to test environment variables
console.log('Testing environment variables...');
console.log('PI_SERVER_API_KEY:', process.env.PI_SERVER_API_KEY ? 'SET' : 'NOT SET');
console.log('PI_SERVER_API_KEY value:', process.env.PI_SERVER_API_KEY);
console.log('PI_SERVER_API_KEY length:', process.env.PI_SERVER_API_KEY ? process.env.PI_SERVER_API_KEY.length : 0);
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
console.log('JWT_SECRET length:', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0);
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');

// Check if they are placeholder values
if (process.env.PI_SERVER_API_KEY) {
  console.log('PI_SERVER_API_KEY is placeholder:', process.env.PI_SERVER_API_KEY === 'your_pi_server_api_key_here');
}

if (process.env.JWT_SECRET) {
  console.log('JWT_SECRET is placeholder:', process.env.JWT_SECRET === 'fallback-secret');
}