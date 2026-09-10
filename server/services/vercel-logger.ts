/**
 * Vercel Logger Utility
 * Provides structured logging for Vercel serverless functions
 */

export class VercelLogger {
  /**
   * Log a general event with structured data
   */
  static logEvent(event: string, data: any = {}) {
    console.log(`📝 ${event}`, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Log email-related events
   */
  static logEmailEvent(event: string, data: any = {}) {
    console.log(`📧 ${event}`, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Log profile-related events
   */
  static logProfileEvent(event: string, data: any = {}) {
    console.log(`👤 ${event}`, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Log purchase-related events
   */
  static logPurchaseEvent(event: string, data: any = {}) {
    console.log(`💰 ${event}`, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Log database-related events
   */
  static logDatabaseEvent(event: string, data: any = {}) {
    console.log(`💾 ${event}`, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Log errors with full details
   */
  static logError(context: string, error: any, data: any = {}) {
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
  static logWarning(context: string, warning: string, data: any = {}) {
    console.warn(`⚠️  ${context}`, {
      warning,
      ...data,
      timestamp: new Date().toISOString()
    });
  }
}