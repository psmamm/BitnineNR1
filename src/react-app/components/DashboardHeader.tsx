import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router';
import {
  Search,
  Bell,
  Settings,
  LogOut,
  User,
  ChevronDown,
  TrendingUp,
  FileText,
  BarChart3,
  Target,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '@/react-app/hooks/useNotifications';

interface DashboardHeaderProps {
  onSearchChange?: (query: string) => void;
}

export default function DashboardHeader({ onSearchChange }: DashboardHeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearchChange?.(query);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };



  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'trade': return TrendingUp;
      case 'performance': return BarChart3;
      case 'strategy': return FileText;
      case 'market': return TrendingUp;
      case 'goal': return Target;
      case 'system': return Settings;
      case 'whale': return Activity;
      default: return Bell;
    }
  };

  return (
    <div className="bg-[#1E2232] rounded-2xl p-6 border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Dashboard Title & Date */}
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-[#7F8C8D] text-sm">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>

        {/* Right Side Controls */}
        <div className="flex items-center justify-between md:justify-end space-x-4 w-full md:w-auto">
          {/* Search Bar */}
          <div className="relative flex-1 md:flex-none">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-[#7F8C8D]" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search trades, symbols..."
              className="w-full md:w-80 pl-10 pr-4 py-2 bg-[#0D0F18]/50 border border-white/10 rounded-xl text-white placeholder-[#7F8C8D] focus:outline-none focus:ring-2 focus:ring-[#6A3DF4]/50 focus:border-[#6A3DF4]/50 transition-all"
            />
          </div>

          <div className="flex items-center space-x-2">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-[#AAB0C0] hover:text-white hover:bg-[#2A2F42] rounded-lg transition-all"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#E74C3C] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-2 w-80 bg-[#1E2232] border border-white/10 rounded-xl shadow-xl z-50"
                  >
                    <div className="p-4 border-b border-white/5">
                      <h3 className="text-white font-semibold">Notifications</h3>
                      <p className="text-[#7F8C8D] text-sm">{unreadCount} new messages</p>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                      {notifications.map((notification) => {
                        const IconComponent = getNotificationIcon(notification.type);
                        return (
                          <div
                            key={notification.id}
                            className={`p-4 border-b border-white/5 hover:bg-[#2A2F42] transition-colors ${!notification.read ? 'bg-[#6A3DF4]/5' : ''
                              }`}
                          >
                            <div className="flex items-start space-x-3">
                              <div className={`p-2 rounded-lg ${notification.type === 'trade' ? 'bg-[#2ECC71]/20 text-[#2ECC71]' :
                                notification.type === 'performance' ? 'bg-[#6A3DF4]/20 text-[#6A3DF4]' :
                                  notification.type === 'strategy' ? 'bg-[#F39C12]/20 text-[#F39C12]' :
                                    notification.type === 'market' ? 'bg-[#3498DB]/20 text-[#3498DB]' :
                                      notification.type === 'goal' ? 'bg-[#9B59B6]/20 text-[#9B59B6]' :
                                        notification.type === 'whale' ? 'bg-[#E74C3C]/20 text-[#E74C3C]' :
                                          'bg-[#7F8C8D]/20 text-[#7F8C8D]'
                                }`}>
                                <IconComponent className="w-4 h-4" />
                              </div>
                              <div className="flex-1">
                                <h4 className="text-white font-medium text-sm">{notification.title}</h4>
                                <p className="text-[#7F8C8D] text-sm mt-1">{notification.message}</p>
                                <div className="flex items-center justify-between mt-2">
                                  <p className="text-[#AAB0C0] text-xs">{notification.time}</p>
                                  {notification.action && (
                                    <button
                                      onClick={() => {
                                        markAsRead(notification.id);
                                        navigate(notification.action!.url);
                                        setShowNotifications(false);
                                      }}
                                      className="text-[#6A3DF4] hover:text-[#8A5CFF] text-xs font-medium px-2 py-1 rounded-md hover:bg-[#6A3DF4]/10 transition-all"
                                    >
                                      {notification.action.label}
                                    </button>
                                  )}
                                </div>
                              </div>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-[#6A3DF4] rounded-full mt-2" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="p-4 border-t border-white/5 space-y-2">
                      <button
                        onClick={markAllAsRead}
                        className="w-full text-[#6A3DF4] hover:text-[#8A5CFF] text-sm font-medium transition-colors py-2 px-3 rounded-lg hover:bg-[#6A3DF4]/10"
                      >
                        Mark all as read
                      </button>
                      <button
                        onClick={() => {
                          navigate('/settings');
                          setShowNotifications(false);
                        }}
                        className="w-full text-[#AAB0C0] hover:text-white text-sm transition-colors py-2 px-3 rounded-lg hover:bg-white/5"
                      >
                        Notification Settings
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Menu */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-3 px-3 py-2 hover:bg-[#2A2F42] rounded-lg transition-all group"
              >
                <div className="w-8 h-8 bg-[#6A3DF4] rounded-full flex items-center justify-center">
                  {user?.photoURL?.startsWith('http') || user?.photoURL?.startsWith('data:') ? (
                    <img
                      src={user.photoURL}
                      alt="Profile"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-semibold text-lg">
                      {user?.photoURL || user?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'P'}
                    </span>
                  )}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-white font-medium text-sm">
                    {user?.displayName || user?.email?.split('@')[0] || 'Psmam'}
                  </p>
                  <p className="text-[#7F8C8D] text-xs">Pro Trader</p>
                </div>
                <ChevronDown className="w-4 h-4 text-[#7F8C8D] group-hover:text-white transition-colors" />
              </button>

              {/* Profile Dropdown */}
              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-2 w-56 bg-[#1E2232] border border-white/10 rounded-xl shadow-xl z-50"
                  >
                    <div className="p-4 border-b border-white/5">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-[#6A3DF4] rounded-full flex items-center justify-center">
                          {user?.photoURL?.startsWith('http') || user?.photoURL?.startsWith('data:') ? (
                            <img
                              src={user.photoURL}
                              alt="Profile"
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-white font-semibold text-xl">
                              {user?.photoURL || user?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'P'}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {user?.displayName || user?.email?.split('@')[0] || 'Psmam'}
                          </p>
                          <p className="text-[#7F8C8D] text-sm">Pro Trader</p>
                          <p className="text-[#7F8C8D] text-xs truncate">{user?.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-2">
                      <button
                        onClick={() => {
                          navigate('/settings');
                          setShowProfileMenu(false);
                        }}
                        className="w-full flex items-center space-x-3 px-3 py-2 text-[#AAB0C0] hover:text-white hover:bg-[#2A2F42] rounded-lg transition-all"
                      >
                        <User className="w-4 h-4" />
                        <span>Profile</span>
                      </button>

                      <button
                        onClick={() => {
                          navigate('/settings');
                          setShowProfileMenu(false);
                        }}
                        className="w-full flex items-center space-x-3 px-3 py-2 text-[#AAB0C0] hover:text-white hover:bg-[#2A2F42] rounded-lg transition-all"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Settings</span>
                      </button>
                    </div>

                    <div className="p-2 border-t border-white/5">
                      <button
                        onClick={() => {
                          handleLogout();
                          setShowProfileMenu(false);
                        }}
                        className="w-full flex items-center space-x-3 px-3 py-2 text-[#E74C3C] hover:bg-[#E74C3C]/10 rounded-lg transition-all"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Click outside to close menus */}
      {
        (showProfileMenu || showNotifications) && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setShowProfileMenu(false);
              setShowNotifications(false);
            }}
          />
        )
      }
    </div >
  );
}
