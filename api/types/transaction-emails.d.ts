declare module '../dist/server/services/transaction-emails.js' {
  export function sendTransactionStatusEmails(transaction: any, status: string): Promise<boolean>;
}

declare module '../server/services/transaction-emails.js' {
  export function sendTransactionStatusEmails(transaction: any, status: string): Promise<boolean>;
}