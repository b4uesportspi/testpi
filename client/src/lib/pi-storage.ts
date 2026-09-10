/**
 * Resilient storage wrapper optimized for Pi Browser webviews.
 * 
 * Per Pi Network developer capabilities documentation:
 * - Pi Browser provides device-local storage for apps to maintain session tokens and non-critical data.
 * - Apps share a managed local storage pool where stale data may be evicted or quota limits reached.
 * - On iOS Pi Browser, iframes block third-party cookies by default, so reliable local storage
 *   is the primary mechanism for holding session authorization.
 * - Local storage contents stay strictly on the Pioneer's device and do NOT follow them across devices.
 * - Critical data (wallet, balances, payments, admin rights) MUST be verified authoritatively by backend.
 */

import { piLocalStorage } from './pi-local-storage';

class PiStorage {
  getItem(key: string): string | null {
    return piLocalStorage.getRaw(key);
  }

  setItem(key: string, value: string): void {
    piLocalStorage.setRaw(key, value);
  }

  removeItem(key: string): void {
    piLocalStorage.removeRaw(key);
  }

  clear(): void {
    piLocalStorage.clearAll();
  }

  // Helper shortcuts to piLocalStorage
  getUiPreference<T>(key: string, defaultValue: T): T {
    return piLocalStorage.getUiPreference(key, defaultValue);
  }

  setUiPreference<T>(key: string, value: T): void {
    piLocalStorage.setUiPreference(key, value);
  }

  getCachedData<T>(key: string, ttlMs?: number): T | null {
    return piLocalStorage.getCachedData(key, ttlMs);
  }

  setCachedData<T>(key: string, data: T, ttlMs?: number): void {
    piLocalStorage.setCachedData(key, data, ttlMs);
  }

  getFormDraft<T>(formName: string): T | null {
    return piLocalStorage.getFormDraft(formName);
  }

  setFormDraft<T>(formName: string, data: T): void {
    piLocalStorage.setFormDraft(formName, data);
  }

  clearFormDraft(formName: string): void {
    piLocalStorage.clearFormDraft(formName);
  }
}

export const piStorage = new PiStorage();
export { piLocalStorage };
