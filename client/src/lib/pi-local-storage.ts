/**
 * Pi Browser-Managed Local Device Storage Engine
 * 
 * ARCHITECTURAL PRINCIPLES (Per Pi Network Developer Guidelines):
 * 1. Pi Browser local storage contents stay strictly on the Pioneer's device
 *    and are NOT uploaded to Pi servers (it is NOT cloud storage).
 * 2. If a Pioneer changes devices, local storage does not follow them.
 * 3. Local storage reduces backend infrastructure load by offloading:
 *    - UI Preferences (active navigation tabs, view filters, balance privacy)
 *    - Language Preferences & Translation bundle cache
 *    - Currency & Unit display preferences
 *    - Temporary Form Drafts (tournament signups, order inputs)
 *    - Non-Critical Cache (catalog packages, tournaments preview with TTL)
 * 
 * 4. CRITICAL DATA THAT MUST NEVER RELY ON LOCAL STORAGE AS AUTHORITATIVE:
 *    ❌ Pi wallet address (authoritative on backend & Stellar Horizon)
 *    ❌ Payment confirmation (authoritative on backend & blockchain txid)
 *    ❌ Order status (authoritative on PostgreSQL DB)
 *    ❌ User token balance (authoritative on backend /api/profile & DB)
 *    ❌ Referral balance (authoritative on PostgreSQL DB)
 *    ❌ Pi transaction ID & history (authoritative on PostgreSQL DB)
 *    ❌ Admin permissions (authoritative on verified backend JWT & DB)
 *    ❌ Authentication authority (authoritative on server verification)
 *    ❌ Security / audit logs (authoritative on PostgreSQL DB)
 */

interface CacheEnvelope<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

// Keys forbidden from being stored or trusted as authoritative source of truth
const FORBIDDEN_AUTHORITATIVE_KEYS = new Set([
  'wallet_address',
  'pi_wallet_address',
  'user_wallet_address',
  'user_tokens',
  'token_balance',
  'referral_balance',
  'payment_status',
  'order_status',
  'is_admin',
  'admin_permissions',
  'transaction_history',
  'audit_log',
]);

class PiLocalStorageManager {
  private memFallback = new Map<string, string>();

  /**
   * Safe read from device storage with in-memory fallback.
   * Handles iOS iframe cookie/storage restrictions and quota errors.
   */
  getRaw(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch (e) {
      console.warn(`[PiLocalStorage] Safe read failed for "${key}", falling back to memory:`, e);
    }
    return this.memFallback.get(key) ?? null;
  }

  /**
   * Safe write to device storage with in-memory fallback.
   * Enforces security boundaries against storing authoritative financial/auth keys.
   */
  setRaw(key: string, value: string): void {
    // Security check: prevent storing sensitive authoritative state
    if (FORBIDDEN_AUTHORITATIVE_KEYS.has(key.toLowerCase())) {
      console.error(
        `[PiLocalStorage Security Violation] Attempted to store authoritative key "${key}" in device local storage! ` +
        `Authoritative financial and security state must strictly reside on the backend database.`
      );
      return;
    }

    this.memFallback.set(key, value);

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e: any) {
      console.warn(`[PiLocalStorage] Failed to persist "${key}" to device storage (quota or iframe restrictions):`, e?.message);
    }
  }

  /**
   * Safe removal of key from device storage and memory fallback.
   */
  removeRaw(key: string): void {
    this.memFallback.delete(key);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn(`[PiLocalStorage] Safe remove failed for "${key}":`, e);
    }
  }

  /**
   * Safe clear of all device storage and memory fallback.
   */
  clearAll(): void {
    this.memFallback.clear();
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch (e) {
      console.warn('[PiLocalStorage] Safe clear failed:', e);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 1. UI Preferences (Device-Only)
  // ─────────────────────────────────────────────────────────────

  getUiPreference<T>(prefKey: string, defaultValue: T): T {
    const raw = this.getRaw(`b4u_ui_${prefKey}`);
    if (raw === null) return defaultValue;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return (raw as unknown) as T;
    }
  }

  setUiPreference<T>(prefKey: string, value: T): void {
    this.setRaw(`b4u_ui_${prefKey}`, JSON.stringify(value));
  }

  removeUiPreference(prefKey: string): void {
    this.removeRaw(`b4u_ui_${prefKey}`);
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Temporary Form Drafts (Auto-recovers on app switch/reload)
  // ─────────────────────────────────────────────────────────────

  getFormDraft<T>(formName: string): T | null {
    const raw = this.getRaw(`b4u_draft_${formName}`);
    if (!raw) return null;
    try {
      const parsed: { data: T; savedAt: number } = JSON.parse(raw);
      // Drafts expire after 48 hours to avoid stale data
      if (Date.now() - parsed.savedAt > 48 * 60 * 60 * 1000) {
        this.clearFormDraft(formName);
        return null;
      }
      return parsed.data;
    } catch {
      return null;
    }
  }

  setFormDraft<T>(formName: string, data: T): void {
    const payload = {
      data,
      savedAt: Date.now(),
    };
    this.setRaw(`b4u_draft_${formName}`, JSON.stringify(payload));
  }

  clearFormDraft(formName: string): void {
    this.removeRaw(`b4u_draft_${formName}`);
  }

  // ─────────────────────────────────────────────────────────────
  // 3. Non-Critical Cache with TTL (Stale-While-Revalidate)
  // ─────────────────────────────────────────────────────────────

  getCachedData<T>(cacheKey: string, ttlMs: number = 5 * 60 * 1000): T | null {
    const raw = this.getRaw(`b4u_cache_${cacheKey}`);
    if (!raw) return null;
    try {
      const envelope: CacheEnvelope<T> = JSON.parse(raw);
      const isExpired = Date.now() - envelope.timestamp > ttlMs;
      if (isExpired) {
        // Return stale data for instant display, caller can revalidate in background
        return envelope.data;
      }
      return envelope.data;
    } catch {
      return null;
    }
  }

  isCacheFresh(cacheKey: string, ttlMs: number = 5 * 60 * 1000): boolean {
    const raw = this.getRaw(`b4u_cache_${cacheKey}`);
    if (!raw) return false;
    try {
      const envelope: CacheEnvelope<any> = JSON.parse(raw);
      return Date.now() - envelope.timestamp <= ttlMs;
    } catch {
      return false;
    }
  }

  setCachedData<T>(cacheKey: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    const envelope: CacheEnvelope<T> = {
      data,
      timestamp: Date.now(),
      ttlMs,
    };
    this.setRaw(`b4u_cache_${cacheKey}`, JSON.stringify(envelope));
  }

  clearCache(cacheKey: string): void {
    this.removeRaw(`b4u_cache_${cacheKey}`);
  }
}

export const piLocalStorage = new PiLocalStorageManager();
