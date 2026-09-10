import { enforceWalletTransactionAccess } from '../server/wallet-access.ts';

describe('wallet transaction access', () => {
  it('allows the authenticated user to access their own wallet history', () => {
    expect(
      enforceWalletTransactionAccess({
        currentUserId: 'user-1',
        requestedUserId: 'user-1',
      }).allowed,
    ).toBe(true);
  });

  it('denies a different user from fetching someone else\'s wallet history', () => {
    const result = enforceWalletTransactionAccess({
      currentUserId: 'user-1',
      requestedUserId: 'user-2',
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('scoped to the authenticated user');
  });

  it('allows admins to access all wallet history as before', () => {
    expect(
      enforceWalletTransactionAccess({
        currentUserId: 'user-1',
        requestedUserId: 'user-2',
        isAdmin: true,
      }).allowed,
    ).toBe(true);
  });
});
