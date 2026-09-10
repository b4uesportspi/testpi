import dotenv from 'dotenv';
dotenv.config();

/**
 * Email Monitoring Service for Vercel
 * This script helps track email sending status in production
 */

// Simple email tracking logger
class EmailTracker {
  static logEmailEvent(event: string, data: any = {}) {
    const timestamp = new Date().toISOString();
    console.log(`📧 [${timestamp}] ${event}`, JSON.stringify(data, null, 2));
  }
  
  static logEmailSuccess(emailType: string, recipient: string, messageId?: string) {
    this.logEmailEvent(`✅ EMAIL_SENT_${emailType.toUpperCase()}`, {
      recipient,
      messageId,
      timestamp: new Date().toISOString()
    });
  }
  
  static logEmailError(emailType: string, recipient: string, error: any) {
    this.logEmailEvent(`❌ EMAIL_ERROR_${emailType.toUpperCase()}`, {
      recipient,
      error: {
        message: error.message,
        code: error.code,
        stack: error.stack
      },
      timestamp: new Date().toISOString()
    });
  }
  
  static logEmailAttempt(emailType: string, recipient: string) {
    this.logEmailEvent(`🔄 EMAIL_ATTEMPT_${emailType.toUpperCase()}`, {
      recipient,
      timestamp: new Date().toISOString()
    });
  }
}

// Enhanced email functions with forced logging
export async function sendTrackedPurchaseConfirmationEmail(params: any) {
  EmailTracker.logEmailAttempt('PURCHASE_CONFIRMATION', params.to);
  
  try {
    // Import the actual email service
    const { sendPurchaseConfirmationEmail } = await import('./server/services/email.js');
    
    const result = await sendPurchaseConfirmationEmail(params);
    
    if (result) {
      EmailTracker.logEmailSuccess('PURCHASE_CONFIRMATION', params.to);
    } else {
      EmailTracker.logEmailError('PURCHASE_CONFIRMATION', params.to, new Error('Email sending failed without exception'));
    }
    
    return result;
  } catch (error: any) {
    EmailTracker.logEmailError('PURCHASE_CONFIRMATION', params.to, error);
    throw error;
  }
}

export async function sendTrackedProfileUpdateEmail(params: any) {
  EmailTracker.logEmailAttempt('PROFILE_UPDATE', params.to);
  
  try {
    // Import the actual email service
    const { sendProfileUpdateEmail } = await import('./server/services/email.js');
    
    const result = await sendProfileUpdateEmail(params);
    
    if (result) {
      EmailTracker.logEmailSuccess('PROFILE_UPDATE', params.to);
    } else {
      EmailTracker.logEmailError('PROFILE_UPDATE', params.to, new Error('Email sending failed without exception'));
    }
    
    return result;
  } catch (error: any) {
    EmailTracker.logEmailError('PROFILE_UPDATE', params.to, error);
    throw error;
  }
}

export async function sendTrackedAdminPurchaseNotification(params: any) {
  EmailTracker.logEmailAttempt('ADMIN_PURCHASE', params.adminEmail);
  
  try {
    // Import the actual email service
    const { sendAdminPurchaseNotification } = await import('./server/services/email.js');
    
    const result = await sendAdminPurchaseNotification(params);
    
    if (result) {
      EmailTracker.logEmailSuccess('ADMIN_PURCHASE', params.adminEmail);
    } else {
      EmailTracker.logEmailError('ADMIN_PURCHASE', params.adminEmail, new Error('Email sending failed without exception'));
    }
    
    return result;
  } catch (error: any) {
    EmailTracker.logEmailError('ADMIN_PURCHASE', params.adminEmail, error);
    throw error;
  }
}

// Test function to verify logging works
export async function testEmailTracking() {
  EmailTracker.logEmailEvent('EMAIL_TRACKING_SERVICE_STARTED', {
    pid: process.pid,
    timestamp: new Date().toISOString()
  });
  
  console.log('📧 Email tracking service is ready and monitoring email events');
  console.log('📋 This will help you see all email activities in Vercel logs');
}

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testEmailTracking().catch(console.error);
}

export default EmailTracker;