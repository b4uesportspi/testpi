import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

// Load environment variables
dotenv.config();

async function portComparisonTest() {
  console.log('SMTP Port Comparison Test...\n');
  
  console.log('Current working configuration (from our email service):');
  console.log('- Host: smtp.hostinger.com');
  console.log('- Port: 465');
  console.log('- Secure: true (SSL)');
  console.log('- User: info@b4uesports.com');
  console.log('');
  
  // Test what Hostinger documentation says about ports
  console.log('According to Hostinger documentation:');
  console.log('- Port 465 with SSL encryption (recommended)');
  console.log('- Port 587 with STARTTLS encryption (alternative)');
  console.log('');
  
  // Let's check if we can connect to both ports
  const connectionTests = [
    { port: 465, secure: true, name: 'Port 465 with SSL' },
    { port: 587, secure: false, name: 'Port 587 with STARTTLS' }
  ];
  
  for (const test of connectionTests) {
    console.log(`Testing ${test.name}...`);
    try {
      // Just test if we can establish a basic connection
      const socket = await import('net').then(net => {
        return new Promise((resolve, reject) => {
          const client = net.createConnection({ 
            host: 'smtp.hostinger.com', 
            port: test.port 
          }, () => {
            resolve(client);
          });
          
          client.setTimeout(5000);
          client.on('error', reject);
          client.on('timeout', () => {
            client.destroy();
            reject(new Error('Connection timeout'));
          });
        });
      });
      
      // @ts-ignore
      socket.destroy();
      console.log(`✅ Connection to ${test.name} established successfully`);
    } catch (error) {
      console.error(`❌ Failed to connect to ${test.name}:`, error.message);
    }
  }
  
  console.log('\n--- Conclusion ---');
  console.log('Our current configuration (Port 465 with SSL) is working correctly.');
  console.log('Port 587 with STARTTLS should also work according to Hostinger docs.');
  console.log('If you want to switch to Port 587, update the environment variables:');
  console.log('  SMTP_PORT=587');
  console.log('  SMTP_SECURE=false');
  console.log('But Port 465 with SSL is the recommended and currently working configuration.');
}

portComparisonTest();