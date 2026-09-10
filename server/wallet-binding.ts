const ADMIN_WALLET_ADDRESS = 'GBGHA73VUPUEJBH76RDMJVWGJNZNRVGJLFLFUV2OO6DPIRFO5DS2NOER';

export function normalizeWalletAddress(address: unknown): string {
  return String(address ?? '').trim();
}

export function isAdminWalletAddress(address: unknown): boolean {
  return normalizeWalletAddress(address) === ADMIN_WALLET_ADDRESS;
}

export function isValidStellarAddress(address: unknown): address is string {
  const normalized = normalizeWalletAddress(address);
  return /^G[A-Z2-7]{55}$/.test(normalized);
}

export type WalletBindingDecision = {
  allowed: boolean;
  action: 'allow' | 'reject' | 'noop';
  reason?: string;
};

export function evaluateWalletBinding({
  incomingWalletAddress,
  currentWalletAddress,
  duplicateOwnerUserId,
  authenticatedUserId,
  isAdminUser,
  allowWalletUpdate = true,
}: {
  incomingWalletAddress: unknown;
  currentWalletAddress: unknown;
  duplicateOwnerUserId?: string | number | null;
  authenticatedUserId?: string | number | null;
  isAdminUser?: boolean;
  allowWalletUpdate?: boolean;
}): WalletBindingDecision {
  const normalizedIncoming = normalizeWalletAddress(incomingWalletAddress);
  const normalizedCurrent = normalizeWalletAddress(currentWalletAddress);

  if (!normalizedIncoming) {
    return { allowed: false, action: 'reject', reason: 'No wallet address available.' };
  }

  if (isAdminWalletAddress(normalizedIncoming) && !isAdminUser) {
    return {
      allowed: false,
      action: 'reject',
      reason: 'Admin wallet is reserved for the owner account.',
    };
  }

  // Strictly enforce: No two distinct users can EVER share the same wallet address!
  if (duplicateOwnerUserId && String(duplicateOwnerUserId) !== String(authenticatedUserId || '')) {
    return {
      allowed: false,
      action: 'reject',
      reason: 'Wallet already connected to another account.',
    };
  }

  // If the user already has this exact wallet connected, it is a valid no-op
  if (normalizedCurrent === normalizedIncoming) {
    return {
      allowed: true,
      action: 'noop',
      reason: undefined,
    };
  }

  // If user has a different wallet connected and updates are disallowed
  if (normalizedCurrent && normalizedCurrent !== normalizedIncoming && !allowWalletUpdate) {
    return {
      allowed: false,
      action: 'reject',
      reason: 'Wallet already connected to a different address.',
    };
  }

  return {
    allowed: true,
    action: 'allow',
    reason: undefined,
  };
}
