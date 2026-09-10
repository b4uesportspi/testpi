/**
 * Script to deactivate the 0.06 UC package directly in the database
 * Run with: npx tsx deactivate-0.06-uc.ts
 */

import { db } from './server/db.js';
import { packages as packagesTable } from './shared/schema.js';
import { eq, and } from 'drizzle-orm';

async function deactivatePackage() {
  try {
    if (!db) {
      console.error('❌ Database not initialized');
      return;
    }

    console.log('Finding 0.06 UC package...');
    
    // Find the 0.06 UC package
    const pkg = await db.query.packages.findFirst({
      where: and(
        eq(packagesTable.name, '0.06 UC'),
        eq(packagesTable.game, 'PUBG')
      )
    });

    if (!pkg) {
      console.error('❌ 0.06 UC package not found in database!');
      process.exit(1);
    }

    console.log(`Found package:`, {
      id: pkg.id,
      game: pkg.game,
      name: pkg.name,
      isActive: pkg.isActive
    });

    if (!pkg.isActive) {
      console.log('✅ Package is already deactivated!');
      process.exit(0);
    }

    // Update the package to deactivate it
    console.log('\nDeactivating package...');
    const result = await db
      .update(packagesTable)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(packagesTable.id, pkg.id))
      .returning();

    if (result && result.length > 0) {
      console.log('✅ SUCCESS! 0.06 UC package has been deactivated');
      console.log(`Package:`, {
        id: result[0].id,
        name: result[0].name,
        game: result[0].game,
        isActive: result[0].isActive
      });
      process.exit(0);
    } else {
      console.error('❌ Failed to deactivate package');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

deactivatePackage();
