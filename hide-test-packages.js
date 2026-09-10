import { db } from './server/db.ts';
import { packages } from './shared/schema.ts';
import { ilike, eq } from 'drizzle-orm';

async function hideTestPackages() {
  if (!db) {
    console.log('Database not initialized');
    process.exit(1);
  }

  try {
    // Find packages that have 'test' in their name (case insensitive)
    const testPackages = await db.select()
      .from(packages)
      .where(ilike(packages.name, '%test%'));
    
    console.log(`Found ${testPackages.length} test packages to deactivate:`);
    testPackages.forEach(pkg => {
      console.log(`- ID: ${pkg.id}, Name: ${pkg.name}, Game: ${pkg.game}, Active: ${pkg.isActive}`);
    });

    // Update these packages to set isActive to false
    if (testPackages.length > 0) {
      for (const pkg of testPackages) {
        await db.update(packages)
          .set({ isActive: false })
          .where(eq(packages.id, pkg.id));
        console.log(`Deactivated package: ${pkg.name}`);
      }
      console.log(`${testPackages.length} test packages have been deactivated.`);
    } else {
      console.log('No test packages found.');
    }
  } catch (error) {
    console.error('Error hiding test packages:', error);
  }
}

hideTestPackages();