import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

try {
  console.log('Starting build process...');

  // Clean dist directory
  if (fs.existsSync('dist')) {
    console.log('Cleaning dist directory...');
    fs.rmSync('dist', { recursive: true });
  }

  // Create dist directory
  console.log('Creating dist directory...');
  fs.mkdirSync('dist', { recursive: true });

  // Copy locale files BEFORE vite build so they're available during build
  console.log('Pre-copying locale files for vite build...');
  fs.mkdirSync('dist/public/locales', { recursive: true });
  if (fs.existsSync('client/public/locales')) {
    const copyLocalesDir = (src, dest) => {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      const entries = fs.readdirSync(src, { withFileTypes: true });
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
          copyLocalesDir(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    };
    copyLocalesDir('client/public/locales', 'dist/public/locales');
    console.log('Locale files pre-copied to dist/public/locales');
  }

  // Run vite build
  console.log('Running vite build...');
  execSync('npx vite build', { stdio: 'inherit' });

  // Run esbuild for server
  console.log('Running esbuild for server...');
  execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --out-extension:.js=.js', { stdio: 'inherit' });

  // Run esbuild for server services and shared code
  execSync('npx esbuild server/db.ts server/storage.ts server/services/pricing.ts server/services/pi-network.ts server/services/email.ts server/services/email-robust.ts server/services/transaction-emails.ts --platform=node --packages=external --bundle --format=esm --outdir=dist/server --out-extension:.js=.js', { stdio: 'inherit' });
  
  // Run esbuild for server tasks
  execSync('npx esbuild server/tasks/send-feedback-emails.ts server/tasks/sync-transactions.ts server/tasks/backfill-feedback-emails.ts server/tasks/mark-abandoned-payments.ts --platform=node --packages=external --bundle --format=esm --outdir=dist/tasks --out-extension:.js=.js', { stdio: 'inherit' });
  
  // Run esbuild for API services
  execSync('npx esbuild api/services/transaction-sync.ts --platform=node --packages=external --bundle --format=esm --outdir=dist/api/services --out-extension:.js=.js', { stdio: 'inherit' });

  execSync('npx esbuild shared/schema.ts shared/translations.ts --platform=node --packages=external --bundle --format=esm --outdir=dist/shared --out-extension:.js=.js', { stdio: 'inherit' });

  // Copy all files from public to dist/public so they're included in the static build
  console.log('Copying public directory to dist/public...');
  fs.cpSync('public', 'dist/public', { recursive: true });

  // Also copy client/public to dist/public
  console.log('Copying client/public directory to dist/public...');
  if (fs.existsSync('client/public')) {
    // Copy all files from client/public to dist/public
    fs.cpSync('client/public', 'dist/public', { recursive: true });
  }

  console.log('Build process completed successfully!');
} catch (error) {
  console.error('Build process failed:', error);
  process.exit(1);
}