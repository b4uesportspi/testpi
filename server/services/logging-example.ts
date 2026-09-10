/**
 * Example of how to use VercelLogger in API endpoints
 * This is not meant to be used directly, but as a reference
 */

import { VercelLogger } from './vercel-logger.js';

// Example profile update handler
export async function handleProfileUpdate(req: any, res: any) {
  if (req.method === 'PUT') {
    try {
      const { userId, updates } = req.body;

      // Log profile update attempt
      VercelLogger.logProfileEvent('PROFILE_UPDATE_ATTEMPT', {
        userId,
        updateFields: Object.keys(updates)
      });

      // Update in database (example)
      // await updateUserInDB(userId, updates);

      // Log success
      VercelLogger.logProfileEvent('PROFILE_UPDATE_SUCCESS', {
        userId
      });

      res.status(200).json({ success: true });
    } catch (error: any) {
      // Log error
      VercelLogger.logError('PROFILE_UPDATE_FAILED', error, {
        userId: req.body?.userId
      });

      res.status(500).json({ success: false, error: error.message });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}

// Example purchase handler
export async function handlePurchase(req: any, res: any) {
  if (req.method === 'POST') {
    try {
      const { userId, packageId, amount } = req.body;

      // Log purchase attempt
      VercelLogger.logPurchaseEvent('PURCHASE_ATTEMPT', {
        userId,
        packageId,
        amount
      });

      // Process purchase (example)
      // const result = await processPurchase(userId, packageId, amount);

      // Log success
      VercelLogger.logPurchaseEvent('PURCHASE_SUCCESS', {
        userId,
        packageId,
        amount
      });

      res.status(200).json({ success: true });
    } catch (error: any) {
      // Log error
      VercelLogger.logError('PURCHASE_FAILED', error, {
        userId: req.body?.userId,
        packageId: req.body?.packageId
      });

      res.status(500).json({ success: false, error: error.message });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}