declare module '../dist/server/storage.js' {
  import type { 
    User, 
    InsertUser,
    Package,
    InsertPackage,
    Transaction,
    InsertTransaction,
    Admin,
    InsertAdmin,
    PiPriceHistory
  } from '../../shared/schema.js';

  export interface IStorage {
    // Users
    getUser(id: string): Promise<User | undefined>;
    getUserByPiUID(piUID: string): Promise<User | undefined>;
    createUser(user: InsertUser): Promise<User>;
    updateUser(id: string, user: Partial<User>): Promise<User | undefined>;
    addUserTokens(id: string, amount: number): Promise<User | undefined>;
    
    // Packages
    getPackages(): Promise<Package[]>;
    getActivePackages(): Promise<Package[]>;
    getPackage(id: string): Promise<Package | undefined>;
    createPackage(pkg: InsertPackage): Promise<Package>;
    updatePackage(id: string, pkg: Partial<Package>): Promise<Package | undefined>;
    
    // Transactions
    getTransaction(id: string): Promise<Transaction | undefined>;
    getTransactionByPaymentId(paymentId: string): Promise<Transaction | undefined>;
    getUserTransactions(userId: string): Promise<Transaction[]>;
    createTransaction(transaction: InsertTransaction): Promise<Transaction>;
    updateTransaction(id: string, transaction: Partial<Transaction>): Promise<Transaction | undefined>;
    getAllTransactions(): Promise<(Transaction & { user: User; package: Package })[]>;
    
    // Admins
    getAdminByUsername(username: string): Promise<Admin | undefined>;
    getAllActiveAdmins(): Promise<Admin[]>;
    createAdmin(admin: InsertAdmin): Promise<Admin>;
    updateAdminLastLogin(id: string): Promise<void>;
    
    // Pi Price History
    savePiPrice(price: number): Promise<PiPriceHistory>;
    getLatestPiPrice(): Promise<PiPriceHistory | undefined>;
    
    // Analytics
    getAnalytics(): Promise<{
      totalUsers: number;
      totalTransactions: number;
      totalRevenue: number;
      successRate: number;
    }>;
    
    // Referral codes
    getUserByReferralCode(referralCode: string): Promise<User | undefined>;
    getUserReferralCode(userId: string): Promise<string | undefined>;
    rewardReferrer(referredUserId: string): Promise<void>;
    
    // Email functions
    getAllUserEmails(): Promise<string[]>;
    getAllAdminEmails(): Promise<string[]>;
  }

  export class DatabaseStorage implements IStorage {
    // Users
    getUser(id: string): Promise<User | undefined>;
    getUserByPiUID(piUID: string): Promise<User | undefined>;
    createUser(user: InsertUser): Promise<User>;
    updateUser(id: string, user: Partial<User>): Promise<User | undefined>;
    addUserTokens(id: string, amount: number): Promise<User | undefined>;
    
    // Packages
    getPackages(): Promise<Package[]>;
    getActivePackages(): Promise<Package[]>;
    getPackage(id: string): Promise<Package | undefined>;
    createPackage(pkg: InsertPackage): Promise<Package>;
    updatePackage(id: string, pkg: Partial<Package>): Promise<Package | undefined>;
    
    // Transactions
    getTransaction(id: string): Promise<Transaction | undefined>;
    getTransactionByPaymentId(paymentId: string): Promise<Transaction | undefined>;
    getUserTransactions(userId: string): Promise<Transaction[]>;
    createTransaction(transaction: InsertTransaction): Promise<Transaction>;
    updateTransaction(id: string, transaction: Partial<Transaction>): Promise<Transaction | undefined>;
    getAllTransactions(): Promise<(Transaction & { user: User; package: Package })[]>;
    
    // Admins
    getAdminByUsername(username: string): Promise<Admin | undefined>;
    getAllActiveAdmins(): Promise<Admin[]>;
    createAdmin(admin: InsertAdmin): Promise<Admin>;
    updateAdminLastLogin(id: string): Promise<void>;
    
    // Pi Price History
    savePiPrice(price: number): Promise<PiPriceHistory>;
    getLatestPiPrice(): Promise<PiPriceHistory | undefined>;
    
    // Analytics
    getAnalytics(): Promise<{
      totalUsers: number;
      totalTransactions: number;
      totalRevenue: number;
      successRate: number;
    }>;
    
    // Referral codes
    getUserByReferralCode(referralCode: string): Promise<User | undefined>;
    getUserReferralCode(userId: string): Promise<string | undefined>;
    rewardReferrer(referredUserId: string): Promise<void>;
    
    // Email functions
    getAllUserEmails(): Promise<string[]>;
    getAllAdminEmails(): Promise<string[]>;
  }
  
  export const databaseStorage: DatabaseStorage;
}

declare module '../dist/server/storage.js' {
  export const storage: any;
}

declare module '../server/storage.js' {
  export const storage: any;
}
