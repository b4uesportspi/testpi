import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Utility function to merge class names with tailwind-merge
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Utility function to ensure Pi SDK is loaded
export function loadPiSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if Pi SDK is already loaded
    if (typeof window !== 'undefined' && window.Pi) {
      resolve();
      return;
    }

    // If in browser environment, check for the script
    if (typeof window !== 'undefined') {
      // Look for the Pi SDK script
      const piScript = document.querySelector('script[src*="pi-sdk.js"]');
      
      if (piScript) {
        // If script exists, wait for it to load
        piScript.addEventListener('load', () => resolve());
        piScript.addEventListener('error', () => reject(new Error('Pi SDK script failed to load')));
      } else {
        // If script doesn't exist, reject
        reject(new Error('Pi SDK script not found'));
      }
    } else {
      // Not in browser environment
      reject(new Error('Pi SDK can only be loaded in browser environment'));
    }
  });
}

// Utility function to delay execution
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}