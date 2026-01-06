import DashboardLayout from "@/react-app/components/DashboardLayout";
import SecuritySection from "@/react-app/components/SecuritySection";
import SubscriptionSection from "@/react-app/components/SubscriptionSection";
import RiskManagementSettings from "@/react-app/components/settings/RiskManagementSettings";
import { useAuth } from "../contexts/AuthContext";
import { User, Bell, Download, Upload, Save, Check } from "lucide-react";
import { useSettings } from "@/react-app/hooks/useSettings";
import { useDataExport } from "@/react-app/hooks/useDataExport";
import { useExchangeConnections } from "@/react-app/hooks/useExchangeConnections";
import { buildApiUrl } from "@/react-app/hooks/useApi";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Plus, Trash2, AlertTriangle, X, ChevronDown } from "lucide-react";
import { createPortal } from "react-dom";

export default function SettingsPage() {
  const { user, refreshUserData } = useAuth();
  const {
    settings,
    loading,
    updateNotifications,
    updateProfileData,
    exportSettings,
    importSettings
  } = useSettings();
  const { exportData, importData, exporting, error } = useDataExport();
  const {
    connections,
    loading: connectionsLoading,
    create,
    remove,
    sync,
    getSupportedExchanges,
    creating,
    syncing,
    createError
  } = useExchangeConnections();

  const [profileForm, setProfileForm] = useState(() => {
    // Initialize with user data if available immediately
    const initialDisplayName = user?.displayName || '';
    const initialAvatarIcon = user?.photoURL || '';
    const initialEmail = user?.email || '';
    return {
      displayName: initialDisplayName,
      email: initialEmail,
      avatarIcon: initialAvatarIcon
    };
  });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveErrorMessage, setSaveErrorMessage] = useState<string>('');
  const [importStatus, setImportStatus] = useState<string>('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showExchangeForm, setShowExchangeForm] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ [key: number]: { message: string; type: 'success' | 'error' | 'info' } | null }>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingTrades, setDeletingTrades] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [exchangeForm, setExchangeForm] = useState({
    exchange_id: '',
    api_key: '',
    api_secret: '',
    passphrase: '',
    auto_sync_enabled: true,
    sync_interval_hours: 24
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Popular emoji icons for profile
  const profileIcons = [
    '👤', '🎯', '🚀', '💎', '🔥', '⭐', '🌟', '💼',
    '🎨', '🎪', '🎭', '🏆', '🎖️', '⚡', '💫', '🌙',
    '☀️', '🌈', '🌊', '🌍', '🌎', '🌏', '🦁', '🐯',
    '🐉', '🦅', '🦄', '🐺', '🦊', '🐻', '🐼', '🐨',
    '🐸', // Pepe the Frog
    '🐧', // Penguin
    '🪙', // Coin
    '₿', // Bitcoin symbol
    '🪐', // Crypto/Planet
    '😛', // Tongue out
    '👅' // Tongue
  ];

  const [isInitialized, setIsInitialized] = useState(false);

  // Exchange Dropdown Component
  const ExchangeDropdown = ({ value, onChange, options, placeholder }: { value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; placeholder: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownPortalRef = useRef<HTMLDivElement>(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node;
        const clickedInsideButton = dropdownRef.current?.contains(target);
        const clickedInsideDropdown = dropdownPortalRef.current?.contains(target);

        if (!clickedInsideButton && !clickedInsideDropdown) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }
    }, [isOpen]);

    useEffect(() => {
      if (isOpen && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
          width: rect.width
        });
      }
    }, [isOpen]);

    const selectedOption = options.find(opt => opt.value === value);

    return (
      <div ref={dropdownRef} className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setIsOpen(!isOpen);
          }}
          className="w-full px-4 py-3 bg-gradient-to-br from-gray-600/90 to-gray-700/90 backdrop-blur-sm border-2 border-gray-500/40 hover:border-gray-400/60 rounded-xl text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all shadow-lg flex items-center justify-between"
        >
          <span className={selectedOption ? 'text-white' : 'text-gray-400'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && dropdownPosition.width > 0 && createPortal(
          <div
            ref={dropdownPortalRef}
            className="fixed z-[10000] bg-[#1E2232] border border-white/20 rounded-xl shadow-2xl overflow-hidden"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
              maxHeight: '300px',
              overflowY: 'auto'
            }}
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-3 transition-colors cursor-pointer flex items-center justify-between ${value === option.value
                  ? 'bg-[#6A3DF4]/20 text-white'
                  : 'text-[#BDC3C7] hover:bg-[#6A3DF4]/10 hover:text-white'
                  }`}
              >
                <span>{option.label}</span>
                {value === option.value && (
                  <Check className="w-4 h-4 text-[#6A3DF4]" />
                )}
              </button>
            ))}
          </div>,
          document.body
        )}
      </div>
    );
  };

  const handleCreateExchange = async () => {
    try {
      await create(exchangeForm);
      setShowExchangeForm(false);
      setExchangeForm({
        exchange_id: '',
        api_key: '',
        api_secret: '',
        passphrase: '',
        auto_sync_enabled: true,
        sync_interval_hours: 24
      });
    } catch (error: any) {
      console.error('Failed to create exchange connection:', error);
      // The error will be displayed via createError from useExchangeConnections
    }
  };

  const handleSync = async (connectionId: number) => {
    try {
      console.log('🔄 Starting sync for connection:', connectionId);
      setSyncStatus(prev => ({ ...prev, [connectionId]: { message: 'Syncing...', type: 'info' } }));

      const result = await sync(connectionId);
      console.log('📊 Sync result:', result);
      console.log('📊 Sync debug info:', (result as any)?.debug);

      if (result && (result as any).imported !== undefined) {
        const imported = (result as any).imported || 0;
        const mapped = (result as any).mapped || 0;
        const errors = (result as any).errors || [];
        const debug = (result as any).debug || {};

        console.log(`📈 Sync stats: imported=${imported}, mapped=${mapped}, errors=${errors.length}`);
        console.log(`📈 Debug: normalizedTradesCount=${debug.normalizedTradesCount}, daysBack=${debug.daysBack}, since=${debug.since}`);
        console.log(`📈 Debug: rawTradesCount=${debug.rawTradesCount}, filteredCount=${debug.filteredCount}`);
        console.log(`📈 Full debug object:`, JSON.stringify(debug, null, 2));

        if (errors.length > 0) {
          console.error('❌ Sync errors:', errors);
          setSyncStatus(prev => ({
            ...prev,
            [connectionId]: {
              message: `Sync completed with errors. Imported: ${imported}, Mapped: ${mapped}. ${errors[0]}`,
              type: 'error'
            }
          }));
        } else if (imported > 0 || mapped > 0) {
          console.log('✅ Sync successful!');
          setSyncStatus(prev => ({
            ...prev,
            [connectionId]: {
              message: `Successfully synced! Imported ${imported} trades, mapped ${mapped} to journal. Check the Journal page to see your trades.`,
              type: 'success'
            }
          }));
        } else {
          console.warn('⚠️ No new trades found');
          setSyncStatus(prev => ({
            ...prev,
            [connectionId]: {
              message: 'Sync completed. No new trades found. Check the browser console for detailed logs.',
              type: 'info'
            }
          }));
        }

        // Clear status after 8 seconds
        setTimeout(() => {
          setSyncStatus(prev => ({ ...prev, [connectionId]: null }));
        }, 8000);
      } else {
        console.warn('⚠️ Unexpected sync result format:', result);
      }
    } catch (error: any) {
      console.error('❌ Failed to sync:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      setSyncStatus(prev => ({
        ...prev,
        [connectionId]: {
          message: error?.message || 'Failed to sync. Please try again.',
          type: 'error'
        }
      }));
      setTimeout(() => {
        setSyncStatus(prev => ({ ...prev, [connectionId]: null }));
      }, 8000);
    }
  };

  // Initialize profile form when user data loads (only once)
  useEffect(() => {
    if (user && !isInitialized) {
      const displayName = user.displayName || '';
      const avatarIcon = user.photoURL || '';
      const email = user.email || '';
      console.log('Initializing form from user:', { displayName, avatarIcon, email });

      setProfileForm(prev => {
        // Only update if form is empty (initial state)
        if (!prev.displayName && !prev.avatarIcon && !prev.email) {
          return {
            displayName,
            email,
            avatarIcon
          };
        }
        // Keep existing form values - don't reset if user has already entered data
        return prev;
      });
      setIsInitialized(true);
    }
    // Don't update form when user changes after initialization - let handleProfileUpdate handle it
  }, [user, isInitialized]);

  const handleProfileUpdate = async () => {
    if (!profileForm.displayName.trim()) {
      setSaveStatus('error');
      setSaveErrorMessage('Display name is required');
      setTimeout(() => {
        setSaveStatus('idle');
        setSaveErrorMessage('');
      }, 3000);
      return;
    }

    setSaveStatus('saving');
    setSaveErrorMessage('');

    try {
      const displayName = profileForm.displayName.trim();
      const avatarIcon = profileForm.avatarIcon || '';

      console.log('Saving profile:', { displayName, avatarIcon });

      const result = await updateProfileData({
        displayName,
        avatarIcon
      });

      console.log('Profile update result:', result);

      if (result && result.success) {
        setSaveStatus('saved');
        setSaveErrorMessage('');

        // Wait a bit for the database to update
        await new Promise(resolve => setTimeout(resolve, 500));

        // Refresh user data from backend and get the updated user
        console.log('Refreshing user data...');
        try {
          const updatedUser = await refreshUserData();
          console.log('User data refreshed:', updatedUser);

          // Update form with saved values to keep them in sync
          if (updatedUser) {
            const savedDisplayName = updatedUser.displayName || displayName;
            const savedAvatarIcon = updatedUser.photoURL || avatarIcon;

            console.log('Updating form with saved values:', { savedDisplayName, savedAvatarIcon });
            setProfileForm(prev => ({
              ...prev,
              displayName: savedDisplayName,
              avatarIcon: savedAvatarIcon
            }));
          }
        } catch (refreshError) {
          console.error('Error refreshing user data:', refreshError);
          // Don't fail the save if refresh fails - the data was already saved
        }

        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        const errorMessage = result?.error || 'Failed to update profile';
        console.error('Profile update failed:', errorMessage);
        setSaveStatus('error');
        setSaveErrorMessage(errorMessage);
        setTimeout(() => {
          setSaveStatus('idle');
          setSaveErrorMessage('');
        }, 5000);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      console.error('Profile update error:', errorMessage, error);
      setSaveStatus('error');
      setSaveErrorMessage(errorMessage);
      setTimeout(() => {
        setSaveStatus('idle');
        setSaveErrorMessage('');
      }, 5000);
    }
  };

  const handleExportData = async () => {
    await exportData({
      includeTrades: true,
      includeStrategies: true,
      includeSettings: true,
      format: 'json'
    });
    setShowExportModal(false);
  };

  const handleImportFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('Importing...');

    try {
      let result;
      if (file.name.includes('settings')) {
        result = await importSettings(file);
        if (result.success) {
          setImportStatus('Settings imported successfully!');
          setTimeout(() => setImportStatus(''), 3000);
        } else {
          setImportStatus(`Import failed: ${result.error}`);
          setTimeout(() => setImportStatus(''), 5000);
        }
      } else {
        result = await importData(file);
        if (result.success) {
          setImportStatus('Data imported successfully! Please refresh the page.');
          setTimeout(() => setImportStatus(''), 5000);
        } else {
          setImportStatus(`Import failed: ${result.error}`);
          setTimeout(() => setImportStatus(''), 5000);
        }
      }
    } catch (error) {
      setImportStatus('Import failed. Please check your file format.');
      setTimeout(() => setImportStatus(''), 5000);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0D0F18] rounded-xl p-4 border border-white/10"
        >
          <div className="flex items-center space-x-4">
            <div className="bg-[#6A3DF4]/10 p-3 rounded-xl">
              <User className="w-8 h-8 text-[#BDC3C7]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
              <p className="text-[#AAB0C0]">Manage your account and preferences</p>
            </div>
          </div>
        </motion.div>

        {/* Profile Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#0D0F18] rounded-xl p-4 border border-white/10"
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-[#6A3DF4]/10 p-2 rounded-xl">
              <User className="w-6 h-6 text-[#BDC3C7]" />
            </div>
            <h3 className="text-xl font-semibold text-white">Profile Information</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-white text-sm font-semibold mb-3">Profile Icon</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowIconPicker(!showIconPicker)}
                    className="w-20 h-20 rounded-full bg-gradient-to-br from-[#6A3DF4] to-[#8A5CFF] flex items-center justify-center text-4xl hover:scale-105 transition-transform shadow-lg hover:shadow-[#6A3DF4]/50 border-2 border-white/20"
                  >
                    {profileForm.avatarIcon || (user?.displayName?.charAt(0) || user?.email?.charAt(0) || '👤')}
                  </button>
                  <AnimatePresence>
                    {showIconPicker && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        className="absolute top-24 left-0 z-50 bg-[#0D0F18] border border-white/10 rounded-xl p-4 w-64"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-white font-semibold text-sm">Choose Icon</h4>
                          <button
                            onClick={() => setShowIconPicker(false)}
                            className="text-[#BDC3C7] hover:text-white transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto custom-scrollbar" style={{
                          scrollbarWidth: 'thin',
                          scrollbarColor: '#8B5CF6 #1F2937'
                        }}>
                          {profileIcons.map((icon) => (
                            <button
                              key={icon}
                              type="button"
                              onClick={() => {
                                setProfileForm(prev => ({ ...prev, avatarIcon: icon }));
                                setShowIconPicker(false);
                              }}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xl hover:bg-[#6A3DF4]/20 transition-all ${profileForm.avatarIcon === icon ? 'bg-[#6A3DF4]/30 ring-2 ring-[#6A3DF4]' : ''
                                }`}
                            >
                              {icon}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div>
                <h4 className="text-lg font-medium text-white mb-1">
                  {profileForm.displayName || user?.email?.split('@')[0] || 'User'}
                </h4>
                <p className="text-[#AAB0C0] text-sm">{user?.email}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-white text-sm font-semibold mb-2.5">Display Name *</label>
                <input
                  type="text"
                  value={profileForm.displayName || ''}
                  onChange={(e) => {
                    console.log('Display name changed:', e.target.value);
                    setProfileForm(prev => ({ ...prev, displayName: e.target.value }));
                  }}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 bg-gradient-to-br from-gray-700/90 to-gray-800/90 backdrop-blur-sm border-2 border-gray-600/30 hover:border-gray-500/50 rounded-xl text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all shadow-lg"
                />
              </div>
              <div>
                <label className="block text-white text-sm font-semibold mb-2.5">Email</label>
                <input
                  type="email"
                  value={profileForm.email}
                  className="w-full px-4 py-3 bg-gradient-to-br from-gray-700/50 to-gray-800/50 backdrop-blur-sm border-2 border-gray-600/20 rounded-xl text-gray-400 focus:outline-none transition-all shadow-lg"
                  disabled
                />
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {saveErrorMessage && (
              <div className="p-3 bg-[#E74C3C]/10 border border-[#E74C3C]/20 rounded-xl">
                <p className="text-[#E74C3C] text-sm">{saveErrorMessage}</p>
              </div>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleProfileUpdate}
              disabled={loading || saveStatus === 'saving'}
              className="bg-[#6A3DF4] hover:bg-[#6A3DF4]-hover disabled:bg-[#6A3DF4]/50 text-white px-6 py-2 rounded-xl font-medium transition-all flex items-center space-x-2 shadow-lg hover:shadow-[0_4px_20px_rgba(106,61,244,0.4)]"
            >
              {saveStatus === 'saving' && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saveStatus === 'saved' && <Check className="w-4 h-4" />}
              <span>
                {saveStatus === 'saving' ? 'Saving...' :
                  saveStatus === 'saved' ? 'Saved!' :
                    saveStatus === 'error' ? 'Error - Try again' :
                      'Update Profile'}
              </span>
            </motion.button>
          </div>
        </motion.div>

        {/* Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#0D0F18] rounded-xl p-4 border border-white/10"
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-[#6A3DF4]/10 p-2 rounded-xl">
              <Bell className="w-6 h-6 text-[#BDC3C7]" />
            </div>
            <h3 className="text-xl font-semibold text-white">Notifications</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-white font-medium">Trade Alerts</h4>
                <p className="text-[#AAB0C0] text-sm">Get notified when trades are executed</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications.tradeAlerts}
                  onChange={(e) => updateNotifications('tradeAlerts', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#2A2F42] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#6A3DF4]"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-white font-medium">Performance Reports</h4>
                <p className="text-[#AAB0C0] text-sm">Weekly and monthly performance summaries</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications.performanceReports}
                  onChange={(e) => updateNotifications('performanceReports', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#2A2F42] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#6A3DF4]"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-white font-medium">Product Updates</h4>
                <p className="text-[#AAB0C0] text-sm">New features and improvements</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications.productUpdates}
                  onChange={(e) => updateNotifications('productUpdates', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#2A2F42] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#6A3DF4]"></div>
              </label>
            </div>
          </div>
        </motion.div>

        {/* Exchange Connections */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#0D0F18] rounded-xl p-4 border border-white/10"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="bg-[#6A3DF4]/10 p-2.5 rounded-xl">
                <RefreshCw className="w-5 h-5 text-[#6A3DF4]" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Exchange Connections</h3>
                <p className="text-[#7F8C8D] text-sm mt-0.5">Automatically import trades from exchanges</p>
              </div>
            </div>
            {!showExchangeForm && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowExchangeForm(true)}
                className="bg-[#6A3DF4] hover:bg-[#8B5CF6] text-white px-5 py-2.5 rounded-xl font-medium transition-all flex items-center space-x-2 shadow-lg hover:shadow-[0_4px_20px_rgba(106,61,244,0.4)]"
              >
                <Plus className="w-4 h-4" />
                <span>Add Exchange</span>
              </motion.button>
            )}
          </div>

          {/* Security Warning */}
          {showExchangeForm && (
            <div className="mb-6 p-4 bg-gradient-to-r from-[#E74C3C]/10 to-[#E74C3C]/5 border border-[#E74C3C]/20 rounded-xl">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-[#E74C3C] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-[#E74C3C] font-semibold mb-2 text-sm">Security Warning</h4>
                  <ul className="text-[#AAB0C0] text-xs space-y-1.5">
                    <li className="flex items-start">
                      <span className="text-[#E74C3C] mr-2">•</span>
                      <span>Only use <strong className="text-white">Read-Only</strong> API keys</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-[#E74C3C] mr-2">•</span>
                      <span><strong className="text-white">NEVER</strong> enable withdrawal permissions</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-[#E74C3C] mr-2">•</span>
                      <span>For Bybit: Enable <strong className="text-white">"Trade"</strong> permission under Read-Only</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-[#E74C3C] mr-2">•</span>
                      <span>Enable IP whitelisting if available</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Exchange Form */}
          <AnimatePresence>
            {showExchangeForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-5 bg-[#1A1D2E] rounded-xl border border-white/10"
              >
                <div className="flex items-center justify-between mb-5">
                  <h4 className="text-lg font-semibold text-white">Connect Exchange</h4>
                  <button
                    onClick={() => {
                      setShowExchangeForm(false);
                      setExchangeForm({
                        exchange_id: '',
                        api_key: '',
                        api_secret: '',
                        passphrase: '',
                        auto_sync_enabled: true,
                        sync_interval_hours: 24
                      });
                    }}
                    className="text-[#7F8C8D] hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-white text-sm font-medium mb-2.5">Exchange</label>
                    <ExchangeDropdown
                      value={exchangeForm.exchange_id}
                      onChange={(value) => {
                        console.log('Exchange selected:', value);
                        setExchangeForm(prev => ({ ...prev, exchange_id: value }));
                      }}
                      options={Array.isArray(getSupportedExchanges) && getSupportedExchanges.length > 0
                        ? getSupportedExchanges.map(ex => ({ value: ex.id, label: ex.name }))
                        : [
                          { value: 'binance', label: 'Binance' },
                          { value: 'bybit', label: 'Bybit' }
                        ]}
                      placeholder="Select Exchange"
                    />
                  </div>

                  <div>
                    <label className="block text-white text-sm font-medium mb-2.5">API Key</label>
                    <input
                      type="password"
                      value={exchangeForm.api_key}
                      onChange={(e) => setExchangeForm(prev => ({ ...prev, api_key: e.target.value }))}
                      placeholder="Enter your API Key"
                      className="w-full px-4 py-3 bg-gradient-to-br from-gray-700/90 to-gray-800/90 backdrop-blur-sm border-2 border-gray-600/30 hover:border-gray-500/50 rounded-xl text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all shadow-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-white text-sm font-medium mb-2.5">API Secret</label>
                    <input
                      type="password"
                      value={exchangeForm.api_secret}
                      onChange={(e) => setExchangeForm(prev => ({ ...prev, api_secret: e.target.value }))}
                      placeholder="Enter your API Secret"
                      className="w-full px-4 py-3 bg-gradient-to-br from-gray-700/90 to-gray-800/90 backdrop-blur-sm border-2 border-gray-600/30 hover:border-gray-500/50 rounded-xl text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all shadow-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-white text-sm font-medium mb-2.5">
                      Passphrase <span className="text-[#7F8C8D] font-normal">(Optional)</span>
                    </label>
                    <input
                      type="password"
                      value={exchangeForm.passphrase}
                      onChange={(e) => setExchangeForm(prev => ({ ...prev, passphrase: e.target.value }))}
                      placeholder="Required for some exchanges (e.g., Coinbase Pro)"
                      className="w-full px-4 py-3 bg-gradient-to-br from-gray-700/90 to-gray-800/90 backdrop-blur-sm border-2 border-gray-600/30 hover:border-gray-500/50 rounded-xl text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all shadow-lg"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-xl border border-gray-700/30">
                    <div>
                      <label className="text-white text-sm font-medium cursor-pointer">Enable Auto-Sync</label>
                      <p className="text-[#7F8C8D] text-xs mt-0.5">Automatically sync trades every {exchangeForm.sync_interval_hours} hours</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exchangeForm.auto_sync_enabled}
                        onChange={(e) => setExchangeForm(prev => ({ ...prev, auto_sync_enabled: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[#2A2F42] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#6A3DF4]"></div>
                    </label>
                  </div>

                  {createError && (
                    <div className="p-3 bg-[#E74C3C]/10 border border-[#E74C3C]/20 rounded-xl">
                      <p className="text-[#E74C3C] text-sm font-semibold mb-1">Connection Failed</p>
                      <p className="text-[#E74C3C] text-xs">
                        {typeof createError === 'string'
                          ? createError
                          : (createError as any)?.details || (createError as any)?.message || 'Unknown error occurred'}
                      </p>
                      {(createError as any)?.details && (
                        <p className="text-[#E74C3C]/80 text-xs mt-1">
                          {(createError as any).details}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex space-x-3 pt-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCreateExchange}
                      disabled={creating || !exchangeForm.exchange_id || !exchangeForm.api_key || !exchangeForm.api_secret}
                      className="flex-1 bg-[#6A3DF4] hover:bg-[#8B5CF6] disabled:bg-[#6A3DF4]/50 disabled:cursor-not-allowed text-white py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center space-x-2 shadow-lg hover:shadow-[0_4px_20px_rgba(106,61,244,0.4)]"
                    >
                      {creating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Connecting...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Connect Exchange</span>
                        </>
                      )}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setShowExchangeForm(false);
                        setExchangeForm({
                          exchange_id: '',
                          api_key: '',
                          api_secret: '',
                          passphrase: '',
                          auto_sync_enabled: true,
                          sync_interval_hours: 24
                        });
                      }}
                      className="px-5 py-3 bg-[#0D0F18]/50 hover:bg-[#0D0F18]/70 text-white rounded-xl font-medium transition-all border border-white/5 hover:border-white/20"
                    >
                      Cancel
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Connections List */}
          {connectionsLoading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-[#6A3DF4]/30 border-t-[#6A3DF4] rounded-full animate-spin mx-auto mb-3" />
              <p className="text-[#7F8C8D] text-sm">Loading connections...</p>
            </div>
          ) : connections.length === 0 && !showExchangeForm ? (
            <div className="text-center py-12 text-[#7F8C8D]">
              <div className="w-16 h-16 bg-[#6A3DF4]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <RefreshCw className="w-8 h-8 text-[#6A3DF4]/50" />
              </div>
              <p className="text-white font-medium mb-1">No exchange connections</p>
              <p className="text-sm">Click "Add Exchange" to connect your first exchange</p>
            </div>
          ) : connections.length > 0 ? (
            <div className="space-y-3">
              {connections.map((conn) => (
                <motion.div
                  key={conn.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-[#0D0F18] rounded-xl border border-white/10 hover:border-[#6A3DF4]/30 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-white font-semibold text-base">{conn.exchange_id.toUpperCase()}</h4>
                        {conn.is_active ? (
                          <span className="px-2 py-0.5 bg-[#2ECC71]/10 text-[#2ECC71] text-xs font-medium rounded-lg border border-[#2ECC71]/20">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-[#E74C3C]/10 text-[#E74C3C] text-xs font-medium rounded-lg border border-[#E74C3C]/20">
                            Inactive
                          </span>
                        )}
                        {conn.auto_sync_enabled && (
                          <span className="px-2 py-0.5 bg-[#6A3DF4]/10 text-[#6A3DF4] text-xs font-medium rounded-lg border border-[#6A3DF4]/20">
                            Auto-Sync
                          </span>
                        )}
                      </div>
                      <div className="text-[#7F8C8D] text-sm space-y-0.5">
                        {conn.last_sync_at ? (
                          <p>Last sync: <span className="text-white">{new Date(conn.last_sync_at).toLocaleString()}</span></p>
                        ) : (
                          <p>Never synced</p>
                        )}
                        <p>Sync interval: <span className="text-white">Every {conn.sync_interval_hours} hours</span></p>
                      </div>
                      {syncStatus[conn.id] && (
                        <div className={`mt-3 p-2.5 rounded-lg text-xs ${syncStatus[conn.id]?.type === 'success'
                          ? 'bg-[#2ECC71]/10 border border-[#2ECC71]/20 text-[#2ECC71]'
                          : syncStatus[conn.id]?.type === 'error'
                            ? 'bg-[#E74C3C]/10 border border-[#E74C3C]/20 text-[#E74C3C]'
                            : 'bg-[#6A3DF4]/10 border border-[#6A3DF4]/20 text-[#6A3DF4]'
                          }`}>
                          {syncStatus[conn.id]?.message}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSync(conn.id)}
                        disabled={syncing[conn.id]}
                        className="p-2.5 bg-[#6A3DF4]/10 hover:bg-[#6A3DF4]/20 border border-[#6A3DF4]/30 rounded-lg text-[#6A3DF4] transition-all disabled:opacity-50"
                        title="Sync Now"
                      >
                        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => remove(conn.id)}
                        className="p-2.5 bg-[#E74C3C]/10 hover:bg-[#E74C3C]/20 border border-[#E74C3C]/30 rounded-lg text-[#E74C3C] transition-all"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : null}

          {/* Delete Imported Trades Section */}
          {connections.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6 p-4 bg-[#E74C3C]/5 rounded-xl border border-[#E74C3C]/20"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-semibold text-sm mb-1">Delete Imported Trades</h4>
                  <p className="text-[#7F8C8D] text-xs">
                    Remove all trades imported from exchanges. This will not delete manually added trades.
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deletingTrades}
                  className="px-4 py-2 bg-[#E74C3C]/20 hover:bg-[#E74C3C]/30 border border-[#E74C3C]/40 rounded-lg text-[#E74C3C] text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete All</span>
                </motion.button>
              </div>
              {deleteStatus && (
                <div className={`mt-3 p-2.5 rounded-lg text-xs ${deleteStatus.type === 'success'
                  ? 'bg-[#2ECC71]/10 border border-[#2ECC71]/20 text-[#2ECC71]'
                  : 'bg-[#E74C3C]/10 border border-[#E74C3C]/20 text-[#E74C3C]'
                  }`}>
                  {deleteStatus.message}
                </div>
              )}
            </motion.div>
          )}

          {/* Delete Confirmation Modal */}
          <AnimatePresence>
            {showDeleteConfirm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={() => !deletingTrades && setShowDeleteConfirm(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-[#0D0F18] rounded-xl p-4 border border-white/10 max-w-md w-full"
                >
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-[#E74C3C]/10 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-[#E74C3C]" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-lg">Delete All Imported Trades?</h3>
                      <p className="text-[#7F8C8D] text-sm">This action cannot be undone</p>
                    </div>
                  </div>

                  <p className="text-[#BDC3C7] text-sm mb-6">
                    This will permanently delete all trades that were imported from exchanges.
                    Your manually added trades will not be affected.
                  </p>

                  <div className="flex items-center space-x-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={async () => {
                        setDeletingTrades(true);
                        setDeleteStatus(null);
                        try {
                          const response = await fetch(buildApiUrl('/api/trades/imported/all'), {
                            method: 'DELETE',
                            credentials: 'include'
                          });
                          const data = await response.json();

                          if (response.ok && data.success) {
                            setDeleteStatus({
                              message: `Successfully deleted ${data.deleted} imported trades`,
                              type: 'success'
                            });
                            setShowDeleteConfirm(false);
                            // Clear status after 5 seconds
                            setTimeout(() => setDeleteStatus(null), 5000);
                          } else {
                            setDeleteStatus({
                              message: data.error || 'Failed to delete imported trades',
                              type: 'error'
                            });
                          }
                        } catch (error: any) {
                          setDeleteStatus({
                            message: error.message || 'Failed to delete imported trades',
                            type: 'error'
                          });
                        } finally {
                          setDeletingTrades(false);
                        }
                      }}
                      disabled={deletingTrades}
                      className="flex-1 bg-[#E74C3C] hover:bg-[#C0392B] disabled:bg-[#E74C3C]/50 disabled:cursor-not-allowed text-white py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center space-x-2"
                    >
                      {deletingTrades ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Deleting...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          <span>Delete All</span>
                        </>
                      )}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={deletingTrades}
                      className="px-5 py-3 bg-[#0D0F18]/50 hover:bg-[#0D0F18]/70 text-white rounded-xl font-medium transition-all border border-white/5 hover:border-white/20 disabled:opacity-50"
                    >
                      Cancel
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Risk Management */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <RiskManagementSettings />
        </motion.div>

        {/* Security */}
        <SecuritySection
          onPasswordChange={() => console.log('Password change requested')}
          onTwoFactorToggle={(enabled) => console.log('2FA toggle:', enabled)}
          twoFactorEnabled={false}
        />

        {/* Subscription */}
        <SubscriptionSection
          onUpgrade={() => console.log('Upgrade requested')}
          onManageBilling={() => console.log('Manage billing requested')}
        />

        {/* Appearance - Hidden */}
        {/* <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-[#0D0F18] rounded-xl p-4 border border-white/10"
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-[#6A3DF4]/10 p-2 rounded-xl">
              <Palette className="w-6 h-6 text-[#BDC3C7]" />
            </div>
            <h3 className="text-xl font-semibold text-white">Appearance</h3>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-white font-medium mb-3">Theme</h4>
              <div className="grid grid-cols-3 gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => updateTheme('dark')}
                  className={`flex flex-col items-center p-3 bg-[#0D0F18]/50 border-2 rounded-xl transition-all ${settings.theme === 'dark' ? 'border-white/10-accent' : 'border-white/5 hover:border-white/10-accent/50'
                    }`}
                >
                  <div className="w-8 h-8 bg-[#0D0F18] rounded mb-2"></div>
                  <span className="text-white text-sm">Dark</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => updateTheme('light')}
                  className={`flex flex-col items-center p-3 bg-[#0D0F18]/50 border-2 rounded-xl transition-all ${settings.theme === 'light' ? 'border-white/10-accent' : 'border-white/5 hover:border-white/10-accent/50'
                    }`}
                >
                  <div className="w-8 h-8 bg-white rounded mb-2"></div>
                  <span className="text-white text-sm">Light</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => updateTheme('auto')}
                  className={`flex flex-col items-center p-3 bg-[#0D0F18]/50 border-2 rounded-xl transition-all ${settings.theme === 'auto' ? 'border-white/10-accent' : 'border-white/5 hover:border-white/10-accent/50'
                    }`}
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-theme-primary to-white rounded mb-2"></div>
                  <span className="text-white text-sm">Auto</span>
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div> */}

        {/* Data Management */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-[#0D0F18] rounded-xl p-4 border border-white/10"
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-[#6A3DF4]/10 p-2 rounded-xl">
              <Download className="w-6 h-6 text-[#BDC3C7]" />
            </div>
            <h3 className="text-xl font-semibold text-white">Data Management</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-white font-medium">Export All Data</h4>
                <p className="text-[#AAB0C0] text-sm">Download your trades, strategies, and settings</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowExportModal(true)}
                className="bg-[#6A3DF4] hover:bg-[#6A3DF4]-hover text-white px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center space-x-2 shadow-lg hover:shadow-[0_4px_20px_rgba(106,61,244,0.4)]"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </motion.button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-white font-medium">Import Data</h4>
                <p className="text-[#AAB0C0] text-sm">Upload and restore your data from a backup</p>
                {importStatus && (
                  <p className={`text-sm mt-1 ${importStatus.includes('successfully') ? 'text-[#2ECC71]' :
                    importStatus.includes('failed') ? 'text-[#E74C3C]' : 'text-[#6A3DF4]'
                    }`}>
                    {importStatus}
                  </p>
                )}
              </div>
              <div className="flex space-x-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleImportFile}
                  disabled={importStatus.includes('Importing')}
                  className="bg-[#2ECC71] hover:bg-[#27AE60] disabled:bg-[#2ECC71]/50 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center space-x-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>{importStatus.includes('Importing') ? 'Importing...' : 'Import'}</span>
                </motion.button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-white font-medium">Backup Settings</h4>
                <p className="text-[#AAB0C0] text-sm">Save your preferences and configuration</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={exportSettings}
                className="bg-[#6A3DF4] hover:bg-[#6A3DF4]-hover text-white px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center space-x-2 shadow-lg hover:shadow-[0_4px_20px_rgba(106,61,244,0.4)]"
              >
                <Save className="w-4 h-4" />
                <span>Backup</span>
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Export Modal */}
        {showExportModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#0D0F18] rounded-xl max-w-md w-full p-4 border border-white/10"
            >
              <h3 className="text-xl font-semibold text-white mb-4">Export Data</h3>
              <p className="text-[#AAB0C0] text-sm mb-6">
                This will download all your trades, strategies, and settings as a JSON file.
              </p>

              {exporting && (
                <div className="mb-4 p-3 bg-[#6A3DF4]/10 rounded-lg border border-[#6A3DF4]/20">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-[#6A3DF4]/30 border-t-[#6A3DF4] rounded-full animate-spin" />
                    <span className="text-[#6A3DF4] text-sm">Preparing export...</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 bg-[#E74C3C]/10 rounded-lg border border-[#E74C3C]/20">
                  <span className="text-[#E74C3C] text-sm">{error}</span>
                </div>
              )}

              <div className="flex space-x-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleExportData}
                  disabled={exporting}
                  className="flex-1 bg-[#6A3DF4] hover:bg-[#6A3DF4]-hover disabled:bg-[#6A3DF4]/50 text-white py-2 px-4 rounded-xl font-medium transition-all flex items-center justify-center space-x-2 shadow-lg hover:shadow-[0_4px_20px_rgba(106,61,244,0.4)]"
                >
                  {exporting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Exporting...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Download Export</span>
                    </>
                  )}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowExportModal(false)}
                  disabled={exporting}
                  className="flex-1 bg-[#0D0F18]/50 hover:bg-[#0D0F18]/70 disabled:bg-[#0D0F18]/30 text-white py-2 px-4 rounded-xl font-medium transition-all border border-white/5 hover:border-white/20"
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
