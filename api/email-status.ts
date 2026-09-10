import { VercelRequest, VercelResponse } from '@vercel/node';

// In-memory storage for email tracking (in production, you might want to use a database)
const emailLog: any[] = [];

// Intercept console.log to capture email events
const originalConsoleLog = console.log;
console.log = function(...args) {
  // Capture email-related logs
  const message = args.join(' ');
  if (message.includes('📧') || message.includes('✅') || message.includes('❌') || message.includes('🔄')) {
    emailLog.push({
      timestamp: new Date().toISOString(),
      message: message
    });
    
    // Keep only the last 100 entries
    if (emailLog.length > 100) {
      emailLog.shift();
    }
  }
  
  // Call original console.log
  originalConsoleLog.apply(console, args);
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Return the email log
    return res.status(200).json({
      success: true,
      emailLog: emailLog.slice(-20), // Return last 20 entries
      totalEntries: emailLog.length,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}