/**
 * Vercel Logger Utility
 * Provides structured logging for Vercel serverless functions
 */

export class VercelLogger {
  /**
   * Log a general event with structured data
   */
  static logEvent(event, data = {}) {
    console.log(`📝 ${event}`, { ...data, timestamp: new Date().toISOString() });
  }

  /**
   * Log email-related events
   */
  static logEmailEvent(event, data = {}) {
    console.log(`📧 ${event}`, { ...data, timestamp: new Date().toISOString() });
  }

  /**
   * Log profile-related events
   */
  static logProfileEvent(event, data = {}) {
    console.log(`👤 ${event}`, { ...data, timestamp: new Date().toISOString() });
  }

  /**
   * Log purchase-related events
   */
  static logPurchaseEvent(event, data = {}) {
    console.log(`💰 ${event}`, { ...data, timestamp: new Date().toISOString() });
  }

  /**
   * Log database-related events
   */
  static logDatabaseEvent(event, data = {}) {
    console.log(`💾 ${event}`, { ...data, timestamp: new Date().toISOString() });
  }

  /**
   * Log errors with full details
   */
  static logError(context, error, data = {}) {
    console.error(`❌ ${context}`, { 
      error: error.message, 
      code: error.code, 
      stack: error.stack, 
      ...data, 
      timestamp: new Date().toISOString() 
    });
  }

  /**
   * Log warnings
   */
  static logWarning(context, warning, data = {}) {
    console.warn(`⚠️  ${context}`, { 
      warning, 
      ...data, 
      timestamp: new Date().toISOString() 
    });
  }
}