import { execSync } from 'child_process';
import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync, rmSync } from 'fs';
import { join } from 'path';

console.log('Starting Vercel build process...');

try {
  // Clean dist directory if it exists
  if (existsSync('dist')) {
    console.log('Cleaning dist directory...');
    rmSync('dist', { recursive: true, force: true });
  }

  // Create dist directory
  console.log('Creating dist directory...');
  mkdirSync('dist', { recursive: true });

  // Copy locale files BEFORE vite build so they're available during build
  console.log('Pre-copying locale files for vite build...');
  mkdirSync('dist/public/locales', { recursive: true });
  if (existsSync('client/public/locales')) {
    const copyLocalesDir = (src, dest) => {
      const destPath = join(dest);
      if (!existsSync(destPath)) {
        mkdirSync(destPath, { recursive: true });
      }
      const entries = readdirSync(src, { withFileTypes: true });
      for (const entry of entries) {
        const srcPath = join(src, entry.name);
        const destPath = join(dest, entry.name);
        if (entry.isDirectory()) {
          copyLocalesDir(srcPath, destPath);
        } else {
          copyFileSync(srcPath, destPath);
        }
      }
    };
    copyLocalesDir('client/public/locales', 'dist/public/locales');
    console.log('Locale files pre-copied to dist/public/locales');
  }

  // Run the main build command
  console.log('Running vite build...');
  execSync('npx vite build --logLevel warn 2>&1 || true', { stdio: 'inherit', shell: true });
  // Verify the output was actually created
  if (!existsSync('dist/public/index.html')) {
    throw new Error('Vite build failed — dist/public/index.html not found');
  }
  console.log('Vite build completed.');

  console.log('Running esbuild for server...');
  execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --out-extension:.js=.js', { stdio: 'inherit' });
  execSync('npx esbuild server/db.ts server/storage.ts server/services/pricing.ts server/services/pi-network.ts server/services/email.ts server/services/email-robust.ts server/services/transaction-emails.ts api/services/email-monitor.ts --platform=node --packages=external --bundle --format=esm --outdir=dist/server --outbase=server --out-extension:.js=.js', { stdio: 'inherit' });
  execSync('npx esbuild shared/schema.ts shared/translations.ts --platform=node --packages=external --bundle --format=esm --outdir=dist/shared --out-extension:.js=.js', { stdio: 'inherit' });

  // Copy all files from public to dist/public so they're included in the static build
  console.log('Copying public directory to dist/public...');
  mkdirSync('dist/public', { recursive: true });
  const copyPublicDir = (src, dest) => {
    const destPath = join('dist', dest);
    if (!existsSync(destPath)) {
      mkdirSync(destPath, { recursive: true });
    }

    const entries = readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = join(src, entry.name);
      const destPath = join('dist', dest, entry.name);

      if (entry.isDirectory()) {
        copyPublicDir(join(src, entry.name), join(dest, entry.name));
      } else {
        copyFileSync(srcPath, destPath);
      }
    }
  };

  // Copy root public directory if it exists
  if (existsSync('public')) {
    copyPublicDir('public', 'public');
    console.log('Root public directory copied to dist/public');
  } else {
    console.warn('Root public directory not found');
  }

  // Copy client public directory to dist/public
  if (existsSync('client/public')) {
    console.log('Copying client/public directory to dist/public...');
    // Merge client/public into dist/public
    const copyClientPublicDir = (src, dest) => {
      const destPath = join('dist', dest);
      if (!existsSync(destPath)) {
        mkdirSync(destPath, { recursive: true });
      }

      const entries = readdirSync(src, { withFileTypes: true });
      for (const entry of entries) {
        const srcPath = join(src, entry.name);
        const destPath = join('dist', dest, entry.name);
        console.log(`Copying ${srcPath} to ${destPath}`);

        if (entry.isDirectory()) {
          copyClientPublicDir(join(src, entry.name), join(dest, entry.name));
        } else {
          copyFileSync(srcPath, destPath);
        }
      }
    };
    
    copyClientPublicDir('client/public', 'public');
    console.log('Client public directory copied to dist/public');
  } else {
    console.warn('Client public directory not found');
  }

  console.log('Vercel build process completed successfully!');
} catch (error) {
  console.error('Vercel build process failed:', error);
  process.exit(1);
}
