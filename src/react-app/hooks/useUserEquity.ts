import { useState, useEffect } from 'react';

export interface UserEquity {
  startingCapital: number;
  currentEquity: number;
  lastUpdated: string;
}

const DEFAULT_EQUITY: UserEquity = {
  startingCapital: 10000,
  currentEquity: 10000,
  lastUpdated: new Date().toISOString()
};

export function useUserEquity() {
  const [equity, setEquity] = useState<UserEquity>(DEFAULT_EQUITY);
  const [loading, setLoading] = useState(false);

  // Load equity from localStorage on mount
  useEffect(() => {
    try {
      const savedEquity = localStorage.getItem('tradecircle_user_equity');
      if (savedEquity) {
        const parsed = JSON.parse(savedEquity);
        setEquity({ ...DEFAULT_EQUITY, ...parsed });
      }
    } catch (error) {
      console.error('Failed to load user equity:', error);
    }
  }, []);

  // Save equity to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('tradecircle_user_equity', JSON.stringify(equity));
    } catch (error) {
      console.error('Failed to save user equity:', error);
    }
  }, [equity]);

  const updateStartingCapital = async (newCapital: number): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      
      if (newCapital <= 0) {
        return { success: false, error: 'Capital must be greater than 0' };
      }

      const updatedEquity: UserEquity = {
        startingCapital: newCapital,
        currentEquity: newCapital, // Reset current equity to new starting capital
        lastUpdated: new Date().toISOString()
      };

      setEquity(updatedEquity);
      
      return { success: true };
    } catch (error) {
      console.error('Failed to update starting capital:', error);
      return { success: false, error: 'Failed to update capital' };
    } finally {
      setLoading(false);
    }
  };

  const updateCurrentEquity = (newEquity: number) => {
    setEquity(prev => ({
      ...prev,
      currentEquity: newEquity,
      lastUpdated: new Date().toISOString()
    }));
  };

  const resetEquity = () => {
    setEquity(DEFAULT_EQUITY);
  };

  return {
    equity,
    loading,
    updateStartingCapital,
    updateCurrentEquity,
    resetEquity
  };
}
