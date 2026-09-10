// API endpoint to fetch recent admin purchase logs for real-time dashboard
// This provides instant visibility of purchases without waiting for emails

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get limit from query (default 50 recent purchases)
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const timeRange = req.query.timeRange as string || '24h'; // 24h, 7d, 30d, all
    
    // Get database connection from environment
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    const client = await pool.connect();
    try {
      // Build time filter
      let timeFilter = '';
      switch (timeRange) {
        case '1h':
          timeFilter = 'AND created_at >= NOW() - INTERVAL \'1 hour\'';
          break;
        case '24h':
          timeFilter = 'AND created_at >= NOW() - INTERVAL \'1 day\'';
          break;
        case '7d':
          timeFilter = 'AND created_at >= NOW() - INTERVAL \'7 days\'';
          break;
        case '30d':
          timeFilter = 'AND created_at >= NOW() - INTERVAL \'30 days\'';
          break;
        default:
          timeFilter = '';
      }

      // Fetch recent purchases from admin_purchase_logs
      const query = `
        SELECT 
          id,
          transaction_id,
          user_id,
          username,
          user_email,
          package_name,
          game,
          pi_amount,
          usd_amount,
          game_account,
          payment_id,
          status,
          created_at
        FROM admin_purchase_logs
        WHERE status = 'completed'
        ${timeFilter}
        ORDER BY created_at DESC
        LIMIT $1
      `;

      const result = await client.query(query, [limit]);
      
      // Calculate summary stats
      const summary = {
        totalPurchases: result.rows.length,
        totalPiAmount: result.rows.reduce((sum: number, row: any) => sum + parseFloat(row.pi_amount || 0), 0),
        totalUsdAmount: result.rows.reduce((sum: number, row: any) => sum + parseFloat(row.usd_amount || 0), 0),
        timeRange: timeRange,
        generatedAt: new Date().toISOString()
      };

      return res.status(200).json({
        success: true,
        summary,
        purchases: result.rows,
        count: result.rows.length
      });
    } finally {
      client.release();
      await pool.end();
    }
  } catch (error: any) {
    console.error('Admin purchase logs endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch purchase logs',
      details: error.message
    });
  }
}
