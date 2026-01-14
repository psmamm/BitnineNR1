import { useState, useEffect, useCallback } from 'react';
import { auth } from '../lib/firebase';

export function buildApiUrl(path: string): string {
  // Check for env variable first, then use production URL as fallback
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ||
    (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
      ? 'https://circl.workers.dev'
      : '');

  // If API_BASE_URL is set, use it (production)
  if (apiBaseUrl) {
    return `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  }

  // Otherwise use relative path (local development)
  if (path.startsWith('/')) {
    return path;
  }
  return `/${path}`;
}

// Helper to get auth headers with Firebase token
async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  const user = auth.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    } catch (e) {
      console.error('Failed to get Firebase token:', e);
    }
  }
  return headers;
}

export function useApi<T>(url: string, options?: RequestInit) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const authHeaders = await getAuthHeaders();
      const fullUrl = buildApiUrl(url);

      const response = await fetch(fullUrl, {
        credentials: 'include',
        ...options,
        headers: {
          ...authHeaders,
          ...options?.headers,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [url, options]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useApiMutation<T = unknown>(
  url: string,
  options?: Omit<RequestInit, 'body'>
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async (data?: unknown): Promise<T> => {
    try {
      setLoading(true);
      setError(null);

      const authHeaders = await getAuthHeaders();
      const fullUrl = buildApiUrl(url);

      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        credentials: 'include',
        body: data ? JSON.stringify(data) : undefined,
        ...options,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { mutate, loading, error };
}
