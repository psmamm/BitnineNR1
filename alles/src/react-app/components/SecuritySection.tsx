import { Shield, CheckCircle, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { motion } from 'framer-motion';

interface SecuritySectionProps {
  onPasswordChange?: () => void;
  onTwoFactorToggle?: (enabled: boolean) => void;
  twoFactorEnabled?: boolean;
}

export default function SecuritySection({ 
  onPasswordChange, 
  onTwoFactorToggle, 
  twoFactorEnabled = false 
}: SecuritySectionProps) {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwords.new !== passwords.confirm) {
      alert('New passwords do not match');
      return;
    }
    
    if (passwords.new.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }
    
    // Call password change function
    onPasswordChange?.();
    
    // Reset form
    setPasswords({ current: '', new: '', confirm: '' });
    setShowPasswordForm(false);
  };

  const handleTwoFactorToggle = () => {
    onTwoFactorToggle?.(!twoFactorEnabled);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-[#1E2232] rounded-xl p-6 border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
    >
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-[#6A3DF4]/10 p-2 rounded-xl">
          <Shield className="w-6 h-6 text-[#BDC3C7]" />
        </div>
        <h3 className="text-xl font-semibold text-white">Security</h3>
      </div>
      
      <div className="space-y-6">
        {/* Two-Factor Authentication */}
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-white font-medium flex items-center space-x-2">
              <span>Two-Factor Authentication</span>
              {twoFactorEnabled && <CheckCircle className="w-4 h-4 text-[#2ECC71]" />}
              {!twoFactorEnabled && <AlertTriangle className="w-4 h-4 text-[#F39C12]" />}
            </h4>
            <p className="text-[#AAB0C0] text-sm">
              {twoFactorEnabled 
                ? 'Your account is protected with 2FA' 
                : 'Add an extra layer of security to your account'
              }
            </p>
          </div>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleTwoFactorToggle}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              twoFactorEnabled 
                ? 'bg-[#E74C3C] hover:bg-[#C0392B] text-white' 
                : 'bg-[#2ECC71] hover:bg-[#27AE60] text-white'
            }`}
          >
            {twoFactorEnabled ? 'Disable' : 'Enable'}
          </motion.button>
        </div>

        {/* Password Change */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-white font-medium">Change Password</h4>
              <p className="text-[#AAB0C0] text-sm">Update your account password</p>
            </div>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              className="bg-[#6A3DF4] hover:bg-[#8A5CFF] text-white px-4 py-2 rounded-xl text-sm font-medium transition-all"
            >
              Change Password
            </motion.button>
          </div>

          {showPasswordForm && (
            <motion.form 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handlePasswordSubmit}
              className="space-y-4 bg-[#0D0F18]/30 rounded-xl p-4 border border-white/5"
            >
              <div>
                <label className="block text-[#7F8C8D] text-sm font-medium mb-2">Current Password</label>
                <div className="relative">
                  <input
                    type={showPassword.current ? 'text' : 'password'}
                    value={passwords.current}
                    onChange={(e) => setPasswords(prev => ({ ...prev, current: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#0D0F18]/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#6A3DF4] transition-all pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => ({ ...prev, current: !prev.current }))}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#AAB0C0] hover:text-white transition-all"
                  >
                    {showPassword.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[#7F8C8D] text-sm font-medium mb-2">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword.new ? 'text' : 'password'}
                    value={passwords.new}
                    onChange={(e) => setPasswords(prev => ({ ...prev, new: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#0D0F18]/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#6A3DF4] transition-all pr-10"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => ({ ...prev, new: !prev.new }))}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#AAB0C0] hover:text-white transition-all"
                  >
                    {showPassword.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[#7F8C8D] text-sm font-medium mb-2">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showPassword.confirm ? 'text' : 'password'}
                    value={passwords.confirm}
                    onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#0D0F18]/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#6A3DF4] transition-all pr-10"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => ({ ...prev, confirm: !prev.confirm }))}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#AAB0C0] hover:text-white transition-all"
                  >
                    {showPassword.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex space-x-3">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="bg-[#2ECC71] hover:bg-[#27AE60] text-white px-4 py-2 rounded-xl text-sm font-medium transition-all"
                >
                  Update Password
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => setShowPasswordForm(false)}
                  className="bg-[#0D0F18]/50 hover:bg-[#0D0F18]/70 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all border border-white/10 hover:border-white/20"
                >
                  Cancel
                </motion.button>
              </div>
            </motion.form>
          )}
        </div>

        {/* Login Sessions */}
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-white font-medium">Active Sessions</h4>
            <p className="text-[#AAB0C0] text-sm">Manage your active login sessions</p>
          </div>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-[#0D0F18]/50 hover:bg-[#0D0F18]/70 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all border border-white/10 hover:border-white/20"
          >
            View Sessions
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
