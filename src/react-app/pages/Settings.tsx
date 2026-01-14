import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { buildApiUrl } from "../hooks/useApi";
import { motion, AnimatePresence } from "framer-motion";
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
  const { user, updateUserProfile, uploadProfilePicture, resetPassword } = useAuth();
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

  // Security modals state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [showAntiPhishingModal, setShowAntiPhishingModal] = useState(false);
  const [passwordResetSent, setPasswordResetSent] = useState(false);
  const [passwordResetError, setPasswordResetError] = useState<string | null>(null);
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [antiPhishingCode, setAntiPhishingCode] = useState("");
  const [antiPhishingInput, setAntiPhishingInput] = useState("");
  const [antiPhishingSaved, setAntiPhishingSaved] = useState(false);

  // 2FA Setup state
  const [twoFactorStep, setTwoFactorStep] = useState<"intro" | "qrcode" | "verify" | "backup" | "success">("intro");
  const [twoFactorSecret, setTwoFactorSecret] = useState("");
  const [twoFactorVerifyCode, setTwoFactorVerifyCode] = useState("");
  const [twoFactorVerifyError, setTwoFactorVerifyError] = useState<string | null>(null);
  const [twoFactorBackupCodes, setTwoFactorBackupCodes] = useState<string[]>([]);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);

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
      const response = await fetch(buildApiUrl('/api/trades/bulk'), {
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

  // Handle password reset email
  const handlePasswordReset = async () => {
    if (!user?.email) return;

    setPasswordResetLoading(true);
    setPasswordResetError(null);
    setPasswordResetSent(false);

    try {
      const result = await resetPassword(user.email);
      if (result.error) {
        setPasswordResetError("Failed to send password reset email");
      } else {
        setPasswordResetSent(true);
      }
    } catch {
      setPasswordResetError("Failed to send password reset email");
    } finally {
      setPasswordResetLoading(false);
    }
  };


  // Generate random TOTP secret (Base32 encoded)
  const generateSecret = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    const randomValues = new Uint8Array(20);
    crypto.getRandomValues(randomValues);
    for (let i = 0; i < 20; i++) {
      secret += chars[randomValues[i] % chars.length];
    }
    return secret;
  };

  // Generate backup codes
  const generateBackupCodes = (): string[] => {
    const codes: string[] = [];
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let i = 0; i < 8; i++) {
      let code = '';
      const randomValues = new Uint8Array(8);
      crypto.getRandomValues(randomValues);
      for (let j = 0; j < 8; j++) {
        code += chars[randomValues[j] % chars.length];
      }
      codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`);
    }
    return codes;
  };

  // Start 2FA setup
  const handleStart2FASetup = () => {
    const secret = generateSecret();
    setTwoFactorSecret(secret);
    setTwoFactorStep("qrcode");
    setTwoFactorVerifyCode("");
    setTwoFactorVerifyError(null);
  };

  // Verify 2FA code
  const handleVerify2FACode = async () => {
    if (twoFactorVerifyCode.length !== 6) {
      setTwoFactorVerifyError("Please enter a 6-digit code");
      return;
    }

    setTwoFactorLoading(true);
    setTwoFactorVerifyError(null);

    // Simulate verification (in production, this would call the backend)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // For demo purposes, accept any 6-digit code
    // In production, this would verify against the TOTP algorithm
    const backupCodes = generateBackupCodes();
    setTwoFactorBackupCodes(backupCodes);
    setTwoFactorStep("backup");
    setTwoFactorLoading(false);
  };

  // Complete 2FA setup
  const handleComplete2FASetup = () => {
    setTwoFactorEnabled(true);
    setTwoFactorStep("success");
  };

  // Close 2FA modal and reset state
  const handleClose2FAModal = () => {
    setShow2FAModal(false);
    setTwoFactorStep("intro");
    setTwoFactorVerifyCode("");
    setTwoFactorVerifyError(null);
  };

  // Disable 2FA
  const handleDisable2FA = () => {
    setTwoFactorEnabled(false);
    setTwoFactorSecret("");
    setTwoFactorBackupCodes([]);
    handleClose2FAModal();
  };

  // Handle Anti-Phishing Code save
  const handleSaveAntiPhishing = () => {
    if (antiPhishingInput.trim()) {
      setAntiPhishingCode(antiPhishingInput.trim());
      setAntiPhishingSaved(true);
      setTimeout(() => {
        setShowAntiPhishingModal(false);
        setAntiPhishingSaved(false);
      }, 1500);
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

              {/* Security Section - Bitget Style */}
              {activeSection === "security" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-8"
                >
                  {/* Verification Methods Section */}
                  <div>
                    <h2 className="text-white text-lg font-semibold mb-4">Verification methods</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Email Verification Card */}
                      <div className="bg-[#141416] rounded-xl border border-[#2A2A2E] p-5 flex flex-col">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-10 h-10 rounded-lg bg-[#1A1A1E] flex items-center justify-center">
                            <Mail className="w-5 h-5 text-[#9CA3AF]" />
                          </div>
                          <span className="px-2.5 py-1 bg-[#1A1A1E] rounded-full text-xs text-[#9CA3AF] flex items-center gap-1.5">
                            {user?.email?.replace(/(.{3}).*(@.*)/, '$1***$2')}
                          </span>
                        </div>
                        <h3 className="text-white font-medium mb-1">Email verification</h3>
                        <p className="text-[#6B7280] text-sm mb-4 flex-1">
                          Email verification codes help guarantee account and transaction security.
                        </p>
                        <div className="flex items-center gap-2">
                          <button className="text-[#00D9C8] text-sm font-medium hover:text-[#00F5E1] transition-colors">
                            Edit
                          </button>
                        </div>
                      </div>

                      {/* Google Authenticator Card */}
                      <div className="bg-[#141416] rounded-xl border border-[#2A2A2E] p-5 flex flex-col">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-10 h-10 rounded-lg bg-[#1A1A1E] flex items-center justify-center">
                            <Smartphone className="w-5 h-5 text-[#00D9C8]" />
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5 ${
                            twoFactorEnabled
                              ? "bg-[#00D9C8]/10 text-[#00D9C8]"
                              : "bg-[#1A1A1E] text-[#6B7280]"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${twoFactorEnabled ? "bg-[#00D9C8]" : "bg-[#6B7280]"}`} />
                            {twoFactorEnabled ? "Enabled" : "Disabled"}
                          </span>
                        </div>
                        <h3 className="text-white font-medium mb-1">Google Authenticator</h3>
                        <p className="text-[#6B7280] text-sm mb-4 flex-1">
                          Google Authenticator codes help guarantee account and transaction security.
                        </p>
                        <div className="flex items-center gap-3">
                          {twoFactorEnabled ? (
                            <>
                              <button
                                onClick={() => setShow2FAModal(true)}
                                className="text-[#00D9C8] text-sm font-medium hover:text-[#00F5E1] transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  setTwoFactorEnabled(false);
                                }}
                                className="text-[#9CA3AF] text-sm font-medium hover:text-white transition-colors"
                              >
                                Unbind
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setShow2FAModal(true)}
                              className="px-4 py-2 bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg text-white text-sm font-medium hover:bg-[#222226] transition-colors"
                            >
                              Configure
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Login Password Card */}
                      <div className="bg-[#141416] rounded-xl border border-[#2A2A2E] p-5 flex flex-col">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-10 h-10 rounded-lg bg-[#1A1A1E] flex items-center justify-center">
                            <Lock className="w-5 h-5 text-[#9CA3AF]" />
                          </div>
                          <span className="px-2.5 py-1 bg-[#00D9C8]/10 rounded-full text-xs text-[#00D9C8] flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00D9C8]" />
                            Enabled
                          </span>
                        </div>
                        <h3 className="text-white font-medium mb-1">Login password</h3>
                        <p className="text-[#6B7280] text-sm mb-4 flex-1">
                          The login password helps guarantee account and transaction security.
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowPasswordModal(true)}
                            className="text-[#00D9C8] text-sm font-medium hover:text-[#00F5E1] transition-colors"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Advanced Security Settings Section */}
                  <div>
                    <h2 className="text-white text-lg font-semibold mb-4">Advanced security settings</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Anti-Phishing Code Card */}
                      <div className="bg-[#141416] rounded-xl border border-[#2A2A2E] p-5 flex flex-col">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-10 h-10 rounded-lg bg-[#1A1A1E] flex items-center justify-center">
                            <Shield className="w-5 h-5 text-[#9CA3AF]" />
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5 ${
                            antiPhishingCode
                              ? "bg-[#00D9C8]/10 text-[#00D9C8]"
                              : "bg-[#1A1A1E] text-[#6B7280]"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${antiPhishingCode ? "bg-[#00D9C8]" : "bg-[#6B7280]"}`} />
                            {antiPhishingCode ? "Enabled" : "Disabled"}
                          </span>
                        </div>
                        <h3 className="text-white font-medium mb-1">Anti-phishing code</h3>
                        <p className="text-[#6B7280] text-sm mb-4 flex-1">
                          Protects you from fake websites, scam emails, and fraudulent SMSes.
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowAntiPhishingModal(true)}
                            className="px-4 py-2 bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg text-white text-sm font-medium hover:bg-[#222226] transition-colors"
                          >
                            Configure
                          </button>
                        </div>
                      </div>

                      {/* Withdrawal Whitelist Card */}
                      <div className="bg-[#141416] rounded-xl border border-[#2A2A2E] p-5 flex flex-col">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-10 h-10 rounded-lg bg-[#1A1A1E] flex items-center justify-center">
                            <Key className="w-5 h-5 text-[#9CA3AF]" />
                          </div>
                          <span className="px-2.5 py-1 bg-[#1A1A1E] rounded-full text-xs text-[#6B7280] flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#6B7280]" />
                            Disabled
                          </span>
                        </div>
                        <h3 className="text-white font-medium mb-1">Withdrawal whitelist</h3>
                        <p className="text-[#6B7280] text-sm mb-4 flex-1">
                          When enabled, you'll only be able to withdraw to whitelisted addresses.
                        </p>
                        <div className="flex items-center gap-2">
                          <button className="px-4 py-2 bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg text-white text-sm font-medium hover:bg-[#222226] transition-colors">
                            Enable
                          </button>
                        </div>
                      </div>

                      {/* Session Management Card */}
                      <div className="bg-[#141416] rounded-xl border border-[#2A2A2E] p-5 flex flex-col">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-10 h-10 rounded-lg bg-[#1A1A1E] flex items-center justify-center">
                            <RefreshCw className="w-5 h-5 text-[#9CA3AF]" />
                          </div>
                          <span className="px-2.5 py-1 bg-[#00D9C8]/10 rounded-full text-xs text-[#00D9C8] flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00D9C8]" />
                            Enabled
                          </span>
                        </div>
                        <h3 className="text-white font-medium mb-1">Cancel withdrawal</h3>
                        <p className="text-[#6B7280] text-sm mb-4 flex-1">
                          After enabling this feature, withdrawals can be cancelled within one minute.
                        </p>
                        <div className="flex items-center gap-2">
                          <button className="px-4 py-2 bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg text-white text-sm font-medium hover:bg-[#222226] transition-colors">
                            Disable
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Account Management Section */}
                  <div>
                    <h2 className="text-white text-lg font-semibold mb-4">Account management</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Device Management Card */}
                      <div className="bg-[#141416] rounded-xl border border-[#2A2A2E] p-5 flex flex-col">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-10 h-10 rounded-lg bg-[#1A1A1E] flex items-center justify-center">
                            <User className="w-5 h-5 text-[#9CA3AF]" />
                          </div>
                        </div>
                        <h3 className="text-white font-medium mb-1">Device management</h3>
                        <p className="text-[#6B7280] text-sm mb-4 flex-1">
                          Manage devices allowed to access your account.
                        </p>
                        <div className="flex items-center gap-2">
                          <button className="px-4 py-2 bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg text-white text-sm font-medium hover:bg-[#222226] transition-colors">
                            Manage
                          </button>
                        </div>
                      </div>

                      {/* Account Activity Card */}
                      <div className="bg-[#141416] rounded-xl border border-[#2A2A2E] p-5 flex flex-col">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-10 h-10 rounded-lg bg-[#1A1A1E] flex items-center justify-center">
                            <Clock className="w-5 h-5 text-[#9CA3AF]" />
                          </div>
                        </div>
                        <h3 className="text-white font-medium mb-1">Account activity</h3>
                        <p className="text-[#6B7280] text-sm mb-1">
                          Recent login: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                        </p>
                        <p className="text-[#6B7280] text-xs mb-4 flex-1">
                          IP: {Math.floor(Math.random() * 255)}.{Math.floor(Math.random() * 255)}.xxx.xxx
                        </p>
                        <div className="flex items-center gap-3">
                          <button className="px-4 py-2 bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg text-white text-sm font-medium hover:bg-[#222226] transition-colors">
                            More
                          </button>
                          <button className="text-[#9CA3AF] text-sm font-medium hover:text-white transition-colors">
                            Disable account
                          </button>
                        </div>
                      </div>

                      {/* Third-party Account Card */}
                      <div className="bg-[#141416] rounded-xl border border-[#2A2A2E] p-5 flex flex-col">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-10 h-10 rounded-lg bg-[#1A1A1E] flex items-center justify-center">
                            <Link2 className="w-5 h-5 text-[#9CA3AF]" />
                          </div>
                        </div>
                        <h3 className="text-white font-medium mb-1">Third-party account management</h3>
                        <p className="text-[#6B7280] text-sm mb-4 flex-1">
                          Bind a third-party account for faster login.
                        </p>
                        <div className="flex items-center gap-2">
                          <button className="px-4 py-2 bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg text-white text-sm font-medium hover:bg-[#222226] transition-colors">
                            Manage
                          </button>
                        </div>
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
                          className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
                            notifications[item.key]
                              ? "bg-[#00D9C8] shadow-[0_0_10px_rgba(0,217,200,0.3)]"
                              : "bg-[#3A3A3E]"
                          }`}
                        >
                          <div
                            className={`absolute top-1 w-5 h-5 rounded-full shadow-md transition-all duration-300 ${
                              notifications[item.key]
                                ? "bg-white left-[calc(100%-24px)]"
                                : "bg-[#9CA3AF] left-1"
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

      {/* Password Change Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowPasswordModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#141416] rounded-xl border border-[#2A2A2E] w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-[#2A2A2E]">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">Change Password</h2>
                  <button
                    onClick={() => setShowPasswordModal(false)}
                    className="p-2 hover:bg-[#1A1A1E] rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-[#9CA3AF]" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-[#9CA3AF] text-sm">
                  We'll send a password reset link to your email address. Click the link to set a new password.
                </p>
                <div className="bg-[#1A1A1E] rounded-lg p-4">
                  <p className="text-[#6B7280] text-xs mb-1">Email Address</p>
                  <p className="text-white">{user?.email}</p>
                </div>

                {passwordResetSent && (
                  <div className="p-3 bg-[#00D9C8]/10 border border-[#00D9C8]/20 rounded-lg flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#00D9C8]" />
                    <span className="text-[#00D9C8] text-sm">Password reset email sent! Check your inbox.</span>
                  </div>
                )}

                {passwordResetError && (
                  <div className="p-3 bg-[#F43F5E]/10 border border-[#F43F5E]/20 rounded-lg flex items-center gap-2">
                    <X className="w-4 h-4 text-[#F43F5E]" />
                    <span className="text-[#F43F5E] text-sm">{passwordResetError}</span>
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-[#2A2A2E] flex gap-3">
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 px-4 py-2.5 bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg text-white font-medium hover:bg-[#222226] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasswordReset}
                  disabled={passwordResetLoading || passwordResetSent}
                  className="flex-1 px-4 py-2.5 bg-[#00D9C8] rounded-lg text-[#0D0D0F] font-medium hover:bg-[#00F5E1] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {passwordResetLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : passwordResetSent ? (
                    <>
                      <Check className="w-4 h-4" />
                      Sent
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Send Reset Link
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Two-Factor Authentication Modal */}
      <AnimatePresence>
        {show2FAModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={handleClose2FAModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#141416] rounded-xl border border-[#2A2A2E] w-full max-w-lg overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-[#2A2A2E]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#00D9C8]/10 flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-[#00D9C8]" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white">Google Authenticator</h2>
                      <p className="text-[#6B7280] text-sm">
                        {twoFactorStep === "intro" && "Set up two-factor authentication"}
                        {twoFactorStep === "qrcode" && "Step 1: Scan QR Code"}
                        {twoFactorStep === "verify" && "Step 2: Verify Code"}
                        {twoFactorStep === "backup" && "Step 3: Save Backup Codes"}
                        {twoFactorStep === "success" && "Setup Complete"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleClose2FAModal}
                    className="p-2 hover:bg-[#1A1A1E] rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-[#9CA3AF]" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Intro Step */}
                {twoFactorStep === "intro" && !twoFactorEnabled && (
                  <div className="space-y-4">
                    <div className="p-4 bg-[#1A1A1E] rounded-lg">
                      <h4 className="text-white font-medium mb-2">Why use 2FA?</h4>
                      <ul className="space-y-2 text-[#9CA3AF] text-sm">
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-[#00D9C8]" />
                          Protect your account from unauthorized access
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-[#00D9C8]" />
                          Secure withdrawals and sensitive operations
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-[#00D9C8]" />
                          Works with Google Authenticator, Microsoft Authenticator, or Authy
                        </li>
                      </ul>
                    </div>
                    <div className="p-3 bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-lg flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
                      <span className="text-[#F59E0B] text-sm">2FA is currently disabled on your account</span>
                    </div>
                  </div>
                )}

                {/* Already Enabled View */}
                {twoFactorStep === "intro" && twoFactorEnabled && (
                  <div className="space-y-4">
                    <div className="p-3 bg-[#00D9C8]/10 border border-[#00D9C8]/20 rounded-lg flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#00D9C8]" />
                      <span className="text-[#00D9C8] text-sm">Two-factor authentication is enabled</span>
                    </div>
                    <div className="p-4 bg-[#1A1A1E] rounded-lg">
                      <p className="text-[#9CA3AF] text-sm">
                        Your account is protected with Google Authenticator. You'll need to enter a verification code when logging in or performing sensitive operations.
                      </p>
                    </div>
                  </div>
                )}

                {/* QR Code Step */}
                {twoFactorStep === "qrcode" && (
                  <div className="space-y-4">
                    <p className="text-[#9CA3AF] text-sm">
                      Scan this QR code with your authenticator app (Google Authenticator, Microsoft Authenticator, or Authy).
                    </p>

                    {/* QR Code placeholder - using a text-based representation */}
                    <div className="flex justify-center">
                      <div className="bg-white p-4 rounded-xl">
                        <div className="w-48 h-48 bg-[#0D0D0F] rounded-lg flex items-center justify-center relative overflow-hidden">
                          {/* Simulated QR code pattern */}
                          <div className="grid grid-cols-7 gap-1 p-2">
                            {Array.from({ length: 49 }).map((_, i) => (
                              <div
                                key={i}
                                className={`w-5 h-5 rounded-sm ${
                                  Math.random() > 0.5 ? 'bg-black' : 'bg-white'
                                }`}
                              />
                            ))}
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-white p-2 rounded-lg">
                              <Smartphone className="w-6 h-6 text-[#00D9C8]" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Manual Entry */}
                    <div className="p-4 bg-[#1A1A1E] rounded-lg">
                      <p className="text-[#6B7280] text-xs mb-2">Can't scan? Enter this code manually:</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-3 py-2 bg-[#0D0D0F] rounded-lg text-[#00D9C8] font-mono text-sm break-all">
                          {twoFactorSecret}
                        </code>
                        <button
                          onClick={() => navigator.clipboard.writeText(twoFactorSecret)}
                          className="p-2 hover:bg-[#2A2A2E] rounded-lg transition-colors"
                        >
                          <Copy className="w-4 h-4 text-[#9CA3AF]" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Verify Step */}
                {twoFactorStep === "verify" && (
                  <div className="space-y-4">
                    <p className="text-[#9CA3AF] text-sm">
                      Enter the 6-digit verification code from your authenticator app to complete the setup.
                    </p>

                    <div>
                      <label className="block text-sm text-[#9CA3AF] mb-2">Verification Code</label>
                      <input
                        type="text"
                        value={twoFactorVerifyCode}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                          setTwoFactorVerifyCode(value);
                        }}
                        placeholder="000000"
                        maxLength={6}
                        className="w-full px-4 py-3 bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg text-white text-center text-2xl font-mono tracking-[0.5em] placeholder-[#6B7280] focus:border-[#00D9C8] focus:outline-none transition-colors"
                      />
                    </div>

                    {twoFactorVerifyError && (
                      <div className="p-3 bg-[#F43F5E]/10 border border-[#F43F5E]/20 rounded-lg flex items-center gap-2">
                        <X className="w-4 h-4 text-[#F43F5E]" />
                        <span className="text-[#F43F5E] text-sm">{twoFactorVerifyError}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Backup Codes Step */}
                {twoFactorStep === "backup" && (
                  <div className="space-y-4">
                    <div className="p-3 bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-lg flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-[#F59E0B] mt-0.5" />
                      <div>
                        <span className="text-[#F59E0B] text-sm font-medium">Save these backup codes!</span>
                        <p className="text-[#F59E0B]/80 text-xs mt-1">
                          Store them in a safe place. You can use these codes to access your account if you lose your authenticator.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-4 bg-[#1A1A1E] rounded-lg">
                      {twoFactorBackupCodes.map((code, index) => (
                        <div key={index} className="px-3 py-2 bg-[#0D0D0F] rounded-lg text-center">
                          <code className="text-white font-mono text-sm">{code}</code>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        const codes = twoFactorBackupCodes.join('\n');
                        navigator.clipboard.writeText(codes);
                      }}
                      className="w-full px-4 py-2.5 bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg text-white font-medium hover:bg-[#222226] transition-colors flex items-center justify-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Copy All Codes
                    </button>
                  </div>
                )}

                {/* Success Step */}
                {twoFactorStep === "success" && (
                  <div className="space-y-4 text-center">
                    <div className="w-16 h-16 mx-auto bg-[#00D9C8]/10 rounded-full flex items-center justify-center">
                      <Check className="w-8 h-8 text-[#00D9C8]" />
                    </div>
                    <div>
                      <h3 className="text-white text-lg font-semibold">2FA Enabled Successfully!</h3>
                      <p className="text-[#9CA3AF] text-sm mt-2">
                        Your account is now protected with two-factor authentication.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-[#2A2A2E] flex gap-3">
                {twoFactorStep === "intro" && !twoFactorEnabled && (
                  <>
                    <button
                      onClick={handleClose2FAModal}
                      className="flex-1 px-4 py-2.5 bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg text-white font-medium hover:bg-[#222226] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleStart2FASetup}
                      className="flex-1 px-4 py-2.5 bg-[#00D9C8] rounded-lg text-[#0D0D0F] font-medium hover:bg-[#00F5E1] transition-colors"
                    >
                      Start Setup
                    </button>
                  </>
                )}

                {twoFactorStep === "intro" && twoFactorEnabled && (
                  <>
                    <button
                      onClick={handleClose2FAModal}
                      className="flex-1 px-4 py-2.5 bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg text-white font-medium hover:bg-[#222226] transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={handleDisable2FA}
                      className="flex-1 px-4 py-2.5 bg-[#F43F5E]/10 border border-[#F43F5E]/20 rounded-lg text-[#F43F5E] font-medium hover:bg-[#F43F5E]/20 transition-colors"
                    >
                      Disable 2FA
                    </button>
                  </>
                )}

                {twoFactorStep === "qrcode" && (
                  <>
                    <button
                      onClick={() => setTwoFactorStep("intro")}
                      className="flex-1 px-4 py-2.5 bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg text-white font-medium hover:bg-[#222226] transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setTwoFactorStep("verify")}
                      className="flex-1 px-4 py-2.5 bg-[#00D9C8] rounded-lg text-[#0D0D0F] font-medium hover:bg-[#00F5E1] transition-colors"
                    >
                      Next
                    </button>
                  </>
                )}

                {twoFactorStep === "verify" && (
                  <>
                    <button
                      onClick={() => setTwoFactorStep("qrcode")}
                      className="flex-1 px-4 py-2.5 bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg text-white font-medium hover:bg-[#222226] transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleVerify2FACode}
                      disabled={twoFactorVerifyCode.length !== 6 || twoFactorLoading}
                      className="flex-1 px-4 py-2.5 bg-[#00D9C8] rounded-lg text-[#0D0D0F] font-medium hover:bg-[#00F5E1] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {twoFactorLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        "Verify"
                      )}
                    </button>
                  </>
                )}

                {twoFactorStep === "backup" && (
                  <button
                    onClick={handleComplete2FASetup}
                    className="w-full px-4 py-2.5 bg-[#00D9C8] rounded-lg text-[#0D0D0F] font-medium hover:bg-[#00F5E1] transition-colors"
                  >
                    I've Saved My Backup Codes
                  </button>
                )}

                {twoFactorStep === "success" && (
                  <button
                    onClick={handleClose2FAModal}
                    className="w-full px-4 py-2.5 bg-[#00D9C8] rounded-lg text-[#0D0D0F] font-medium hover:bg-[#00F5E1] transition-colors"
                  >
                    Done
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Anti-Phishing Code Modal */}
      <AnimatePresence>
        {showAntiPhishingModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAntiPhishingModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#141416] rounded-xl border border-[#2A2A2E] w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-[#2A2A2E]">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">Anti-Phishing Code</h2>
                  <button
                    onClick={() => setShowAntiPhishingModal(false)}
                    className="p-2 hover:bg-[#1A1A1E] rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-[#9CA3AF]" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-[#9CA3AF] text-sm">
                  Set an anti-phishing code that will appear in all official emails from CIRCL. This helps you identify legitimate communications.
                </p>

                <div>
                  <label className="block text-sm text-[#9CA3AF] mb-2">Your Anti-Phishing Code</label>
                  <input
                    type="text"
                    value={antiPhishingInput}
                    onChange={(e) => setAntiPhishingInput(e.target.value)}
                    placeholder="Enter a memorable code (e.g., MySecret123)"
                    maxLength={20}
                    className="w-full px-4 py-3 bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg text-white placeholder-[#6B7280] focus:border-[#00D9C8] focus:outline-none transition-colors"
                  />
                  <p className="text-[#6B7280] text-xs mt-2">
                    Maximum 20 characters. Use letters and numbers.
                  </p>
                </div>

                {antiPhishingSaved && (
                  <div className="p-3 bg-[#00D9C8]/10 border border-[#00D9C8]/20 rounded-lg flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#00D9C8]" />
                    <span className="text-[#00D9C8] text-sm">Anti-phishing code saved!</span>
                  </div>
                )}

                {antiPhishingCode && !antiPhishingSaved && (
                  <div className="p-3 bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg">
                    <p className="text-[#6B7280] text-xs mb-1">Current Code</p>
                    <p className="text-white font-mono">{antiPhishingCode}</p>
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-[#2A2A2E] flex gap-3">
                <button
                  onClick={() => setShowAntiPhishingModal(false)}
                  className="flex-1 px-4 py-2.5 bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg text-white font-medium hover:bg-[#222226] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAntiPhishing}
                  disabled={!antiPhishingInput.trim() || antiPhishingSaved}
                  className="flex-1 px-4 py-2.5 bg-[#00D9C8] rounded-lg text-[#0D0D0F] font-medium hover:bg-[#00F5E1] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {antiPhishingSaved ? (
                    <>
                      <Check className="w-4 h-4" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      Save Code
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </DashboardLayout>
  );
}



