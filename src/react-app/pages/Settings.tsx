import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { motion } from "framer-motion";
import {
  User,
  Shield,
  Key,
  Bell,
  Download,
  Check,
  X,
  AlertTriangle,
  Copy,
  Smartphone,
  Mail,
  Lock,
  RefreshCw,
  Trash2,
  Clock,
  Link2,
  Camera,
  Loader2
} from "lucide-react";
import DashboardLayout from "@/react-app/components/DashboardLayout";
import ExchangeConnectionModal from "@/react-app/components/exchanges/ExchangeConnectionModal";
import { useExchangeConnections } from "@/react-app/hooks/useExchangeConnections";

// Bitget-Style Settings Page with Sidebar Navigation
type SettingsSection = "profile" | "security" | "api" | "notifications" | "data";

export default function SettingsPage() {
  const { user, updateUserProfile, uploadProfilePicture } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState<SettingsSection>("profile");
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteSuccess, setBulkDeleteSuccess] = useState<string | null>(null);
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null);

  // Profile editing state
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notification preferences state
  const [notifications, setNotifications] = useState({
    tradeAlerts: true,
    performanceReports: true,
    productUpdates: false,
    securityAlerts: true,
  });

  // Read section from URL parameter
  useEffect(() => {
    const section = searchParams.get('section');
    if (section && ['profile', 'security', 'api', 'notifications', 'data'].includes(section)) {
      setActiveSection(section as SettingsSection);
    }
  }, [searchParams]);

  // Update displayName when user changes
  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName);
    }
  }, [user?.displayName]);

  // Handle profile save
  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      setProfileError("Display name cannot be empty");
      return;
    }

    setIsSavingProfile(true);
    setProfileError(null);
    setProfileSaved(false);

    try {
      const result = await updateUserProfile({ displayName: displayName.trim() });
      if (result.error) {
        setProfileError("Failed to update profile");
      } else {
        setProfileSaved(true);
        setTimeout(() => setProfileSaved(false), 3000);
      }
    } catch {
      setProfileError("Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle profile picture upload
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setProfileError("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setProfileError("Image must be less than 5MB");
      return;
    }

    setIsSavingProfile(true);
    setProfileError(null);

    try {
      const result = await uploadProfilePicture(file);
      if (result.error) {
        setProfileError("Failed to update profile picture. Please check Firebase Storage rules.");
      } else {
        setProfileSaved(true);
        setTimeout(() => setProfileSaved(false), 3000);
      }
    } catch {
      setProfileError("Failed to upload image");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle notification toggle
  const handleNotificationToggle = (key: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
    // In production, save to backend here
  };

  // Copy UID to clipboard
  const handleCopyUID = async () => {
    try {
      await navigator.clipboard.writeText(uid);
      // Could show a toast here
    } catch {
      console.error("Failed to copy");
    }
  };

  // Exchange connections hook
  const {
    connections,
    loading: connectionsLoading,
    syncing,
    sync,
    remove,
    refetch,
    create
  } = useExchangeConnections();

  // Handle successful exchange connection
  const handleExchangeSuccess = async (exchangeId: string, credentials: { apiKey: string; apiSecret: string; passphrase?: string; testnet?: boolean }) => {
    try {
      await create({
        exchange_id: exchangeId,
        api_key: credentials.apiKey,
        api_secret: credentials.apiSecret,
        passphrase: credentials.passphrase,
        auto_sync_enabled: true,
        sync_interval_hours: 24
      });
      setShowExchangeModal(false);
      refetch();
    } catch (error) {
      console.error('Failed to create connection:', error);
    }
  };

  // Handle sync
  const handleSync = async (connectionId: number) => {
    try {
      await sync(connectionId);
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  // Handle delete
  const handleDelete = async (connectionId: number) => {
    try {
      await remove(connectionId);
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  // Format time ago
  const getTimeAgo = (dateString: string | undefined) => {
    if (!dateString) return 'Never';
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  // Handle bulk delete trades
  const handleBulkDeleteTrades = async () => {
    setBulkDeleting(true);
    setBulkDeleteError(null);
    setBulkDeleteSuccess(null);

    try {
      const response = await fetch('/api/trades/bulk', {
        method: 'DELETE',
        credentials: 'include'
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete trades');
      }

      setBulkDeleteSuccess(result.message || `Deleted ${result.deletedCount} trades`);
      setShowBulkDeleteConfirm(false);

      // Clear success message after 5 seconds
      setTimeout(() => setBulkDeleteSuccess(null), 5000);
    } catch (error) {
      console.error('Bulk delete failed:', error);
      setBulkDeleteError(error instanceof Error ? error.message : 'Failed to delete trades');
    } finally {
      setBulkDeleting(false);
    }
  };

  // Generate a mock UID based on user email
  const uid = user?.email ?
    user.email.split('@')[0].slice(0, 8).toUpperCase() +
    Math.abs(user.email.charCodeAt(0) * 12345).toString().slice(0, 6) :
    "CIRCL001";

  // Sidebar navigation items
  const sidebarItems = [
    { id: "profile" as const, label: "Profile", icon: User },
    { id: "security" as const, label: "Security", icon: Shield },
    { id: "api" as const, label: "Exchange Connections", icon: Link2 },
    { id: "notifications" as const, label: "Notifications", icon: Bell },
    { id: "data" as const, label: "Data Export", icon: Download },
  ];

  // Security items with status
  const securityItems = [
    {
      id: "email",
      title: "Email Verification",
      description: "Verify your email address for account recovery",
      icon: Mail,
      completed: true,
      action: "Verified"
    },
    {
      id: "password",
      title: "Login Password",
      description: "Set a strong password to protect your account",
      icon: Lock,
      completed: true,
      action: "Change"
    },
    {
      id: "2fa",
      title: "Two-Factor Authentication",
      description: "Add an extra layer of security to your account",
      icon: Smartphone,
      completed: false,
      action: "Enable"
    },
    {
      id: "anti-phishing",
      title: "Anti-Phishing Code",
      description: "Set a code to identify legitimate emails from CIRCL",
      icon: Shield,
      completed: false,
      action: "Set Up"
    }
  ];

  return (
    <DashboardLayout>
      <div className="min-h-screen">
        {/* Main Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-white">Settings</h1>
            <p className="text-[#9CA3AF] text-sm mt-1">Manage your account preferences and security</p>
          </div>

          <div className="flex gap-6">
            {/* Sidebar */}
            <div className="w-64 flex-shrink-0">
              <div className="bg-[#141416] rounded-xl border border-[#2A2A2E] overflow-hidden">
                {sidebarItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${
                      activeSection === item.id
                        ? "bg-[#1A1A1E] text-[#00D9C8] border-l-2 border-[#00D9C8]"
                        : "text-[#9CA3AF] hover:bg-[#1A1A1E] hover:text-white border-l-2 border-transparent"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 space-y-6">
              {/* Profile Section */}
              {activeSection === "profile" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* User Profile Card */}
                  <div className="bg-[#141416] rounded-xl border border-[#2A2A2E] p-6">
                    <div className="flex items-start gap-6">
                      {/* Avatar */}
                      <div className="relative">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept="image/*"
                          className="hidden"
                        />
                        {user?.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt="Profile"
                            className="w-20 h-20 rounded-xl object-cover border border-[#2A2A2E]"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-xl bg-[#1A1A1E] border border-[#2A2A2E] flex items-center justify-center text-3xl">
                            {user?.displayName?.charAt(0) || user?.email?.charAt(0) || "👤"}
                          </div>
                        )}
                        <button
                          onClick={handleAvatarClick}
                          disabled={isSavingProfile}
                          className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#00D9C8] rounded-lg flex items-center justify-center hover:bg-[#00F5E1] transition-colors disabled:opacity-50"
                        >
                          {isSavingProfile ? (
                            <Loader2 className="w-4 h-4 text-[#0D0D0F] animate-spin" />
                          ) : (
                            <Camera className="w-4 h-4 text-[#0D0D0F]" />
                          )}
                        </button>
                      </div>

                      {/* User Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h2 className="text-xl font-semibold text-white">
                            {user?.displayName || user?.email?.split('@')[0] || "Trader"}
                          </h2>
                          {/* Verified Badge */}
                          <span className="px-2.5 py-1 bg-[#00D9C8]/10 text-[#00D9C8] text-xs font-medium rounded-full flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Verified
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-[#9CA3AF]">
                          <div className="flex items-center gap-2">
                            <span className="text-[#6B7280]">UID:</span>
                            <span className="text-white font-mono">{uid}</span>
                            <button
                              onClick={handleCopyUID}
                              className="p-1 hover:bg-[#1A1A1E] rounded transition-colors"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[#6B7280]">VIP:</span>
                            <span className="px-2 py-0.5 bg-[#2A2A2E] text-[#9CA3AF] text-xs rounded">
                              Level 1
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Success/Error Messages */}
                    {profileSaved && (
                      <div className="mt-4 p-3 bg-[#00D9C8]/10 border border-[#00D9C8]/20 rounded-lg flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#00D9C8]" />
                        <span className="text-[#00D9C8] text-sm">Profile updated successfully!</span>
                      </div>
                    )}
                    {profileError && (
                      <div className="mt-4 p-3 bg-[#F43F5E]/10 border border-[#F43F5E]/20 rounded-lg flex items-center gap-2">
                        <X className="w-4 h-4 text-[#F43F5E]" />
                        <span className="text-[#F43F5E] text-sm">{profileError}</span>
                      </div>
                    )}
                  </div>

                  {/* Profile Form */}
                  <div className="bg-[#141416] rounded-xl border border-[#2A2A2E] p-6">
                    <h3 className="text-lg font-medium text-white mb-6">Profile Information</h3>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm text-[#9CA3AF] mb-2">Display Name</label>
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Enter your name"
                          className="w-full px-4 py-3 bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg text-white placeholder-[#6B7280] focus:border-[#00D9C8] focus:outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[#9CA3AF] mb-2">Email</label>
                        <input
                          type="email"
                          value={user?.email || ""}
                          disabled
                          className="w-full px-4 py-3 bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg text-[#6B7280] cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={handleSaveProfile}
                        disabled={isSavingProfile || displayName === (user?.displayName || "")}
                        className="px-6 py-2.5 bg-[#00D9C8] text-[#0D0D0F] rounded-lg font-medium hover:bg-[#00F5E1] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isSavingProfile ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Changes"
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Security Section */}
              {activeSection === "security" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Security Overview Card */}
                  <div className="bg-[#141416] rounded-xl border border-[#2A2A2E] p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-medium text-white">Security Level</h3>
                        <p className="text-sm text-[#9CA3AF] mt-1">Complete all security settings to protect your account</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-semibold text-[#00D9C8]">50%</div>
                        <div className="text-xs text-[#6B7280]">2 of 4 completed</div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2 bg-[#2A2A2E] rounded-full overflow-hidden">
                      <div className="h-full w-1/2 bg-[#00D9C8] rounded-full" />
                    </div>
                  </div>

                  {/* Security Items */}
                  <div className="bg-[#141416] rounded-xl border border-[#2A2A2E] divide-y divide-[#2A2A2E]">
                    {securityItems.map((item) => (
                      <div key={item.id} className="p-5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            item.completed ? "bg-[#00D9C8]/10" : "bg-[#1A1A1E]"
                          }`}>
                            <item.icon className={`w-5 h-5 ${
                              item.completed ? "text-[#00D9C8]" : "text-[#9CA3AF]"
                            }`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-white font-medium">{item.title}</h4>
                              {item.completed ? (
                                <span className="w-5 h-5 bg-[#00D9C8] rounded-full flex items-center justify-center">
                                  <Check className="w-3 h-3 text-[#0D0D0F]" />
                                </span>
                              ) : (
                                <span className="w-5 h-5 bg-[#2A2A2E] rounded-full flex items-center justify-center">
                                  <X className="w-3 h-3 text-[#6B7280]" />
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-[#9CA3AF] mt-0.5">{item.description}</p>
                          </div>
                        </div>
                        <button className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          item.completed
                            ? "bg-[#1A1A1E] border border-[#2A2A2E] text-white hover:bg-[#222226]"
                            : "bg-[#00D9C8] text-[#0D0D0F] hover:bg-[#00F5E1]"
                        }`}>
                          {item.action}
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Login Activity */}
                  <div className="bg-[#141416] rounded-xl border border-[#2A2A2E] p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-white">Login Activity</h3>
                      <button className="text-sm text-[#00D9C8] hover:text-[#00F5E1] transition-colors">
                        View All
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div className="p-4 bg-[#1A1A1E] rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-[#00D9C8] rounded-full" />
                          <div>
                            <p className="text-white text-sm">Current Session</p>
                            <p className="text-[#6B7280] text-xs">Windows • Chrome • Germany</p>
                          </div>
                        </div>
                        <span className="text-xs text-[#6B7280]">Active now</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* API Keys Section */}
              {activeSection === "api" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Warning */}
                  <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-xl p-4">
                    <div className="flex gap-3">
                      <AlertTriangle className="w-5 h-5 text-[#F59E0B] flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-[#F59E0B] font-medium text-sm">Security Warning</h4>
                        <p className="text-[#9CA3AF] text-sm mt-1">
                          Never share your API keys with anyone. Only use read-only keys for trade imports.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Exchange Connections */}
                  <div className="bg-[#141416] rounded-xl border border-[#2A2A2E] p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-medium text-white">Exchange Connections</h3>
                        <p className="text-sm text-[#9CA3AF] mt-1">Connect your exchanges to import trades automatically</p>
                      </div>
                      <button
                        onClick={() => setShowExchangeModal(true)}
                        className="px-4 py-2 bg-[#00D9C8] text-[#0D0D0F] rounded-lg font-medium hover:bg-[#00F5E1] transition-colors flex items-center gap-2"
                      >
                        <Key className="w-4 h-4" />
                        Add Exchange
                      </button>
                    </div>

                    {/* Loading State */}
                    {connectionsLoading ? (
                      <div className="text-center py-12">
                        <RefreshCw className="w-8 h-8 text-[#6B7280] animate-spin mx-auto mb-4" />
                        <p className="text-[#9CA3AF]">Loading connections...</p>
                      </div>
                    ) : connections.length === 0 ? (
                      /* Empty State */
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-[#1A1A1E] rounded-xl flex items-center justify-center mx-auto mb-4">
                          <Key className="w-8 h-8 text-[#6B7280]" />
                        </div>
                        <h4 className="text-white font-medium mb-2">No exchanges connected</h4>
                        <p className="text-[#9CA3AF] text-sm max-w-sm mx-auto">
                          Connect your first exchange to start importing trades and syncing your portfolio.
                        </p>
                      </div>
                    ) : (
                      /* Exchange List */
                      <div className="space-y-3">
                        {connections.map((connection) => (
                          <div
                            key={connection.id}
                            className="bg-[#1A1A1E] rounded-xl p-4 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-4">
                              {/* Exchange Logo */}
                              <div className="w-12 h-12 bg-[#2A2A2E] rounded-xl flex items-center justify-center">
                                <span className="text-xl font-bold text-[#00D9C8]">
                                  {(connection.exchange_name || connection.exchange_id).charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-white font-medium">
                                    {connection.exchange_name || connection.exchange_id.charAt(0).toUpperCase() + connection.exchange_id.slice(1)}
                                  </h4>
                                  {connection.is_active !== false && (
                                    <span className="w-5 h-5 bg-[#00D9C8] rounded-full flex items-center justify-center">
                                      <Check className="w-3 h-3 text-[#0D0D0F]" />
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-[#6B7280] mt-1">
                                  <span className="flex items-center gap-1">
                                    <Key className="w-3 h-3" />
                                    {connection.api_key ? `${connection.api_key.slice(0, 4)}...${connection.api_key.slice(-4)}` : '****'}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    Synced {getTimeAgo(connection.last_sync_at)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Sync Button */}
                              <button
                                onClick={() => handleSync(connection.id)}
                                disabled={syncing[connection.id]}
                                className="p-2 hover:bg-[#2A2A2E] rounded-lg transition-colors"
                              >
                                <RefreshCw className={`w-5 h-5 text-[#9CA3AF] ${syncing[connection.id] ? 'animate-spin' : ''}`} />
                              </button>

                              {/* Delete Button */}
                              {deleteConfirmId === connection.id ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleDelete(connection.id)}
                                    className="px-3 py-1.5 bg-[#F43F5E] text-white text-sm rounded-lg hover:bg-[#E11D48] transition-colors"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="px-3 py-1.5 bg-[#2A2A2E] text-white text-sm rounded-lg hover:bg-[#3A3A3E] transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirmId(connection.id)}
                                  className="p-2 hover:bg-[#2A2A2E] rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-5 h-5 text-[#9CA3AF] hover:text-[#F43F5E]" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Notifications Section */}
              {activeSection === "notifications" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="bg-[#141416] rounded-xl border border-[#2A2A2E] divide-y divide-[#2A2A2E]">
                    {[
                      { key: "tradeAlerts" as const, title: "Trade Alerts", description: "Get notified when trades are executed" },
                      { key: "performanceReports" as const, title: "Performance Reports", description: "Weekly and monthly performance summaries" },
                      { key: "productUpdates" as const, title: "Product Updates", description: "New features and improvements" },
                      { key: "securityAlerts" as const, title: "Security Alerts", description: "Login attempts and security changes" },
                    ].map((item) => (
                      <div key={item.key} className="p-5 flex items-center justify-between">
                        <div>
                          <h4 className="text-white font-medium">{item.title}</h4>
                          <p className="text-sm text-[#9CA3AF] mt-0.5">{item.description}</p>
                        </div>
                        <button
                          onClick={() => handleNotificationToggle(item.key)}
                          className={`relative w-11 h-6 rounded-full transition-colors ${
                            notifications[item.key] ? "bg-[#00D9C8]" : "bg-[#2A2A2E]"
                          }`}
                        >
                          <div
                            className={`absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full transition-transform ${
                              notifications[item.key] ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Data Export Section */}
              {activeSection === "data" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="bg-[#141416] rounded-xl border border-[#2A2A2E] divide-y divide-[#2A2A2E]">
                    {[
                      {
                        title: "Export All Data",
                        description: "Download your trades, strategies, and settings",
                        action: "Export"
                      },
                      {
                        title: "Import Data",
                        description: "Upload and restore your data from a backup",
                        action: "Import"
                      },
                      {
                        title: "Backup Settings",
                        description: "Save your preferences and configuration",
                        action: "Backup"
                      },
                    ].map((item, i) => (
                      <div key={i} className="p-5 flex items-center justify-between">
                        <div>
                          <h4 className="text-white font-medium">{item.title}</h4>
                          <p className="text-sm text-[#9CA3AF] mt-0.5">{item.description}</p>
                        </div>
                        <button className="px-4 py-2 bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg text-white text-sm font-medium hover:bg-[#222226] transition-colors flex items-center gap-2">
                          <Download className="w-4 h-4" />
                          {item.action}
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Danger Zone */}
                  <div className="bg-[#141416] rounded-xl border border-[#F43F5E]/20 p-6">
                    <h3 className="text-lg font-medium text-[#F43F5E] mb-4">Danger Zone</h3>

                    {/* Success/Error Messages */}
                    {bulkDeleteSuccess && (
                      <div className="mb-4 p-3 bg-[#00D9C8]/10 border border-[#00D9C8]/20 rounded-lg flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#00D9C8]" />
                        <span className="text-[#00D9C8] text-sm">{bulkDeleteSuccess}</span>
                      </div>
                    )}
                    {bulkDeleteError && (
                      <div className="mb-4 p-3 bg-[#F43F5E]/10 border border-[#F43F5E]/20 rounded-lg flex items-center gap-2">
                        <X className="w-4 h-4 text-[#F43F5E]" />
                        <span className="text-[#F43F5E] text-sm">{bulkDeleteError}</span>
                      </div>
                    )}

                    {/* Clear All Trades */}
                    <div className="flex items-center justify-between pb-5 mb-5 border-b border-[#2A2A2E]">
                      <div>
                        <h4 className="text-white font-medium">Clear All Trades</h4>
                        <p className="text-sm text-[#9CA3AF] mt-0.5">Delete all trades from your journal (cannot be undone)</p>
                      </div>
                      {showBulkDeleteConfirm ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleBulkDeleteTrades}
                            disabled={bulkDeleting}
                            className="px-4 py-2 bg-[#F43F5E] text-white text-sm rounded-lg hover:bg-[#E11D48] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {bulkDeleting ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Deleting...
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-4 h-4" />
                                Confirm Delete
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => setShowBulkDeleteConfirm(false)}
                            disabled={bulkDeleting}
                            className="px-4 py-2 bg-[#2A2A2E] text-white text-sm rounded-lg hover:bg-[#3A3A3E] transition-colors disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowBulkDeleteConfirm(true)}
                          className="px-4 py-2 bg-[#F43F5E]/10 border border-[#F43F5E]/20 rounded-lg text-[#F43F5E] text-sm font-medium hover:bg-[#F43F5E]/20 transition-colors flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Clear All Trades
                        </button>
                      )}
                    </div>

                    {/* Delete Account */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">Delete Account</h4>
                        <p className="text-sm text-[#9CA3AF] mt-0.5">Permanently delete your account and all data</p>
                      </div>
                      <button className="px-4 py-2 bg-[#F43F5E]/10 border border-[#F43F5E]/20 rounded-lg text-[#F43F5E] text-sm font-medium hover:bg-[#F43F5E]/20 transition-colors">
                        Delete Account
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Exchange Connection Modal */}
      <ExchangeConnectionModal
        isOpen={showExchangeModal}
        onClose={() => setShowExchangeModal(false)}
        onSuccess={handleExchangeSuccess}
      />

    </DashboardLayout>
  );
}



