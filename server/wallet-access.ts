export function enforceWalletTransactionAccess({
  currentUserId,
  requestedUserId,
  isAdmin = false,
}: {
  currentUserId?: string | null;
  requestedUserId?: string | null;
  isAdmin?: boolean;
}): { allowed: boolean; reason?: string } {
  if (!currentUserId || typeof currentUserId !== 'string' || currentUserId.trim() === '') {
    return {
      allowed: false,
      reason: 'Unauthenticated user',
    };
  }

  if (isAdmin) {
    return { allowed: true };
  }

  if (requestedUserId && requestedUserId !== currentUserId) {
    return {
      allowed: false,
      reason: 'Forbidden: transaction history is scoped to the authenticated user',
    };
  }

  return { allowed: true };
}
