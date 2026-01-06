import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { buildApiUrl } from '../../hooks/useApi';

interface UserLockoutData {
  lockout_until: number | null;
}

export default function RiskLockdownOverlay() {
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Fetch lockout status
  useEffect(() => {
    const fetchLockoutStatus = async () => {
      try {
        const response = await fetch(buildApiUrl('/api/users/me'), {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          // Check if lockout_until exists in response
          if (data.lockout_until !== undefined && data.lockout_until !== null) {
            const lockoutTimestamp = typeof data.lockout_until === 'number' 
              ? data.lockout_until 
              : Math.floor(new Date(data.lockout_until).getTime() / 1000);
            setLockoutUntil(lockoutTimestamp);
          } else {
            setLockoutUntil(null);
          }
        }
      } catch (error) {
        console.error('Failed to fetch lockout status:', error);
        setLockoutUntil(null);
      } finally {
        setLoading(false);
      }
    };

    fetchLockoutStatus();
    
    // Refresh every 30 seconds to check if lockout expired
    const interval = setInterval(fetchLockoutStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Calculate time remaining and update countdown
  useEffect(() => {
    if (!lockoutUntil) {
      setTimeRemaining('');
      return;
    }

    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = lockoutUntil - now;

      if (remaining <= 0) {
        setLockoutUntil(null);
        setTimeRemaining('');
        return;
      }

      // Calculate hours, minutes, seconds
      const hours = Math.floor(remaining / 3600);
      const minutes = Math.floor((remaining % 3600) / 60);
      const seconds = remaining % 60;

      // Format as HH:MM:SS
      const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      setTimeRemaining(formatted);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [lockoutUntil]);

  // Don't show overlay if loading, no lockout, or lockout expired
  if (loading || !lockoutUntil || timeRemaining === '') {
    return null;
  }

  // Check if lockout is still in the future
  const now = Math.floor(Date.now() / 1000);
  if (lockoutUntil <= now) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center"
      style={{ pointerEvents: 'auto' }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center px-6"
      >
        {/* Large Emoji */}
        <div className="mb-6">
          <span 
            className="text-8xl"
            style={{ 
              fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif',
              display: 'block'
            }}
          >
            🛑
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
          TRADING HALTED
        </h1>

        {/* Subline */}
        <p className="text-xl text-gray-400 mb-8">
          Daily Loss Limit Reached.
        </p>

        {/* Countdown Timer */}
        <div className="mb-4">
          <p className="text-sm text-gray-500 mb-2 uppercase tracking-wider">
            Unlocks in
          </p>
          <div className="text-6xl font-mono font-bold text-white tracking-wider">
            {timeRemaining}
          </div>
        </div>

        {/* Additional Info */}
        <p className="text-sm text-gray-500 mt-8 max-w-md mx-auto">
          You've reached your daily loss limit. Trading log access will be restored automatically at 6:00 AM UTC.
        </p>
      </motion.div>
    </motion.div>
  );
}

