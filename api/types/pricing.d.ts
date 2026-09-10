// Direct declaration for exact path that Vercel is looking for
declare module '../dist/server/services/pricing.js' {
  export class PricingService {
    lastPrice: { price: number; lastUpdated: Date } | null;
    updateInterval: NodeJS.Timeout | null;
    
    constructor();
    
    getCurrentPiPrice(): Promise<number>;
    calculatePiAmount(usdtValue: number): number;
    calculateUsdAmount(piAmount: number): number;
    startPriceUpdates(): void;
    stopPriceUpdates(): void;
    getLastPrice(): { price: number; lastUpdated: Date } | null;
  }
  
  export const pricingService: any;
}

declare module '../server/services/pricing.js' {
  export const pricingService: any;
}

// Also declare the module with the correct path for dynamic imports
declare module '@/dist/server/services/pricing.js' {
  export const pricingService: import('../dist/server/services/pricing.js').PricingService;
}

// Add function declarations as needed
declare module '../dist/server/services/pricing.js' {
  export function calculatePiPrice(usdAmount: number): Promise<number>;
  export function getPiPriceInUSD(): Promise<number>;
}
