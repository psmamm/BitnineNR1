import { useState, useEffect } from 'react';
import { Lock, CheckCircle2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { getCardBg, getCardBorder, getTextColor } from '../../utils/themeUtils';
import { buildApiUrl } from '../../hooks/useApi';
import { useAuth } from '../../contexts/AuthContext';

interface ToastState {
  show: boolean;
  message: string;
  type: 'success' | 'error';
}

export default function RiskManagementSettings() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [riskLockEnabled, setRiskLockEnabled] = useState(false);
  const [maxDailyLoss, setMaxDailyLoss] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'success' });

  // Load current risk settings
  useEffect(() => {
    const loadRiskSettings = async () => {
      try {
        setLoading(true);
        const response = await fetch(buildApiUrl('/api/users/settings'), {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.riskManagement) {
            setRiskLockEnabled(data.riskManagement.risk_lock_enabled || false);
            setMaxDailyLoss(data.riskManagement.max_daily_loss ? String(data.riskManagement.max_daily_loss) : '');
          }
        }
      } catch (error) {
        console.error('Failed to load risk settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRiskSettings();
  }, []);

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // Handle save
  const handleSave = async () => {
    if (!user) {
      showToast('User not authenticated', 'error');
      return;
    }

    // Validate max_daily_loss if risk lock is enabled
    if (riskLockEnabled) {
      const lossValue = parseFloat(maxDailyLoss);
      if (isNaN(lossValue) || lossValue >= 0) {
        showToast('Max Daily Loss must be a negative number (e.g. -500)', 'error');
        return;
      }
    }

    try {
      setSaving(true);

      // Get current settings first
      const currentSettingsResponse = await fetch(buildApiUrl('/api/users/settings'), {
        credentials: 'include',
      });

      let notifications = {
        tradeAlerts: true,
        performanceReports: true,
        productUpdates: false,
      };
      let theme = 'dark';

      if (currentSettingsResponse.ok) {
        const currentData = await currentSettingsResponse.json();
        notifications = currentData.notifications || notifications;
        theme = currentData.theme || theme;
      }

      // Update settings with risk management
      const response = await fetch(buildApiUrl('/api/users/settings'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          notifications,
          theme,
          riskManagement: {
            risk_lock_enabled: riskLockEnabled,
            max_daily_loss: riskLockEnabled && maxDailyLoss ? parseFloat(maxDailyLoss) : null,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update risk settings');
      }

      showToast('Risk Settings updated', 'success');
    } catch (error) {
      console.error('Failed to save risk settings:', error);
      showToast(error instanceof Error ? error.message : 'Failed to update risk settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={`${getCardBg(theme)} rounded-lg border ${getCardBorder(theme)} p-6`}>
        <div className="flex items-center space-x-3">
          <div className="w-5 h-5 border-2 border-[#6A3DF4]/30 border-t-[#6A3DF4] rounded-full animate-spin" />
          <span className={getTextColor(theme, 'secondary')}>Loading risk settings...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`${getCardBg(theme)} rounded-lg border ${getCardBorder(theme)} border-red-500/20 p-6`}>
        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/30">
            <Lock className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className={`${getTextColor(theme, 'primary')} text-lg font-bold`}>
              Risk Management
            </h3>
            <p className={`${getTextColor(theme, 'muted')} text-sm`}>
              Protect yourself from excessive losses
            </p>
          </div>
        </div>

        {/* Toggle: Enable Daily Loss Lock */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <label className={`${getTextColor(theme, 'primary')} font-medium block mb-1`}>
                Enable Daily Loss Lock
              </label>
              <p className={`${getTextColor(theme, 'muted')} text-sm`}>
                Automatically block trade logging when daily loss limit is reached
              </p>
            </div>
            <button
              onClick={() => {
                setRiskLockEnabled(!riskLockEnabled);
                if (!riskLockEnabled) {
                  // When enabling, set default value if empty
                  if (!maxDailyLoss) {
                    setMaxDailyLoss('-500');
                  }
                }
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                riskLockEnabled ? 'bg-red-500' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  riskLockEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Input: Max Daily Loss */}
        {riskLockEnabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <label className={`${getTextColor(theme, 'primary')} font-medium block mb-2`}>
              Max Daily Loss ($)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={maxDailyLoss}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow negative numbers
                  if (value === '' || value === '-') {
                    setMaxDailyLoss(value);
                  } else {
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue)) {
                      setMaxDailyLoss(value);
                    }
                  }
                }}
                placeholder="-500.00"
                className={`w-full px-4 py-3 ${getCardBg(theme)} border ${getCardBorder(theme)} border-red-500/30 rounded-lg ${getTextColor(theme, 'primary')} placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50`}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <span className={getTextColor(theme, 'muted')}>USD</span>
              </div>
            </div>
            <p className={`${getTextColor(theme, 'muted')} text-xs mt-2 flex items-center space-x-1`}>
              <Info className="w-3 h-3 text-red-500" />
              <span>Enter a negative value (e.g., -500 for $500 daily loss limit)</span>
            </p>
          </motion.div>
        )}

        {/* Warning Message */}
        {riskLockEnabled && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-start space-x-2">
              <Info className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className={`${getTextColor(theme, 'primary')} text-sm font-medium mb-1`}>
                  Important
                </p>
                <p className={`${getTextColor(theme, 'muted')} text-sm`}>
                  When your daily loss reaches this limit, you will be locked out from logging new trades until the next day at 6:00 AM UTC. This only prevents trade logging, not actual trading.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving || (riskLockEnabled && (!maxDailyLoss || parseFloat(maxDailyLoss) >= 0))}
          className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              <span>Save Risk Settings</span>
            </>
          )}
        </button>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className="fixed bottom-8 left-1/2 z-[200] transform -translate-x-1/2"
          >
            <div className={`${
              toast.type === 'success' 
                ? 'bg-[#2ECC71] text-white' 
                : 'bg-[#E74C3C] text-white'
            } px-6 py-4 rounded-lg shadow-2xl flex items-center space-x-3`}>
              <div className={`w-2 h-2 bg-white rounded-full ${
                toast.type === 'success' ? 'animate-pulse' : ''
              }`} />
              <span className="font-semibold">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

