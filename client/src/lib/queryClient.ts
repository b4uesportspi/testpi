import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { piStorage } from "./pi-storage";

// Determine the base URL for API requests
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // In browser environment
    if (import.meta.env.DEV) {
      // In development, use relative URLs (will use proxy)
      return '';
    } else {
      // In production, use the deployed Vercel app URL
      return 'https://b4uesportstest.vercel.app';
    }
  }
  // For server-side rendering, use the Vercel URL
  return 'https://b4uesportstest.vercel.app';
};

const API_BASE_URL = getApiBaseUrl();

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    let errorMessage = `${res.status}: ${text}`;

    try {
      const parsed = JSON.parse(text);
      if (parsed?.message && typeof parsed.message === "string") {
        errorMessage = parsed.message;
      } else if (parsed?.error && typeof parsed.error === "string") {
        errorMessage = parsed.error;
      }
    } catch {
      // Keep the fallback text when the response is not JSON.
    }
    
    // Provide more user-friendly error messages
    switch (res.status) {
      case 401:
        errorMessage = errorMessage === `${res.status}: ${text}`
          ? "Authentication required. Please log in again."
          : errorMessage;
        break;
      case 403:
        errorMessage = "Access denied. You don't have permission to perform this action.";
        break;
      case 404:
        errorMessage = "Resource not found. The requested data could not be located.";
        break;
      case 500:
        errorMessage = "Server error. Please try again later.";
        break;
      case 503:
        errorMessage = "Service unavailable. The server is temporarily unavailable.";
        break;
    }
    
    throw new Error(errorMessage);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Get token from piStorage (safe for Pi Browser webviews)
  const token = piStorage.getItem('pi_token');
  
  // Construct full URL
  const fullUrl = url.startsWith('/api') ? `${API_BASE_URL}${url}` : url;
  
  const headers: Record<string, string> = {};
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  // Add timeout to fetch requests
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
  
  try {
    const res = await fetch(fullUrl, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      signal: controller.signal,
    });

    // Auto-clear expired session on 401 so user is prompted to re-login
    if (res.status === 401) {
      piStorage.removeItem('pi_token');
      piStorage.removeItem('pi_user');
    }

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    // Handle timeout specifically
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout. Please check your connection and try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  <T>({ on401: unauthorizedBehavior }: { on401: UnauthorizedBehavior }) =>
  async ({ queryKey }): Promise<T> => {
    // Get token from piStorage
    const token = piStorage.getItem('pi_token');
    
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    // Log the queryKey to help debug issues
    const url = queryKey.join("/") as string;
    console.log('Making GET request to:', url, 'with queryKey:', queryKey);
    
    // Construct full URL
    const fullUrl = url.startsWith('/api') ? `${API_BASE_URL}${url}` : url;
    
    // Special handling for profile endpoint - it now supports GET requests
    if (url === '/api/profile' || url.includes('/api/profile')) {
      console.log('Making GET request to profile endpoint');
    }
    
    // Add timeout to fetch requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      const res = await fetch(fullUrl, {
        headers,
        credentials: "include",
        signal: controller.signal,
      });

      console.log('Response from', fullUrl, ':', res.status, res.statusText);
      
      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return Promise.resolve(null) as Promise<T>;
      }

      await throwIfResNotOk(res);
      return res.json();
    } catch (error) {
      // Handle timeout specifically
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout. Please check your connection and try again.');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

