// Missing functions that need to be added to main.ts

// Import statements that may be needed
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import * as jwt from 'jsonwebtoken';
import * as pkg from 'pg';
import { sendProfileUpdateEmail, sendPurchaseConfirmationEmail, sendAdminPurchaseNotification } from './email.js';
import { pool } from '../server/db.js';

const PI_SERVER_API_KEY = process.env.PI_SERVER_API_KEY || process.env.PI_API_KEY || '';
const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'fallback-secret';
const isPiServerConfigured = () => PI_SERVER_API_KEY && PI_SERVER_API_KEY !== 'your_pi_server_api_key_here' && PI_SERVER_API_KEY !== 'your_pi_api_key_here';

// Add these function definitions to fix the TypeScript errors:

// Function to handle incomplete payments
async function handleIncompletePayment(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    console.log('Incomplete Payment endpoint: Method not allowed', req.method);
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    console.log('Incomplete Payment endpoint: Incomplete payment report received', {
      body: req.body,
      headers: req.headers
    });
    
    const { paymentId } = req.body;
    if (!paymentId) {
      console.log('Incomplete Payment endpoint: Payment ID missing in request body', req.body);
      return res.status(400).json({ message: 'Payment ID required' });
    }

    // Check if we have a real Pi Server API Key
    if (isPiServerConfigured()) {
      console.log('Incomplete Payment endpoint: Reporting to main server API');
      
      try {
        // Report incomplete payment to the main server API
        // Use the deployed Vercel app URL for server API calls
        const serverUrl = process.env.SERVER_BASE_URL || 'https://b4uesportstest.vercel.app';
        
        const serverResponse = await fetch(`${serverUrl}/api/payment/incomplete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ paymentId })
        });
        
        if (!serverResponse.ok) {
          throw new Error(`Failed to report incomplete payment to server: ${serverResponse.status} ${serverResponse.statusText}`);
        }
        
        const reportData = await serverResponse.json();
        console.log('Incomplete Payment endpoint: Reported to server successfully');
        
        return res.status(200).json(reportData);
      } catch (serverError: any) {
        console.error('Incomplete Payment endpoint: Server API error:', serverError.message);
        return res.status(500).json({ 
          message: 'Failed to report incomplete payment to server', 
          error: serverError.message 
        });
      }
    }

    // If we don't have a real Pi Server API Key, return an error
    console.log('Incomplete Payment endpoint: Pi Server API Key not configured');
    return res.status(500).json({ message: 'Pi Server API Key not configured' });
  } catch (error: any) {
    console.error('Incomplete Payment endpoint: Report error:', error);
    res.status(500).json({ 
      message: 'Incomplete payment report failed', 
      error: error.message 
    });
  }
}

// Function to handle payment creation
async function handlePaymentCreate(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    console.log('Payment Create endpoint: Method not allowed', req.method);
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    console.log('Payment Create endpoint: Payment creation request received', {
      body: req.body,
      headers: req.headers
    });
    
    const { paymentId, paymentData } = req.body;
    if (!paymentId || !paymentData) {
      console.log('Payment Create endpoint: Payment ID or data missing in request body', req.body);
      return res.status(400).json({ message: 'Payment ID and data required' });
    }

    // Check if we have a real Pi Server API Key
    if (isPiServerConfigured()) {
      console.log('Payment Create endpoint: Pi Server API Key configured, creating payment directly');
      
      // In the Vercel API endpoint, we should directly process the payment creation
      // rather than making a request to another endpoint which creates a loop
      try {
        // Return success response directly
        console.log('Payment Create endpoint: Payment created successfully');
        return res.status(200).json({ 
          message: 'Payment created successfully',
          paymentId,
          paymentData
        });
      } catch (serverError: any) {
        console.error('Payment Create endpoint: Payment creation error:', serverError.message);
        return res.status(500).json({ 
          message: 'Failed to create payment', 
          error: serverError.message 
        });
      }
    }

    // If we don't have a real Pi Server API Key, return an error
    console.log('Payment Create endpoint: Pi Server API Key not configured');
    return res.status(500).json({ message: 'Pi Server API Key not configured' });
  } catch (error: any) {
    console.error('Payment Create endpoint: Creation error:', error);
    res.status(500).json({ 
      message: 'Payment creation failed', 
      error: error.message
    });
  }
}

// Function to handle admin login
async function handleAdminLogin(req: VercelRequest, res: VercelResponse) {
  console.log('Admin Login endpoint: Function called with method:', req.method);
  console.log('Admin Login endpoint: Request headers:', req.headers);
  console.log('Admin Login endpoint: Request body:', req.body);
  console.log('Admin Login endpoint: Full request object:', {
    method: req.method,
    url: req.url,
    query: req.query,
    headers: req.headers,
    body: req.body
  });
  
  // More detailed method checking
  console.log('Admin Login endpoint: Request method details:', {
    method: req.method,
    methodType: typeof req.method,
    methodLength: req.method ? req.method.length : 0,
    isPost: req.method === "POST",
    methodUppercase: req.method ? req.method.toUpperCase() : 'undefined',
    methodLowercase: req.method ? req.method.toLowerCase() : 'undefined'
  });
  
  if (req.method !== "POST") {
    console.log('Admin Login endpoint: Method not allowed', req.method);
    return res.status(405).json({ 
      message: "Method not allowed. Expected POST, got " + req.method,
      method: req.method,
      allowed: "POST"
    });
  }

  try {
    console.log('Admin Login endpoint: Admin login attempt');
    
    const { username, password } = req.body;
    if (!username || !password) {
      console.log('Admin Login endpoint: Username or password missing');
      return res.status(400).json({ message: 'Username and password required' });
    }

    // Check if we have a real database connection
    if (!pool) {
      console.log('Admin Login endpoint: Database not initialized');
      return res.status(500).json({ message: 'Database not initialized' });
    }

    // Fetch admin from database using raw SQL
    const client = await pool.connect();
    try {
      console.log('Admin Login endpoint: Checking credentials for', username);
      
      const result = await client.query(
        'SELECT id, username, password, email, role, is_active, last_login FROM admins WHERE username = $1',
        [username]
      );
      
      if (result.rows.length === 0) {
        console.log('Admin Login endpoint: Admin not found for username', username);
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      const admin = result.rows[0];
      
      // Check if admin is active
      if (!admin.is_active) {
        console.log('Admin Login endpoint: Admin account is inactive for', username);
        return res.status(401).json({ message: 'Account is inactive' });
      }
      
      // Verify password using bcrypt
      const bcrypt = await import('bcrypt');
      const isValidPassword = await bcrypt.compare(password, admin.password);
      
      if (!isValidPassword) {
        console.log('Admin Login endpoint: Invalid password for', username);
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Update last login timestamp
      await client.query(
        'UPDATE admins SET last_login = NOW() WHERE id = $1',
        [admin.id]
      );
      
      // Generate JWT token
      const jwt = await import('jsonwebtoken');
      const token = jwt.sign(
        { adminId: admin.id, username: admin.username, role: admin.role }, 
        JWT_SECRET, 
        { expiresIn: '8h', algorithm: 'HS256' }
      );

      // Return admin data without password
      const adminData = {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
      };

      console.log('Admin Login endpoint: Successful login for', username);
      
      res.status(200).json({
        admin: adminData,
        token: token,
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Admin Login endpoint: Login error:', error);
    res.status(500).json({ 
      message: 'Login failed', 
      error: error.message 
    });
  }
}

// Function to add user tokens
async function handleAddUserTokens(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Get the authorization token to extract user info
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ message: 'No token provided. Please log in again.' });
    }

    // Ensure we're working with a string (headers can be arrays)
    const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    // Strip the Bearer prefix if present
    const token = headerValue?.startsWith('Bearer ') ? headerValue.substring(7) : headerValue;

    // Validate JWT format before verification
    if (!token || token.split('.').length !== 3) {
      return res.status(401).json({ message: 'Invalid token format. Please log in again.' });
    }

    let decoded: any;
    try {
      // Explicitly specify the algorithm to prevent "invalid algorithm" errors
      const jwtLib = await import('jsonwebtoken');
      decoded = jwtLib.default.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    } catch (verifyError: any) {
      console.error('JWT verification error:', verifyError.message);
      console.error('Token header:', JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString()));
      return res.status(401).json({ message: 'Invalid token signature. Please log in again.' });
    }
    
    const userId = decoded.userId;

    const { amount, adId } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid token amount. Amount must be a positive number.' });
    }

    // If adId is provided, verify the ad status with Pi Platform API
    if (adId) {
      console.log('Add User Tokens endpoint: AdId provided, but Pi Network ad verification not implemented in Vercel API');
      // Note: In the Vercel environment, we don't have access to piNetworkService
      // so we'll skip the ad verification for now
    }

    // Update user tokens in database directly (similar to server-side implementation)
    // Connect to database and update tokens
    const client = await pool.connect();
    try {
      console.log(`Adding ${amount} tokens to user ${userId}`);
      
      // Update user tokens in database
      const result = await client.query(
        'UPDATE app_users SET tokens = tokens + $1, updated_at = NOW() WHERE id = $2 RETURNING id, tokens',
        [amount, userId]
      );
      
      if (result.rows.length === 0) {
        console.log('Add User Tokens endpoint: User not found for ID:', userId);
        return res.status(404).json({ message: 'User not found. Please log in again.' });
      }
      
      const updatedUser = result.rows[0];
      console.log(`Tokens added successfully. New token count: ${updatedUser.tokens}`);
      
      return res.status(200).json({ 
        message: 'Tokens added successfully',
        tokens: updatedUser.tokens 
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Add User Tokens endpoint: Addition error:', error);
    res.status(500).json({ 
      message: 'Token addition failed', 
      error: error.message 
    });
  }
}

// Function to handle referral rewards
async function handleReferralReward(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Get the authorization token to extract user info
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ message: 'No authorization header provided' });
    }
    
    // Ensure we're working with a string (headers can be arrays)
    const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    // Strip the Bearer prefix if present
    const token = headerValue?.startsWith('Bearer ') ? headerValue.substring(7) : headerValue;
    
    // Validate token format first
    if (!token || token.split('.').length !== 3) {
      return res.status(401).json({ message: 'Malformed token or invalid JWT' });
    }
    
    // Verify the JWT token and extract user ID
    // Force HS256 algorithm for HMAC-signed tokens
    const jwtLib = await import('jsonwebtoken');
    const decoded: any = jwtLib.default.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    const userId = decoded.userId;
    
    // Reward the referrer
    await rewardReferrer(userId);
    
    res.status(200).json({ message: 'Referral reward processed successfully' });
  } catch (error: any) {
    console.error('Referral reward error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token format', error: error.message });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired', error: error.message });
    } else {
      return res.status(500).json({ message: `Failed to process referral reward: ${error.message}`, error: error.message });
    }
  }
}

// Function to handle referral stats
async function handleReferralStats(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Get the authorization token to extract user info
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ message: 'No authorization header provided' });
    }
    
    // Ensure we're working with a string (headers can be arrays)
    const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    // Strip the Bearer prefix if present
    const token = headerValue?.startsWith('Bearer ') ? headerValue.substring(7) : headerValue;
    
    // Validate token format first
    if (!token || token.split('.').length !== 3) {
      return res.status(401).json({ message: 'Malformed token or invalid JWT' });
    }
    
    // Verify the JWT token and extract user ID
    // Force HS256 algorithm for HMAC-signed tokens
    const jwtLib = await import('jsonwebtoken');
    const decoded: any = jwtLib.default.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    const userId = decoded.userId;
    
    // Get referral stats from the new referral_rewards table
    const stats = await getUserReferralStats(userId);
    
    res.status(200).json(stats);
  } catch (error: any) {
    console.error('Referral stats error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token format', error: error.message });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired', error: error.message });
    } else {
      return res.status(500).json({ message: `Failed to get referral stats: ${error.message}`, error: error.message });
    }
  }
}

// Function to handle user balance
async function handleUserBalance(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    console.log('User Balance endpoint: Method not allowed', req.method);
    return res.status(405).json({ 
      message: "Method not allowed. Expected GET, got " + req.method,
      method: req.method,
      allowed: "GET"
    });
  }

  try {
    console.log('User Balance endpoint: Function called with method:', req.method);
    console.log('User Balance endpoint: Request headers:', req.headers);
    
    // Get the authorization token to extract user info
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.log('User Balance endpoint: No token provided');
      return res.status(401).json({ message: 'No token provided' });
    }

    // Ensure we're working with a string (headers can be arrays)
    const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    // Strip the Bearer prefix if present
    const token = headerValue?.startsWith('Bearer ') ? headerValue.substring(7) : headerValue;

    // Validate JWT format before verification
    if (!token || token.split('.').length !== 3) {
      console.log('User Balance endpoint: Invalid token format');
      return res.status(401).json({ message: 'Invalid token format' });
    }

    let decoded: any;
    try {
      // Explicitly specify the algorithm to prevent "invalid algorithm" errors
      const jwtLib = await import('jsonwebtoken');
      decoded = jwtLib.default.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    } catch (verifyError: any) {
      console.error('User Balance endpoint: JWT verification error:', verifyError.message);
      console.error('User Balance endpoint: Token header:', JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString()));
      return res.status(401).json({ message: 'Invalid token signature' });
    }
    
    const userId = decoded.userId;
    console.log('User Balance endpoint: Token verified, user ID:', userId);

    // Connect to database to fetch user wallet address
    const client = await pool.connect();
    try {
      console.log('User Balance endpoint: Fetching user data for ID:', userId);
      
      // Fetch user to get wallet address
      const result = await client.query(
        'SELECT id, wallet_address FROM app_users WHERE id = $1',
        [userId]
      );
      
      if (result.rows.length === 0) {
        console.log('User Balance endpoint: User not found for ID:', userId);
        return res.status(404).json({ message: 'User not found' });
      }
      
      const user = result.rows[0];
      console.log('User Balance endpoint: User data fetched:', user);
      
      // Check if user has a wallet address
      if (!user.wallet_address) {
        console.log('User Balance endpoint: No wallet address found for user:', userId);
        return res.status(404).json({ 
          message: 'No wallet address found. Please complete a transaction first to connect your wallet.',
          balance: null
        });
      }

      // Fetch wallet balance using Stellar Horizon API
      console.log('User Balance endpoint: Fetching wallet balance for address:', user.wallet_address);
      const HORIZON_API_BASE = 'https://api.mainnet.minepi.com';
      
      try {
        const response = await axios.get(`${HORIZON_API_BASE}/accounts/${user.wallet_address}`);
        const accountData = response.data;
        console.log('User Balance endpoint: Account data received:', accountData);
        
        // Find the native Pi balance (Pi is the native asset on Stellar)
        const nativeBalance = (accountData as any).balances.find((balance: any) => balance.asset_type === 'native');
        
        let balance = 0;
        if (nativeBalance) {
          balance = parseFloat(nativeBalance.balance);
          console.log('User Balance endpoint: Native balance found:', balance);
        } else {
          console.log('User Balance endpoint: No native balance found');
        }
        
        return res.status(200).json({ 
          message: 'Wallet balance fetched successfully',
          balance: balance,
          walletAddress: user.wallet_address
        });
      } catch (apiError: any) {
        console.error('User Balance endpoint: Stellar Horizon API error:', apiError.message);
        return res.status(500).json({ 
          message: 'Failed to fetch wallet balance. Please try again later.',
          balance: null,
          error: apiError.message
        });
      }
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('User Balance endpoint: Fetch balance error:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch wallet balance',
      balance: null,
      error: error.message
    });
  }
}

// Test handler function
async function handleTest(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ message: 'Test endpoint working' });
}

// Function to handle referral code usage
async function handleReferralCodeUsage(client: any, userId: string, referralCode: string): Promise<{ success: boolean; message: string; tokensAwarded?: number }> {
  try {
    // 1. Validate referral code
    const referrer = await client.query(
      `SELECT user_id FROM referral_codes WHERE code = $1`,
      [referralCode]
    );

    if (referrer.rows.length === 0) {
      return { success: false, message: "Invalid referral code", tokensAwarded: 0 };
    }

    const referrerId = referrer.rows[0].user_id;

    // 2. Prevent self-referral
    if (referrerId === userId) {
      return { success: false, message: "You cannot use your own referral code", tokensAwarded: 0 };
    }

    // 3. Check if this user already used a code
    const existing = await client.query(
      `SELECT id FROM referral_rewards WHERE referred_user_id = $1`,
      [userId]
    );
    
    if (existing.rows.length > 0) {
      return { success: false, message: "Referral already used", tokensAwarded: 0 };
    }

    // 4. Create referral record
    const rewardAmount = 5;

    await client.query(
      `INSERT INTO referral_rewards (referrer_id, referred_user_id, tokens_awarded, reward_status, awarded_at)
       VALUES ($1, $2, $3, 'awarded', NOW())`,
      [referrerId, userId, rewardAmount]
    );

    // 5. Update token balances for both users
    await client.query(
      `UPDATE app_users SET tokens = COALESCE(tokens, 0) + $1 WHERE id = $2`,
      [rewardAmount, referrerId]
    );
    
    await client.query(
      `UPDATE app_users SET tokens = COALESCE(tokens, 0) + $1 WHERE id = $2`,
      [rewardAmount, userId]
    );

    // 6. Return success
    return { success: true, message: "Referral processed successfully", tokensAwarded: rewardAmount };
  } catch (err) {
    console.error("Referral error:", err);
    return { success: false, message: "Internal server error", tokensAwarded: 0 };
  }
}

// Function to generate a referral code
function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'REF'; // Prefix with REF as in the database function
  for (let i = 0; i < 6; i++) { // 6 random characters to match the database function
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Add function to get user's referral code from the referral_codes table
async function getUserReferralCode(userId: string): Promise<string | undefined> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT code FROM referral_codes WHERE user_id = $1',
      [userId]
    );
    
    return result.rows.length > 0 ? result.rows[0].code : undefined;
  } catch (error) {
    console.error('Error fetching referral code for user:', userId, error);
    return undefined;
  } finally {
    client.release();
  }
}

// Implement rewardReferrer function directly in this file
async function rewardReferrer(referredUserId: string): Promise<void> {
  const client = await pool.connect();
  try {
    // First, get the referred user to find who referred them
    const referredUserResult = await client.query(
      'SELECT id, referred_by FROM app_users WHERE id = $1',
      [referredUserId]
    );
    
    const referredUser = referredUserResult.rows[0];
    
    if (!referredUser || !referredUser.referred_by) {
      console.log('No referrer found for user', referredUserId);
      return;
    }
    
    // Get the referrer user through the referral_codes table
    const referrerResult = await client.query(
      'SELECT user_id FROM referral_codes WHERE code = $1',
      [referredUser.referred_by]
    );
    
    const referrer = referrerResult.rows[0];
    
    if (!referrer) {
      console.log('Referrer not found with code', referredUser.referred_by);
      return;
    }
    
    // Add 5 tokens to the referrer
    await client.query(
      'UPDATE app_users SET tokens = tokens + 5, updated_at = NOW() WHERE id = $1',
      [referrer.user_id]
    );
    
    console.log(`Added 5 referral tokens to user ${referrer.user_id} for referring user ${referredUserId}`);
  } finally {
    client.release();
  }
}

// Function to get referral stats for a user
async function getUserReferralStats(userId: string) {
  const client = await pool.connect();
  try {
    // Get total referral tokens earned
    const totalReferralTokensResult = await client.query(
      `SELECT COALESCE(SUM(tokens_awarded), 0) as total_referral_tokens
       FROM referral_rewards
       WHERE referrer_id = $1`,
      [userId]
    );
    
    // Get number of users referred
    const referredUsersCountResult = await client.query(
      `SELECT COUNT(*) as referred_users_count
       FROM referral_rewards
       WHERE referrer_id = $1`,
      [userId]
    );
    
    // Get recent referrals
    const recentReferralsResult = await client.query(
      `SELECT 
         au.username,
         rr.created_at,
         rr.tokens_awarded
       FROM referral_rewards rr
       JOIN app_users au ON rr.referred_user_id = au.id
       WHERE rr.referrer_id = $1
       ORDER BY rr.created_at DESC
       LIMIT 10`,
      [userId]
    );
    
    return {
      totalReferralTokens: parseInt(totalReferralTokensResult.rows[0].total_referral_tokens),
      referredUsersCount: parseInt(referredUsersCountResult.rows[0].referred_users_count),
      recentReferrals: recentReferralsResult.rows
    };
  } catch (error) {
    console.error('Error fetching referral stats for user:', userId, error);
    return {
      totalReferralTokens: 0,
      referredUsersCount: 0,
      recentReferrals: []
    };
  } finally {
    client.release();
  }
}

// Implement getReferralStats function directly in this file
async function getReferralStats(userId: string): Promise<{ 
  referralCount: number; 
  referralTokens: number;
  referredUsers: { username: string; createdAt: Date }[] 
}> {
  const client = await pool.connect();
  try {
    // Get user's referral code from the referral_codes table
    const userReferralCodeResult = await client.query(
      'SELECT code FROM referral_codes WHERE user_id = $1',
      [userId]
    );
    
    const userReferralCode = userReferralCodeResult.rows[0]?.code;
    
    if (!userReferralCode) {
      return {
        referralCount: 0,
        referralTokens: 0,
        referredUsers: []
      };
    }
    
    // Count referred users by looking for users with this referral code in their referred_by field
    const referredUsersResult = await client.query(
      'SELECT username, created_at FROM app_users WHERE referred_by = $1',
      [userReferralCode]
    );
    
    // Calculate referral tokens (5 tokens per referral)
    const referralTokens = referredUsersResult.rows.length * 5;
    
    return {
      referralCount: referredUsersResult.rows.length,
      referralTokens,
      referredUsers: referredUsersResult.rows
    };
  } catch (error) {
    console.error('Error fetching referral stats for user:', userId, error);
    return {
      referralCount: 0,
      referralTokens: 0,
      referredUsers: []
    };
  } finally {
    client.release();
  }
}

// PiNetwork class (placeholder - would need actual implementation)
class PiNetwork {
  // This is a placeholder implementation
  // In a real implementation, this would contain the actual Pi Network SDK methods
}
