import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import {
  ChevronDown,
  Globe,
  Menu,
  X,
  User,
  Bell,
  ArrowDown,
  BarChart3,
  TrendingUp,
  FileText,
  Target,
  Activity,
  Settings,
  LogOut,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '@/react-app/hooks/useNotifications';
import { useLanguageCurrency } from '@/react-app/contexts/LanguageCurrencyContext';
// import WalletConnect from './WalletConnect'; // Removed

export default function TopNavigation() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { language, setLanguage, t } = useLanguageCurrency();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showLanguageCurrency, setShowLanguageCurrency] = useState(false);
  const [languageSearch, setLanguageSearch] = useState('');

  const toggleDropdown = (name: string) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
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

  // Language and Currency data
  const languages = [
    'English',
    'العربية',
    'العربية (البحرين)',
    'Azərbaycan',
    'български',
    'čeština',
    'Dansk',
    'Deutsch',
    'Ελληνικά',
    'Español',
    'Français',
    'हिन्दी',
    'Magyar',
    'Bahasa Indonesia',
    'Italiano',
    '日本語',
    '한국어',
    'Nederlands',
    'Norsk',
    'Polski',
    'Português',
    'Română',
    'Русский',
    'Svenska',
    'Türkçe',
    'Українська',
    'Tiếng Việt',
    '中文',
  ];


  const filteredLanguages = languages.filter(lang =>
    lang.toLowerCase().includes(languageSearch.toLowerCase())
  );

  const handleLanguageSelect = (selectedLang: string) => {
    setLanguage(selectedLang);
  };

  // Navigation items - defined after hooks to ensure context is available
  const navigation = [
    { name: t('Dashboard'), path: '/dashboard', hasDropdown: false, key: 'Dashboard' },
    { name: t('Trading'), path: '/trading', hasDropdown: false, key: 'Trading' },
    { name: t('Competition'), path: '/competition', hasDropdown: false, key: 'Competition' },
    { name: t('Journal'), path: '/journal', hasDropdown: false, key: 'Journal' },
    { name: t('Markets'), path: '/markets', hasDropdown: false, key: 'Markets' },
    { name: t('Strategies'), path: '/strategies', hasDropdown: false, key: 'Strategies' },
    { name: t('Reports'), path: '/reports', hasDropdown: false, key: 'Reports' },
    { name: t('Study'), path: '/study', hasDropdown: false, key: 'Study' },
    { name: t('Alpha Hub'), path: '/alpha-hub', hasDropdown: false, key: 'Alpha Hub' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b transition-colors bg-[#1A1D23] border-white/10">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Section - Logo */}
          <div className="flex items-center space-x-6">
            {/* Logo */}
            <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
              <div className="w-8 h-8 bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">TradeCircle</span>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="lg:hidden p-2 rounded-lg transition-colors text-white hover:bg-white/10"
            >
              {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center space-x-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                const hasDropdown = item.hasDropdown;

                return (
                  <div key={item.name} className="relative">
                    <button
                      onClick={() => hasDropdown ? toggleDropdown(item.name) : navigate(item.path)}
                      className={`
                        flex items-center space-x-1 px-3 py-2 text-sm font-medium rounded-lg transition-all
                        text-white ${isActive ? 'bg-white/5' : 'hover:bg-white/5'}
                      `}
                    >
                      <span>{item.name}</span>
                      {hasDropdown && (
                        <ChevronDown className={`w-4 h-4 transition-transform ${openDropdowns[item.name] ? 'rotate-180' : ''}`} />
                      )}
                    </button>

                    {/* Active Indicator */}
                    {isActive && (
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-[#6A3DF4] rounded-full"
                        style={{ bottom: '-2px' }}
                      />
                    )}

                    {/* Dropdown Menu */}
                    {hasDropdown && openDropdowns[item.name] && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-full left-0 mt-2 w-48 bg-[#1A1D23] border border-white/10 rounded-lg shadow-xl py-2 z-50"
                      >
                        <Link
                          to={item.path}
                          className="block px-4 py-2 text-sm text-white hover:bg-white/5 transition-colors"
                          onClick={() => toggleDropdown(item.name)}
                        >
                          Overview
                        </Link>
                        <Link
                          to={`${item.path}/advanced`}
                          className="block px-4 py-2 text-sm text-white hover:bg-white/5 transition-colors"
                          onClick={() => toggleDropdown(item.name)}
                        >
                          Advanced
                        </Link>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Section - Darker Background */}
          <div className="flex items-center rounded-lg px-3 py-2 space-x-2 bg-[#151820]">
            {/* Search Icon Button */}
            <div className="relative hidden md:block">
              <button
                onClick={() => setShowSearchDropdown(!showSearchDropdown)}
                className="flex items-center justify-center w-8 h-8 text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <Search className="h-4 w-4" />
              </button>

              {/* Search Dropdown */}
              <AnimatePresence>
                {showSearchDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full right-0 mt-2 w-80 bg-[#1A1D23] border border-white/10 rounded-lg shadow-xl z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Search Input */}
                    <div className="p-4 border-b border-white/5">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Search className="h-4 w-4 text-[#7F8C8D]" />
                        </div>
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onFocus={() => {
                            if (searchQuery.length > 0) {
                              // Focus handling
                            }
                          }}
                          placeholder={t('Search trades, symbols...')}
                          className="w-full pl-10 pr-4 py-2 bg-[#0D0F18]/50 border border-white/10 rounded-lg text-white text-sm placeholder-[#7F8C8D] focus:outline-none focus:ring-2 focus:ring-[#6A3DF4]/50 focus:border-[#6A3DF4]/50 transition-all"
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Search Results */}
                    {searchQuery.length > 0 && (
                      <div className="max-h-80 overflow-y-auto">
                        <div className="p-2">
                          <button
                            onClick={() => {
                              navigate('/markets');
                              setSearchQuery('');
                              setShowSearchDropdown(false);
                            }}
                            className="w-full flex items-center space-x-3 px-3 py-2 text-[#AAB0C0] hover:text-white hover:bg-white/5 rounded-lg transition-all text-left"
                          >
                            <TrendingUp className="w-4 h-4" />
                            <div>
                              <p className="text-sm font-medium">Markets</p>
                              <p className="text-xs text-[#7F8C8D]">Browse all markets</p>
                            </div>
                          </button>
                          <button
                            onClick={() => {
                              navigate('/dashboard');
                              setSearchQuery('');
                              setShowSearchDropdown(false);
                            }}
                            className="w-full flex items-center space-x-3 px-3 py-2 text-[#AAB0C0] hover:text-white hover:bg-white/5 rounded-lg transition-all text-left"
                          >
                            <BarChart3 className="w-4 h-4" />
                            <div>
                              <p className="text-sm font-medium">Dashboard</p>
                              <p className="text-xs text-[#7F8C8D]">View your dashboard</p>
                            </div>
                          </button>
                          <button
                            onClick={() => {
                              navigate('/journal');
                              setSearchQuery('');
                              setShowSearchDropdown(false);
                            }}
                            className="w-full flex items-center space-x-3 px-3 py-2 text-[#AAB0C0] hover:text-white hover:bg-white/5 rounded-lg transition-all text-left"
                          >
                            <FileText className="w-4 h-4" />
                            <div>
                              <p className="text-sm font-medium">Journal</p>
                              <p className="text-xs text-[#7F8C8D]">View trading journal</p>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Deposit Button - Purple */}
            {user && (
              <button
                onClick={() => navigate('/deposit')}
                className="flex items-center space-x-1.5 px-4 py-2 bg-[#6A3DF4] hover:bg-[#5A2DE4] text-white font-medium rounded-lg transition-colors"
              >
                <ArrowDown className="w-4 h-4" />
                <span className="text-sm">Deposit</span>
              </button>
            )}

            {/* User Icons - White */}
            {user ? (
              <>
                {/* Profile Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="p-2 text-white hover:bg-white/5 rounded-lg transition-colors relative"
                  >
                    <User className="w-5 h-5" />
                  </button>

                  {/* Profile Dropdown */}
                  <AnimatePresence>
                    {showProfileMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-56 bg-[#1A1D23] border border-white/10 rounded-xl shadow-xl z-50"
                      >
                        <div className="p-4 border-b border-white/5">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-full flex items-center justify-center overflow-hidden">
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
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-medium text-sm truncate">
                                {user?.displayName || user?.email?.split('@')[0] || 'User'}
                              </p>
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
                            className="w-full flex items-center space-x-3 px-3 py-2 text-[#AAB0C0] hover:text-white hover:bg-white/5 rounded-lg transition-all"
                          >
                            <User className="w-4 h-4" />
                            <span>Profile</span>
                          </button>

                          <button
                            onClick={() => {
                              navigate('/settings');
                              setShowProfileMenu(false);
                            }}
                            className="w-full flex items-center space-x-3 px-3 py-2 text-[#AAB0C0] hover:text-white hover:bg-white/5 rounded-lg transition-all"
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

                {/* WalletConnect removed */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2 text-white hover:bg-white/5 rounded-lg transition-colors relative"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full"></span>
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
                        className="absolute right-0 mt-2 w-80 bg-[#1A1D23] border border-white/10 rounded-xl shadow-xl z-50"
                      >
                        <div className="p-4 border-b border-white/5">
                          <h3 className="text-white font-semibold">Notifications</h3>
                          <p className="text-[#7F8C8D] text-sm">{unreadCount} new messages</p>
                        </div>

                        <div className="max-h-96 overflow-y-auto">
                          {notifications.length > 0 ? (
                            notifications.map((notification) => {
                              const IconComponent = getNotificationIcon(notification.type);
                              return (
                                <div
                                  key={notification.id}
                                  className={`p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer ${!notification.read ? 'bg-[#6A3DF4]/5' : ''
                                    }`}
                                  onClick={() => {
                                    if (!notification.read) {
                                      markAsRead(notification.id);
                                    }
                                    if (notification.action) {
                                      navigate(notification.action.url);
                                      setShowNotifications(false);
                                    }
                                  }}
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
                                            onClick={(e) => {
                                              e.stopPropagation();
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
                            })
                          ) : (
                            <div className="p-8 text-center">
                              <Bell className="w-12 h-12 text-[#7F8C8D] mx-auto mb-3 opacity-50" />
                              <p className="text-[#7F8C8D] text-sm">No notifications</p>
                            </div>
                          )}
                        </div>

                        {notifications.length > 0 && (
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
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="px-4 py-2 text-sm font-medium text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={() => navigate('/signup')}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#6A3DF4] hover:bg-[#5A2DE4] rounded-lg transition-colors"
                >
                  Sign Up
                </button>
              </>
            )}

            {/* Utility Icons - White */}
            <div className="hidden md:flex items-center space-x-1 border-l border-white/10 pl-2 ml-1">
              {/* Language Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowLanguageCurrency(!showLanguageCurrency)}
                  className="p-2 text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <Globe className="w-5 h-5" />
                </button>

                {/* Language Dropdown */}
                <AnimatePresence>
                  {showLanguageCurrency && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-80 bg-[#1A1D23] border border-white/10 rounded-lg shadow-xl z-[100]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="p-4">
                        <h3 className="text-white font-semibold text-sm mb-3">{t('Language')}</h3>
                        <div className="mb-3">
                          <input
                            type="text"
                            value={languageSearch}
                            onChange={(e) => setLanguageSearch(e.target.value)}
                            placeholder={t('Search')}
                            className="w-full px-3 py-2 bg-[#0D0F18]/50 border border-white/10 rounded-lg text-white text-sm placeholder-[#7F8C8D] focus:outline-none focus:ring-2 focus:ring-[#6A3DF4]/50 focus:border-[#6A3DF4]/50 transition-all"
                          />
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                          {filteredLanguages.map((lang) => (
                            <button
                              key={lang}
                              onClick={() => {
                                handleLanguageSelect(lang);
                                setShowLanguageCurrency(false);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg transition-all ${language === lang
                                  ? 'text-[#6A3DF4] font-medium'
                                  : 'text-white hover:bg-white/5'
                                }`}
                            >
                              {lang}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>


            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {showMobileMenu && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden border-t border-white/10 bg-[#1A1D23]"
          >
            <div className="px-4 py-4 space-y-2">
              {navigation.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setShowMobileMenu(false)}
                    className={`
                      block px-3 py-2 text-sm font-medium rounded-lg transition-colors
                      ${isActive ? 'bg-white/5 text-white' : 'text-white hover:bg-white/5'}
                    `}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close dropdowns */}
      {(Object.values(openDropdowns).some(Boolean) || showNotifications || showProfileMenu || showSearchDropdown || showLanguageCurrency) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setOpenDropdowns({});
            setShowNotifications(false);
            setShowProfileMenu(false);
            setShowSearchDropdown(false);
            setShowLanguageCurrency(false);
          }}
        />
      )}
    </nav>
  );
}
