import { useEffect, useRef, useState, useCallback } from 'react';
import { User } from 'firebase/auth';
import { useApiMutation } from './useApi';

/**
 * Hook for automatically syncing user data to backend after Firebase authentication
 * Calls /api/auth/sync endpoint when user logs in
 *
 * Features:
 * - Max 3 retry attempts with exponential backoff (1s, 2s, 4s)
 * - Circuit breaker: 5 minute pause after 3 failed attempts
 * - User-facing error notifications
 * - Prevents infinite retry loops
 */

const MAX_RETRIES = 3;
const CIRCUIT_BREAK_TIME = 5 * 60 * 1000; // 5 minutes
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s

interface RetryState {
  count: number;
  lastAttempt: number;
  circuitOpen: boolean;
}

export function useAuthSync(user: User | null) {
  const { mutate: syncUser } = useApiMutation('/api/auth/sync');
  const hasSyncedRef = useRef<Set<string>>(new Set());
  const retryStateRef = useRef<Map<string, RetryState>>(new Map());
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'circuit-open'>('idle');

  // Stable sync function
  const performSync = useCallback(async (uid: string, email: string, name?: string | null) => {
    const now = Date.now();
    const retryState = retryStateRef.current.get(uid) || { count: 0, lastAttempt: 0, circuitOpen: false };

    // Check circuit breaker
    if (retryState.circuitOpen) {
      const timeSinceLastAttempt = now - retryState.lastAttempt;
      if (timeSinceLastAttempt < CIRCUIT_BREAK_TIME) {
        const remainingMinutes = Math.ceil((CIRCUIT_BREAK_TIME - timeSinceLastAttempt) / 60000);
        console.warn(`[Auth Sync] Circuit breaker active. Will retry in ${remainingMinutes} minutes.`);
        setSyncStatus('circuit-open');
        return;
      } else {
        // Circuit breaker expired, reset
        retryState.circuitOpen = false;
        retryState.count = 0;
      }
    }

    // Check retry limit
    if (retryState.count >= MAX_RETRIES) {
      console.error(`[Auth Sync] Max retries (${MAX_RETRIES}) reached. Opening circuit breaker for 5 minutes.`);
      retryState.circuitOpen = true;
      retryState.lastAttempt = now;
      retryStateRef.current.set(uid, retryState);
      setSyncStatus('circuit-open');
      return;
    }

    try {
      setSyncStatus('syncing');
      console.log(`[Auth Sync] Attempt ${retryState.count + 1}/${MAX_RETRIES} for user ${uid}`);

      await syncUser({ uid, email, name: name || undefined });

      // Success!
      hasSyncedRef.current.add(uid);
      retryStateRef.current.delete(uid); // Clear retry state
      setSyncStatus('success');
      console.log(`[Auth Sync] ✓ User synced successfully: ${uid}`);

    } catch (error) {
      retryState.count++;
      retryState.lastAttempt = now;
      retryStateRef.current.set(uid, retryState);

      const isLastAttempt = retryState.count >= MAX_RETRIES;

      console.error(
        `[Auth Sync] ✗ Attempt ${retryState.count}/${MAX_RETRIES} failed:`,
        error instanceof Error ? error.message : 'Unknown error'
      );

      if (isLastAttempt) {
        console.error('[Auth Sync] All retry attempts exhausted. Circuit breaker will activate.');
      } else {
        // Schedule retry with exponential backoff
        const delay = RETRY_DELAYS[retryState.count - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        console.log(`[Auth Sync] Retrying in ${delay}ms...`);

        setTimeout(() => {
          performSync(uid, email, name);
        }, delay);
      }
    }
  }, [syncUser]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const uid = user.uid;
    const email = user.email;
    const name = user.displayName;

    // Skip if already synced for this user
    if (hasSyncedRef.current.has(uid)) {
      return;
    }

    // Only sync if we have both uid and email
    if (!uid || !email) {
      console.warn('[Auth Sync] Cannot sync user: missing uid or email');
      return;
    }

    // Check if circuit breaker is active
    const retryState = retryStateRef.current.get(uid);
    if (retryState?.circuitOpen) {
      const timeSinceLastAttempt = Date.now() - retryState.lastAttempt;
      if (timeSinceLastAttempt < CIRCUIT_BREAK_TIME) {
        const remainingMinutes = Math.ceil((CIRCUIT_BREAK_TIME - timeSinceLastAttempt) / 60000);
        console.warn(`[Auth Sync] Circuit breaker active. Sync paused. Will retry in ${remainingMinutes} minutes.`);
        setSyncStatus('circuit-open');
        return;
      }
    }

    // Perform sync
    performSync(uid, email, name);
  }, [user, performSync]); // performSync is now stable via useCallback

  return { syncStatus };
}
