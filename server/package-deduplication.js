export function normalizePackageIdentity(pkg) {
  const game = String(pkg?.game ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/[^A-Z0-9 ]/g, '')
    .trim();

  const name = String(pkg?.name ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  return `${game}::${name}`;
}

export function dedupePackages(packages) {
  const seen = new Map();

  for (const pkg of packages) {
    const key = normalizePackageIdentity(pkg);
    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, pkg);
      continue;
    }

    const existingIsNewer = new Date(pkg.createdAt || 0) > new Date(existing.createdAt || 0);
    const shouldReplace = existingIsNewer || (!existing.isActive && pkg.isActive);

    if (shouldReplace) {
      seen.set(key, pkg);
    } else if (!existing.isActive && pkg.isActive) {
      seen.set(key, { ...existing, isActive: true });
    }
  }

  return Array.from(seen.values());
}
