// Example usage of the unified order confirmation email function
// This would typically be called from your payment completion handler

import { sendOrderConfirmationEmail } from './server/services/email';

// Example for sending to user
await sendOrderConfirmationEmail({
  recipientEmail: 'user@example.com',
  recipientName: 'John Doe',
  orderId: 'ORD-2025-001',
  orderDate: '2025-10-16',
  orderStatus: 'Completed',
  customerName: 'John Doe',
  customerEmail: 'user@example.com',
  customerPhone: '+1234567890',
  items: [
    {
      name: '1000 UC - PUBG Mobile',
      quantity: 1,
      price: '2.50 π',
      total: '2.50 π'
    }
  ],
  totalAmount: '2.50 π',
  transactionId: 'txn_1234567890',
  paymentId: 'pay_1234567890',
  gameAccount: 'PUBG123456789',
  supportEmail: 'info@b4uesports.com',
  companyAddress: 'B4U Esports, Thimphu, Bhutan'
});

// Example for sending to admin
await sendOrderConfirmationEmail({
  recipientEmail: 'admin@b4uesports.com',
  recipientName: 'Admin Team',
  orderId: 'ORD-2025-001',
  orderDate: '2025-10-16',
  orderStatus: 'Completed',
  customerName: 'John Doe',
  customerEmail: 'user@example.com',
  customerPhone: '+1234567890',
  items: [
    {
      name: '1000 UC - PUBG Mobile',
      quantity: 1,
      price: '2.50 π',
      total: '2.50 π'
    }
  ],
  totalAmount: '2.50 π',
  transactionId: 'txn_1234567890',
  paymentId: 'pay_1234567890',
  gameAccount: 'PUBG123456789',
  supportEmail: 'info@b4uesports.com',
  companyAddress: 'B4U Esports, Thimphu, Bhutan'
});