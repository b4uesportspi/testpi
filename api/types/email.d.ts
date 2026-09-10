declare module '../dist/server/services/email.js' {
  export function sendPaymentFailureNotification(params: any): Promise<boolean>;
  export function sendProfileUpdateEmail(params: any): Promise<boolean>;
  export function sendPurchaseConfirmationEmail(params: any): Promise<boolean>;
  export function sendAdminPurchaseNotification(params: any): Promise<boolean>;
}

declare module '../server/services/email.js' {
  export function sendPaymentFailureNotification(params: any): Promise<boolean>;
  export function sendProfileUpdateEmail(params: any): Promise<boolean>;
  export function sendPurchaseConfirmationEmail(params: any): Promise<boolean>;
  export function sendAdminPurchaseNotification(params: any): Promise<boolean>;
}