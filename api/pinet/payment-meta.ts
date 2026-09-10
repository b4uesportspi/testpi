// ✅ PRODUCTION: Handle Pi Network Payment Metadata Endpoint
import type { VercelRequest, VercelResponse } from '@vercel/node';

export async function handlePaymentMetadata(req: VercelRequest, res: VercelResponse) {
  try {
    // --- Extract parameters ---
    const { productId, paymentId, userId } = req.query;

    if (!productId || !paymentId || !userId) {
      return res.status(400).json({
        error: "Missing required parameters: productId, paymentId, or userId",
      });
    }

    // --- Define your real products with correct values ---
    const products: Record<string, { amount: number; currency: string; description: string }> = {
      "pubg-60uc": {
        amount: 1.5,
        currency: "Pi",
        description: "1.5 Pi for 60 UC - PUBG Mobile",
      },
      "pubg-325uc": {
        amount: 6.5,
        currency: "Pi",
        description: "6.5 Pi for 325 UC - PUBG Mobile",
      },
      "pubg-660uc": {
        amount: 12,
        currency: "Pi",
        description: "12 Pi for 660 UC - PUBG Mobile",
      },
      "pubg-1800uc": {
        amount: 25,
        currency: "Pi",
        description: "25 Pi for 1800 UC - PUBG Mobile",
      },
      "pubg-3850uc": {
        amount: 49,
        currency: "Pi",
        description: "49 Pi for 3850 UC - PUBG Mobile",
      },
      "pubg-8100uc": {
        amount: 96,
        currency: "Pi",
        description: "96 Pi for 8100 UC - PUBG Mobile",
      },
      "pubg-16200uc": {
        amount: 186,
        currency: "Pi",
        description: "186 Pi for 16200 UC - PUBG Mobile",
      },
      "pubg-24300uc": {
        amount: 278,
        currency: "Pi",
        description: "278 Pi for 24300 UC - PUBG Mobile",
      },
      "pubg-32400uc": {
        amount: 369,
        currency: "Pi",
        description: "369 Pi for 32400 UC - PUBG Mobile",
      },
      "pubg-40500uc": {
        amount: 459,
        currency: "Pi",
        description: "459 Pi for 40500 UC - PUBG Mobile",
      },
      "mlbb-56diamonds": {
        amount: 3,
        currency: "Pi",
        description: "3 Pi for 56 Diamonds - Mobile Legends",
      },
      "mlbb-278diamonds": {
        amount: 6,
        currency: "Pi",
        description: "6 Pi for 278 Diamonds - Mobile Legends",
      },
      "mlbb-571diamonds": {
        amount: 11,
        currency: "Pi",
        description: "11 Pi for 571 Diamonds - Mobile Legends",
      },
      "mlbb-1783diamonds": {
        amount: 33,
        currency: "Pi",
        description: "33 Pi for 1783 Diamonds - Mobile Legends",
      },
      "mlbb-3005diamonds": {
        amount: 52,
        currency: "Pi",
        description: "52 Pi for 3005 Diamonds - Mobile Legends",
      },
      "mlbb-6012diamonds": {
        amount: 99,
        currency: "Pi",
        description: "99 Pi for 6012 Diamonds - Mobile Legends",
      },
      "mlbb-12000diamonds": {
        amount: 200,
        currency: "Pi",
        description: "200 Pi for 12000 Diamonds - Mobile Legends",
      },
      "coc-goldpass": {
        amount: 9,
        currency: "Pi",
        description: "9 Pi for Gold Pass - Clash of Clans",
      },
    };

    const product = products[productId as string];

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // --- Construct payment metadata dynamically ---
    const metadata = {
      appId: "b4uesports", // Your Pi app ID from developer portal
      paymentId: String(paymentId),
      userId: String(userId),
      productId: String(productId),
      amount: product.amount,
      currency: product.currency,
      description: product.description,
      timestamp: new Date().toISOString(),
    };

    // --- Return JSON metadata for Pi Network verification ---
    return res.status(200).json(metadata);
  } catch (error) {
    console.error("❌ Error handling PiNet payment metadata:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export default handlePaymentMetadata;