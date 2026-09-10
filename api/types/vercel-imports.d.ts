// Declaration file for dynamically imported modules in Vercel build
// These declarations tell TypeScript to treat these imports as 'any' type

declare module '../dist/server/storage.js' {
  const content: any;
  export = content;
}

declare module '../dist/server/services/email.js' {
  const content: any;
  export = content;
}

declare module '../dist/server/services/email-robust.js' {
  const content: any;
  export = content;
}

declare module '../dist/server/services/pi-network.js' {
  const content: any;
  export = content;
}

declare module '../dist/server/services/transaction-emails.js' {
  const content: any;
  export = content;
}

declare module '../dist/server/services/pricing.js' {
  const content: any;
  export = content;
}