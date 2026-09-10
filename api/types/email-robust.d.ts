declare module '../dist/server/services/email-robust.js' {
  export function sendTransactionEmails(transaction: any, client: any, status?: string): Promise<boolean>;
  export function sendAdminPurchaseNotificationWithRetry(params: any, maxRetries?: number): Promise<any>;
  export function sendPurchaseConfirmationEmailWithRetry(params: any, maxRetries?: number): Promise<any>;
  export function getDefaultAdminEmails(): string[];
}

declare module '../server/services/email-robust.js' {
  export function sendTransactionEmails(transaction: any, client: any, status?: string): Promise<boolean>;
  export function sendAdminPurchaseNotificationWithRetry(params: any, maxRetries?: number): Promise<any>;
  export function sendPurchaseConfirmationEmailWithRetry(params: any, maxRetries?: number): Promise<any>;
  export function getDefaultAdminEmails(): string[];
}