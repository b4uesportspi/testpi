import axios from 'axios';
import { storage } from '../storage.js';

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY || '';

export interface PiPriceData {
  price: number;
  lastUpdated: Date;
}

export class PricingService {
  private lastPrice: PiPriceData | null = null;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Only start price updates if we're not in a serverless environment
    if (!process.env.VERCEL) {
      this.startPriceUpdates();
    }
  }

  async getCurrentPiPrice(): Promise<number> {
    if (this.lastPrice && (Date.now() - this.lastPrice.lastUpdated.getTime()) < 60000) {
      console.log('Pi Price Service: Returning cached price', this.lastPrice.price);
      return this.lastPrice.price;
    }

    try {
      console.log('Pi Price Service: Fetching price from CoinGecko');
      
      // Prepare request configuration
      const config: any = { 
        timeout: 5000 // 5 second timeout
      };
      
      // Add API key header only if we have one
      if (process.env.COINGECKO_API_KEY) {
        config.headers = {
          'x-cg-demo-api-key': COINGECKO_API_KEY
        };
      }
      
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=pi-network&vs_currencies=usd`,
        config
      );

      const price = response.data['pi-network']?.usd || 0.21; // fallback to current market price
      
      this.lastPrice = {
        price,
        lastUpdated: new Date(),
      };
      
      console.log('Pi Price Service: Fetched new price from CoinGecko', price);
      
      // Save to database (handle errors gracefully)
      try {
        await storage.savePiPrice(price);
      } catch (dbError) {
        console.warn('Failed to save Pi price to database:', dbError);
      }

      return price;
    } catch (error) {
      console.error('Failed to fetch Pi price from CoinGecko:', error);
      
      // Try to get latest price from database
      try {
        const latestPrice = await storage.getLatestPiPrice();
        if (latestPrice) {
          const price = parseFloat(latestPrice.price);
          console.log('Pi Price Service: Using database price', price);
          return price;
        }
      } catch (dbError) {
        console.warn('Failed to get Pi price from database:', dbError);
      }

      // Fallback to default price
      console.log('Pi Price Service: Using fallback price', 0.21);
      return 0.21;
    }
  }

  calculatePiAmount(usdtValue: number): number {
    const piPrice = this.lastPrice?.price || 0.21;
    const result = parseFloat((usdtValue / piPrice).toFixed(8));
    console.log('Pi Price Service: Calculating Pi amount', { usdtValue, piPrice, result });
    return result;
  }

  calculateUsdAmount(piAmount: number): number {
    const piPrice = this.lastPrice?.price || 0.21;
    const result = parseFloat((piAmount * piPrice).toFixed(4));
    console.log('Pi Price Service: Calculating USD amount', { piAmount, piPrice, result });
    return result;
  }

  startPriceUpdates(): void {
    // Initial price fetch
    this.getCurrentPiPrice().catch(err => {
      console.warn('Initial Pi price fetch failed:', err);
    });

    // Update price every 60 seconds
    this.updateInterval = setInterval(async () => {
      try {
        await this.getCurrentPiPrice();
      } catch (err) {
        console.warn('Periodic Pi price fetch failed:', err);
      }
    }, 60000);
  }

  stopPriceUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  getLastPrice(): PiPriceData | null {
    return this.lastPrice;
  }
}

export const pricingService = new PricingService();

// Cleanup on process exit (only in non-serverless environments)
if (!process.env.VERCEL) {
  process.on('SIGINT', () => {
    pricingService.stopPriceUpdates();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    pricingService.stopPriceUpdates();
    process.exit(0);
  });
}