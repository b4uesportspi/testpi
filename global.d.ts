declare module "../dist/server/storage.js";
declare module "../dist/server/services/email.js";
declare module "../dist/server/services/email-robust.js";
declare module "../dist/server/services/transaction-emails.js";
declare module "../dist/server/services/pi-network.js";
declare module "../dist/server/services/pricing.js";
declare module "../server/storage.js";
declare module "../server/services/email.js";
declare module "../server/services/email-robust.js";
declare module "../server/services/transaction-emails.js";
declare module "../server/services/pi-network.js";
declare module "../server/services/pricing.js";
declare module "react-helmet";
declare module "compression";

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly VITE_PI_SANDBOX_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace Express {
  interface Request {
    admin?: {
      id?: string;
      username?: string;
      role?: string;
      [key: string]: unknown;
    };
  }
}
