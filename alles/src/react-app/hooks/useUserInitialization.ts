import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApiMutation } from './useApi';

export function useUserInitialization() {
  const { user } = useAuth();
  const { mutate: initializeUser } = useApiMutation('/api/users/initialize');

  useEffect(() => {
    if (user) {
      // Initialize user data on first login
      initializeUser().catch(console.error);
    }
  }, [user]);
}
