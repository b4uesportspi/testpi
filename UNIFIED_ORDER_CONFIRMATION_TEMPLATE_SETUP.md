# Unified Order Confirmation EmailJS Template Setup

This guide explains how to configure your EmailJS template to work with the unified order confirmation email function.

## Template Configuration

1. Log in to your EmailJS dashboard
2. Navigate to the template you want to use for order confirmations
3. Replace the template content with the following HTML:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Order Confirmation - {{order_id}}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0;
        }
        .container { 
            max-width: 600px; 
            margin: 20px auto; 
            padding: 20px; 
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            background-color: #f9f9f9;
        }
        .header { 
            background: linear-gradient(135deg, #1e3a8a, #7c3aed); 
            color: white; 
            padding: 20px; 
            text-align: center; 
            border-radius: 8px 8px 0 0;
        }
        .content { 
            padding: 20px; 
            background-color: #ffffff; 
        }
        .footer { 
            padding: 15px; 
            text-align: center; 
            font-size: 12px; 
            color: #666; 
            background-color: #f0f0f0;
            border-radius: 0 0 8px 8px;
        }
        .order-details { 
            margin: 20px 0; 
        }
        .order-details table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 15px 0;
        }
        .order-details th, .order-details td { 
            padding: 10px; 
            border: 1px solid #ddd; 
            text-align: left; 
        }
        .order-details th { 
            background-color: #f2f2f2; 
        }
        .total { 
            font-weight: bold; 
            font-size: 18px; 
            color: #4CAF50; 
            text-align: right;
            padding: 10px 0;
        }
        .section {
            margin: 20px 0;
            padding: 15px;
            border-left: 4px solid #4CAF50;
            background-color: #f8f9fa;
        }
        .highlight {
            color: #4CAF50;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Order Confirmation</h1>
            <p>Order ID: {{order_id}}</p>
        </div>
        
        <div class="content">
            <p>Hello {{recipient_name}},</p>
            
            <p>Thank you for your order. Here are the details:</p>
            
            <div class="section">
                <h2>Order Information</h2>
                <p><strong>Order ID:</strong> <span class="highlight">{{order_id}}</span></p>
                <p><strong>Order Date:</strong> {{order_date}}</p>
                <p><strong>Status:</strong> <span class="highlight">{{order_status}}</span></p>
            </div>
            
            <div class="section">
                <h3>Customer Details</h3>
                <p><strong>Name:</strong> {{customer_name}}</p>
                <p><strong>Email:</strong> {{customer_email}}</p>
                <p><strong>Phone:</strong> {{customer_phone}}</p>
            </div>
            
            <div class="section">
                <h3>Items Purchased</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Quantity</th>
                            <th>Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {{items}}
                    </tbody>
                </table>
                
                <p class="total">Total Amount: {{total_amount}}</p>
            </div>
            
            <div class="section">
                <h3>Transaction Details</h3>
                <p><strong>Transaction ID:</strong> {{transaction_id}}</p>
                <p><strong>Payment ID:</strong> {{payment_id}}</p>
                <p><strong>Game Account:</strong> {{game_account}}</p>
            </div>
            
            <p>If you have any questions about your order, please contact us at {{support_email}}.</p>
        </div>
        
        <div class="footer">
            <p>&copy; 2025 B4U Esports. All rights reserved.</p>
            <p>{{company_address}}</p>
            <p>
                <a href="https://www.facebook.com/b4uesports" style="color: #3b82f6; text-decoration: none; margin: 0 5px;">Facebook</a> | 
                <a href="https://youtube.com/@b4uesports" style="color: #3b82f6; text-decoration: none; margin: 0 5px;">YouTube</a> | 
                <a href="https://www.instagram.com/b4uesports" style="color: #3b82f6; text-decoration: none; margin: 0 5px;">Instagram</a>
            </p>
        </div>
    </div>
</body>
</html>
```

## Subject Line

Set your EmailJS template subject line to:
```
Order Confirmation - {{order_id}} - B4U Esports
```

## Required Parameters

Make sure your EmailJS template has the following parameters defined:

- `recipient_email` - The email address of the recipient
- `recipient_name` - The name of the recipient
- `order_id` - The unique order identifier
- `order_date` - The date the order was placed
- `order_status` - The current status of the order
- `customer_name` - The name of the customer
- `customer_email` - The email address of the customer
- `customer_phone` - The phone number of the customer
- `items` - The HTML table rows for the purchased items
- `total_amount` - The total amount of the order
- `transaction_id` - The transaction identifier
- `payment_id` - The payment identifier
- `game_account` - The game account information
- `support_email` - The support email address
- `company_address` - The company's physical address

These parameters are automatically passed by the `sendOrderConfirmationEmail` function in the email service.