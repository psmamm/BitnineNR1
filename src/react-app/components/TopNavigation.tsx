import { useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import {
  ChevronDown,
  ChevronRight,
  Globe,
  Menu,
  X,
  User,
  Bell,
  ArrowDown,
  ArrowUp,
  ArrowLeftRight,
  BarChart3,
  TrendingUp,
  FileText,
  Target,
  Activity,
  Settings,
  Search,
  CreditCard,
  LayoutGrid,
  Shield,
  ShieldCheck,
  Gift,
  Ticket,
  Link2,
  SlidersHorizontal,
  Copy,
  Check,
  Wallet,
  CircleDollarSign,
  Layers,
  Coins,
  Users,
  LineChart,
  Eye,
  EyeOff,
  Bot,
  Rocket,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '@/react-app/hooks/useNotifications';
import { useLanguageCurrency } from '@/react-app/contexts/LanguageCurrencyContext';
import { useBinanceMarkets } from '@/react-app/hooks/useBinanceMarkets';

// Coin logo helper - returns URL for crypto icon
const getCoinLogo = (symbol: string): string => {
  const coin = symbol.replace('USDT', '').replace('USDC', '').replace('BTC', '').replace('ETH', '').toLowerCase();
  return `https://cdn.jsdelivr.net/gh/AtsumeruDev/CoinIcons/coins/64x64/${coin}.png`;
};

export default function TopNavigation() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { language, setLanguage, t } = useLanguageCurrency();
  const { enhancedData } = useBinanceMarkets();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showLanguageCurrency, setShowLanguageCurrency] = useState(false);
  const [languageSearch, setLanguageSearch] = useState('');
  const [copiedUID, setCopiedUID] = useState(false);
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [showWalletDropdown, setShowWalletDropdown] = useState(false);
  const [showTradingDropdown, setShowTradingDropdown] = useState(false);
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const [showBalanceNav, setShowBalanceNav] = useState(true);
  const [tradeQuoteTab, setTradeQuoteTab] = useState<'USDT' | 'USDC' | 'FIAT' | 'BTC' | 'ETH'>('USDT');
  const [tradeSearch, setTradeSearch] = useState('');

  // Get trading pairs for dropdown
  const tradingPairs = useMemo(() => {
    const pairs = Object.values(enhancedData);
    let filtered = pairs;

    // Filter by quote asset based on tab
    if (tradeQuoteTab === 'USDT') {
      filtered = pairs.filter(p => p.quoteAsset === 'USDT');
    } else if (tradeQuoteTab === 'USDC') {
      filtered = pairs.filter(p => p.quoteAsset === 'USDC');
    } else if (tradeQuoteTab === 'BTC') {
      filtered = pairs.filter(p => p.quoteAsset === 'BTC');
    } else if (tradeQuoteTab === 'ETH') {
      filtered = pairs.filter(p => p.quoteAsset === 'ETH');
    }

    // Apply search filter
    if (tradeSearch) {
      const search = tradeSearch.toLowerCase();
      filtered = filtered.filter(p =>
        p.symbol.toLowerCase().includes(search) ||
        p.baseAsset.toLowerCase().includes(search)
      );
    }

    // Sort by volume and limit
    return filtered
      .sort((a, b) => parseFloat(b.quoteVolume || '0') - parseFloat(a.quoteVolume || '0'))
      .slice(0, 10);
  }, [enhancedData, tradeQuoteTab, tradeSearch]);

  // Generate UID from user email
  const userUID = user?.email ?
    Math.abs(user.email.charCodeAt(0) * 12345678).toString().slice(0, 10) :
    "0000000000";

  // Generate referral code
  const referralCode = user?.email ?
    user.email.split('@')[0].slice(0, 4).toUpperCase() + Math.abs(user.email.charCodeAt(0) * 999).toString().slice(0, 4) :
    "CIRCL0000";

  const copyToClipboard = (text: string, type: 'uid' | 'referral') => {
    navigator.clipboard.writeText(text);
    if (type === 'uid') {
      setCopiedUID(true);
      setTimeout(() => setCopiedUID(false), 2000);
    } else {
      setCopiedReferral(true);
      setTimeout(() => setCopiedReferral(false), 2000);
    }
  };

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
    { name: 'Trade', path: '/trading', hasDropdown: true, key: 'Trade' },
    { name: t('Competition'), path: '/competition', hasDropdown: false, key: 'Competition' },
    { name: t('Journal'), path: '/journal', hasDropdown: false, key: 'Journal' },
    { name: t('Markets'), path: '/markets', hasDropdown: false, key: 'Markets' },
  ];

  // More dropdown items - Like Bitget's "More" menu
  const moreMenuItems = [
    {
      category: 'Trading Tools',
      items: [
        { name: 'Strategies', path: '/strategies', icon: Target, description: 'Manage your playbooks' },
        { name: 'AI Clone', path: '/ai-clone', icon: Activity, description: 'AI-powered trading assistant' },
        { name: 'Reports', path: '/reports', icon: BarChart3, description: 'Analytics & insights' },
      ]
    },
    {
      category: 'Learn',
      items: [
        { name: 'Study', path: '/study', icon: FileText, description: 'Educational resources' },
        { name: 'Alpha Hub', path: '/alpha-hub', icon: TrendingUp, description: 'Market insights' },
      ]
    },
    {
      category: 'Tools',
      items: [
        { name: 'Bitcoin Halving', path: '/bitcoin-halving', icon: Activity, description: 'Halving countdown' },
        { name: 'US Debt', path: '/us-debt', icon: BarChart3, description: 'US debt tracker' },
        { name: 'Order Heatmap', path: '/order-heatmap', icon: Target, description: 'Order flow analysis' },
      ]
    }
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b transition-colors bg-[#151517] border-[#2B2F36]">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Section - Logo */}
          <div className="flex items-center space-x-6">
            {/* Logo - Bitget style */}
            <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
              <div className="w-8 h-8 bg-[#FCD535] rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-[#151517]" />
              </div>
              <span className="text-xl font-bold text-white">CIRCL</span>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="lg:hidden p-2 rounded-lg transition-colors text-[#9CA3AF] hover:text-white hover:bg-[#252629]"
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
                        ${isActive ? 'text-[#FCD535] bg-[#1B1B1D]' : 'text-white hover:text-[#FCD535] hover:bg-[#252629]'}
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
                        className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-[#FCD535] rounded-full"
                        style={{ bottom: '-2px' }}
                      />
                    )}

                    {/* Trade Mega Menu - Bitget style with two columns */}
                    {hasDropdown && openDropdowns[item.name] && item.key === 'Trade' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-0 mt-2 bg-[#1B1B1D] border border-[#2B2F36] rounded-xl shadow-2xl z-50 flex"
                        style={{ width: '620px' }}
                      >
                        {/* Left Column - Trade & Explore Options */}
                        <div className="w-[280px] border-r border-[#2B2F36] py-3">
                          {/* Trade Section */}
                          <div className="px-4 mb-2">
                            <span className="text-[#6B7280] text-xs font-medium uppercase tracking-wider">Trade</span>
                          </div>
                          <button
                            onClick={() => {
                              navigate('/trading/spot');
                              toggleDropdown(item.name);
                            }}
                            className="w-full flex items-center justify-between px-4 py-2.5 text-[#E5E7EB] hover:bg-[#252629] transition-all group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[#FCD535]/10 flex items-center justify-center">
                                <Coins className="w-4 h-4 text-[#FCD535]" />
                              </div>
                              <div className="text-left">
                                <span className="block text-sm font-medium">Spot</span>
                                <span className="text-xs text-[#6B7280]">Buy and sell crypto with ease</span>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-[#6B7280] opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                          <button
                            onClick={() => {
                              navigate('/trading/margin');
                              toggleDropdown(item.name);
                            }}
                            className="w-full flex items-center justify-between px-4 py-2.5 text-[#E5E7EB] hover:bg-[#252629] transition-all group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[#FCD535]/10 flex items-center justify-center">
                                <Layers className="w-4 h-4 text-[#FCD535]" />
                              </div>
                              <div className="text-left">
                                <span className="block text-sm font-medium">Margin</span>
                                <span className="text-xs text-[#6B7280]">Amplify your capital and maximize fund efficiency</span>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-[#6B7280] opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                          <button
                            onClick={() => {
                              navigate('/trading/futures');
                              toggleDropdown(item.name);
                            }}
                            className="w-full flex items-center justify-between px-4 py-2.5 text-[#E5E7EB] hover:bg-[#252629] transition-all group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[#FCD535]/10 flex items-center justify-center">
                                <LineChart className="w-4 h-4 text-[#FCD535]" />
                              </div>
                              <div className="text-left">
                                <span className="block text-sm font-medium">Futures</span>
                                <span className="text-xs text-[#6B7280]">USDT-M & Coin-M perpetual futures</span>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-[#6B7280] opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                          <button
                            onClick={() => {
                              navigate('/convert');
                              toggleDropdown(item.name);
                            }}
                            className="w-full flex items-center justify-between px-4 py-2.5 text-[#E5E7EB] hover:bg-[#252629] transition-all group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[#FCD535]/10 flex items-center justify-center">
                                <RefreshCw className="w-4 h-4 text-[#FCD535]" />
                              </div>
                              <div className="text-left">
                                <span className="block text-sm font-medium">Convert & Block Trade</span>
                                <span className="text-xs text-[#6B7280]">Convert crypto with one click and zero fees</span>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-[#6B7280] opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>

                          {/* Explore Section */}
                          <div className="px-4 mt-4 mb-2">
                            <span className="text-[#6B7280] text-xs font-medium uppercase tracking-wider">Explore</span>
                          </div>
                          <button
                            onClick={() => {
                              navigate('/launchpad');
                              toggleDropdown(item.name);
                            }}
                            className="w-full flex items-center justify-between px-4 py-2.5 text-[#E5E7EB] hover:bg-[#252629] transition-all group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[#FCD535]/10 flex items-center justify-center">
                                <Rocket className="w-4 h-4 text-[#FCD535]" />
                              </div>
                              <div className="text-left">
                                <span className="block text-sm font-medium">Launchhub</span>
                                <span className="text-xs text-[#6B7280]">Gain the edge early and start winning</span>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-[#6B7280] opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                          <button
                            onClick={() => {
                              navigate('/copy-trading');
                              toggleDropdown(item.name);
                            }}
                            className="w-full flex items-center justify-between px-4 py-2.5 text-[#E5E7EB] hover:bg-[#252629] transition-all group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[#FCD535]/10 flex items-center justify-center">
                                <Users className="w-4 h-4 text-[#FCD535]" />
                              </div>
                              <div className="text-left">
                                <span className="block text-sm font-medium">Copy</span>
                                <span className="text-xs text-[#6B7280]">Copy elite traders with one click</span>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-[#6B7280] opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                          <button
                            onClick={() => {
                              navigate('/trading-bots');
                              toggleDropdown(item.name);
                            }}
                            className="w-full flex items-center justify-between px-4 py-2.5 text-[#E5E7EB] hover:bg-[#252629] transition-all group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[#FCD535]/10 flex items-center justify-center">
                                <Bot className="w-4 h-4 text-[#FCD535]" />
                              </div>
                              <div className="text-left">
                                <span className="block text-sm font-medium">Bots</span>
                                <span className="text-xs text-[#6B7280]">Simple, fast, and reliable AI trading bot</span>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-[#6B7280] opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        </div>

                        {/* Right Column - Trading Pairs */}
                        <div className="flex-1 py-3">
                          {/* Quote Asset Tabs */}
                          <div className="flex items-center gap-2 px-4 mb-3">
                            {(['USDT', 'USDC', 'FIAT', 'BTC', 'ETH'] as const).map((tab) => (
                              <button
                                key={tab}
                                onClick={() => setTradeQuoteTab(tab)}
                                className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                                  tradeQuoteTab === tab
                                    ? 'text-white'
                                    : 'text-[#6B7280] hover:text-white'
                                }`}
                              >
                                {tab}
                              </button>
                            ))}
                          </div>

                          {/* Search */}
                          <div className="px-4 mb-3">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
                              <input
                                type="text"
                                value={tradeSearch}
                                onChange={(e) => setTradeSearch(e.target.value)}
                                placeholder="Search"
                                className="w-full pl-9 pr-3 py-2 bg-[#252629] border border-[#2B2F36] rounded-lg text-white text-sm placeholder-[#6B7280] focus:outline-none focus:border-[#FCD535] transition-colors"
                              />
                            </div>
                          </div>

                          {/* Trading Pairs List */}
                          <div className="max-h-[320px] overflow-y-auto">
                            {tradingPairs.map((pair) => (
                              <button
                                key={pair.symbol}
                                onClick={() => {
                                  navigate(`/trading/spot?symbol=${pair.symbol}`);
                                  toggleDropdown(item.name);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#252629] transition-colors"
                              >
                                <img
                                  src={getCoinLogo(pair.symbol)}
                                  alt={pair.baseAsset}
                                  className="w-6 h-6 rounded-full"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${pair.baseAsset}&background=1A1A1E&color=00D9C8&size=24`;
                                  }}
                                />
                                <span className="text-white text-sm font-medium">
                                  {pair.baseAsset}/{pair.quoteAsset}
                                </span>
                              </button>
                            ))}
                            {tradingPairs.length === 0 && (
                              <div className="px-4 py-8 text-center text-[#6B7280] text-sm">
                                No pairs found
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                    {hasDropdown && openDropdowns[item.name] && item.key !== 'Trade' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-full left-0 mt-2 w-48 bg-[#1B1B1D] border border-[#2B2F36] rounded-xl shadow-dropdown py-2 z-50"
                      >
                        <Link
                          to={item.path}
                          className="block px-4 py-2.5 text-sm text-[#9CA3AF] hover:text-white hover:bg-[#252629] transition-colors"
                          onClick={() => toggleDropdown(item.name)}
                        >
                          Overview
                        </Link>
                        <Link
                          to={`${item.path}/advanced`}
                          className="block px-4 py-2.5 text-sm text-[#9CA3AF] hover:text-white hover:bg-[#252629] transition-colors"
                          onClick={() => toggleDropdown(item.name)}
                        >
                          Advanced
                        </Link>
                      </motion.div>
                    )}
                  </div>
                );
              })}

              {/* More Dropdown - Bitget style */}
              <div className="relative">
                <button
                  onClick={() => setShowMoreDropdown(!showMoreDropdown)}
                  className={`
                    flex items-center space-x-1 px-3 py-2 text-sm font-medium rounded-lg transition-all
                    ${showMoreDropdown ? 'text-[#FCD535] bg-[#1B1B1D]' : 'text-white hover:text-[#FCD535] hover:bg-[#252629]'}
                  `}
                >
                  <span>More</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showMoreDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* More Mega Menu - Bitget style */}
                <AnimatePresence>
                  {showMoreDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full left-0 mt-2 w-[600px] bg-[#1B1B1D] border border-[#2B2F36] rounded-xl shadow-2xl z-50"
                    >
                      <div className="p-4 grid grid-cols-3 gap-4">
                        {moreMenuItems.map((section) => (
                          <div key={section.category}>
                            <h4 className="text-xs font-medium text-[#6B7280] uppercase tracking-wider px-2 mb-2">
                              {section.category}
                            </h4>
                            <div className="space-y-1">
                              {section.items.map((item) => (
                                <button
                                  key={item.name}
                                  onClick={() => {
                                    navigate(item.path);
                                    setShowMoreDropdown(false);
                                  }}
                                  className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-[#252629] transition-colors group"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-[#252629] group-hover:bg-[#FCD535]/10 flex items-center justify-center transition-colors">
                                    <item.icon className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#FCD535]" />
                                  </div>
                                  <div className="text-left">
                                    <span className="block text-sm text-white">{item.name}</span>
                                    <span className="block text-xs text-[#6B7280]">{item.description}</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Right Section - Bitget style */}
          <div className="flex items-center rounded-lg px-3 py-2 space-x-2 bg-[#1B1B1D]">
            {/* Search Icon Button */}
            <div className="relative hidden md:block">
              <button
                onClick={() => setShowSearchDropdown(!showSearchDropdown)}
                className="flex items-center justify-center w-8 h-8 text-[#9CA3AF] hover:text-white hover:bg-[#252629] rounded-lg transition-colors"
              >
                <Search className="h-4 w-4" />
              </button>

              {/* Search Dropdown - Bitget style */}
              <AnimatePresence>
                {showSearchDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full right-0 mt-2 w-80 bg-[#1B1B1D] border border-[#2B2F36] rounded-xl shadow-dropdown z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Search Input */}
                    <div className="p-4 border-b border-[#2B2F36]">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Search className="h-4 w-4 text-[#6B7280]" />
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
                          className="w-full pl-10 pr-4 py-2 bg-[#252629] border border-[#2B2F36] rounded-lg text-white text-sm placeholder-[#6B7280] focus:outline-none focus:border-[#FCD535] transition-all"
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
                            className="w-full flex items-center space-x-3 px-3 py-2.5 text-[#9CA3AF] hover:text-white hover:bg-[#252629] rounded-lg transition-all text-left"
                          >
                            <TrendingUp className="w-4 h-4" />
                            <div>
                              <p className="text-sm font-medium">Markets</p>
                              <p className="text-xs text-[#6B7280]">Browse all markets</p>
                            </div>
                          </button>
                          <button
                            onClick={() => {
                              navigate('/dashboard');
                              setSearchQuery('');
                              setShowSearchDropdown(false);
                            }}
                            className="w-full flex items-center space-x-3 px-3 py-2.5 text-[#9CA3AF] hover:text-white hover:bg-[#252629] rounded-lg transition-all text-left"
                          >
                            <BarChart3 className="w-4 h-4" />
                            <div>
                              <p className="text-sm font-medium">Dashboard</p>
                              <p className="text-xs text-[#6B7280]">View your dashboard</p>
                            </div>
                          </button>
                          <button
                            onClick={() => {
                              navigate('/journal');
                              setSearchQuery('');
                              setShowSearchDropdown(false);
                            }}
                            className="w-full flex items-center space-x-3 px-3 py-2.5 text-[#9CA3AF] hover:text-white hover:bg-[#252629] rounded-lg transition-all text-left"
                          >
                            <FileText className="w-4 h-4" />
                            <div>
                              <p className="text-sm font-medium">Journal</p>
                              <p className="text-xs text-[#6B7280]">View trading journal</p>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Wallet Dropdown - Bitget style */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setShowWalletDropdown(!showWalletDropdown)}
                  className="flex items-center space-x-1.5 p-2 text-[#9CA3AF] hover:text-white hover:bg-[#252629] rounded-lg transition-colors"
                >
                  <Wallet className="w-5 h-5" />
                  <ChevronDown className={`w-4 h-4 transition-transform ${showWalletDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Wallet Dropdown Menu - Bitget style */}
                <AnimatePresence>
                  {showWalletDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-80 bg-[#1B1B1D] border border-[#2B2F36] rounded-xl shadow-2xl z-50"
                    >
                      {/* Total Asset Value */}
                      <div className="p-4 border-b border-[#2B2F36]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[#9CA3AF] text-sm">Total asset value (USD)</span>
                          <button
                            onClick={() => setShowBalanceNav(!showBalanceNav)}
                            className="p-1 hover:bg-[#252629] rounded transition-colors"
                          >
                            {showBalanceNav ? (
                              <Eye className="w-4 h-4 text-[#6B7280]" />
                            ) : (
                              <EyeOff className="w-4 h-4 text-[#6B7280]" />
                            )}
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-semibold text-white">
                            {showBalanceNav ? '0.00' : '****'}
                          </span>
                          <span className="text-[#FCD535] text-sm">≈ 0.000 BTC</span>
                        </div>
                      </div>

                      {/* Quick Action Buttons */}
                      <div className="p-4 border-b border-[#2B2F36]">
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => {
                              navigate('/deposit');
                              setShowWalletDropdown(false);
                            }}
                            className="flex flex-col items-center gap-1.5 p-3 bg-[#252629] rounded-lg hover:bg-[#222226] transition-colors"
                          >
                            <div className="w-8 h-8 rounded-full bg-[#FCD535]/10 flex items-center justify-center">
                              <ArrowDown className="w-4 h-4 text-[#FCD535]" />
                            </div>
                            <span className="text-white text-xs font-medium">Deposit</span>
                          </button>
                          <button
                            onClick={() => {
                              navigate('/withdraw');
                              setShowWalletDropdown(false);
                            }}
                            className="flex flex-col items-center gap-1.5 p-3 bg-[#252629] rounded-lg hover:bg-[#222226] transition-colors"
                          >
                            <div className="w-8 h-8 rounded-full bg-[#FCD535]/10 flex items-center justify-center">
                              <ArrowUp className="w-4 h-4 text-[#FCD535]" />
                            </div>
                            <span className="text-white text-xs font-medium">Withdraw</span>
                          </button>
                          <button
                            onClick={() => {
                              navigate('/transfer');
                              setShowWalletDropdown(false);
                            }}
                            className="flex flex-col items-center gap-1.5 p-3 bg-[#252629] rounded-lg hover:bg-[#222226] transition-colors"
                          >
                            <div className="w-8 h-8 rounded-full bg-[#FCD535]/10 flex items-center justify-center">
                              <ArrowLeftRight className="w-4 h-4 text-[#FCD535]" />
                            </div>
                            <span className="text-white text-xs font-medium">Transfer</span>
                          </button>
                        </div>
                      </div>

                      {/* Wallet Menu Items */}
                      <div className="py-2">
                        <button
                          onClick={() => {
                            navigate('/assets');
                            setShowWalletDropdown(false);
                          }}
                          className="w-full flex items-center space-x-3 px-4 py-2.5 text-[#E5E7EB] hover:bg-[#252629] transition-all"
                        >
                          <CircleDollarSign className="w-5 h-5 text-[#9CA3AF]" />
                          <div className="flex-1 text-left">
                            <span className="block">Assets</span>
                            <span className="text-xs text-[#6B7280]">View all your assets</span>
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            navigate('/spot-assets');
                            setShowWalletDropdown(false);
                          }}
                          className="w-full flex items-center space-x-3 px-4 py-2.5 text-[#E5E7EB] hover:bg-[#252629] transition-all"
                        >
                          <Coins className="w-5 h-5 text-[#9CA3AF]" />
                          <div className="flex-1 text-left">
                            <span className="block">Spot</span>
                            <span className="text-xs text-[#6B7280]">Spot trading account</span>
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            navigate('/margin-assets');
                            setShowWalletDropdown(false);
                          }}
                          className="w-full flex items-center space-x-3 px-4 py-2.5 text-[#E5E7EB] hover:bg-[#252629] transition-all"
                        >
                          <Layers className="w-5 h-5 text-[#9CA3AF]" />
                          <div className="flex-1 text-left">
                            <span className="block">Margin</span>
                            <span className="text-xs text-[#6B7280]">Margin trading account</span>
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            navigate('/futures-assets');
                            setShowWalletDropdown(false);
                          }}
                          className="w-full flex items-center space-x-3 px-4 py-2.5 text-[#E5E7EB] hover:bg-[#252629] transition-all"
                        >
                          <LineChart className="w-5 h-5 text-[#9CA3AF]" />
                          <div className="flex-1 text-left">
                            <span className="block">Futures</span>
                            <span className="text-xs text-[#6B7280]">Futures trading account</span>
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            navigate('/copy-trading');
                            setShowWalletDropdown(false);
                          }}
                          className="w-full flex items-center space-x-3 px-4 py-2.5 text-[#E5E7EB] hover:bg-[#252629] transition-all"
                        >
                          <Users className="w-5 h-5 text-[#9CA3AF]" />
                          <div className="flex-1 text-left">
                            <span className="block">Copy trading</span>
                            <span className="text-xs text-[#6B7280]">Follow top traders</span>
                          </div>
                        </button>
                      </div>

                      {/* View All Assets Button */}
                      <div className="p-3 border-t border-[#2B2F36]">
                        <button
                          onClick={() => {
                            navigate('/assets');
                            setShowWalletDropdown(false);
                          }}
                          className="w-full py-2.5 bg-[#252629] hover:bg-[#222226] text-white rounded-lg font-medium transition-colors"
                        >
                          View all assets
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}


            {/* User Icons - Bitget style */}
            {user ? (
              <>
                {/* Profile Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full overflow-hidden border-2 border-[#2B2F36] hover:border-[#FCD535] transition-colors bg-[#252629] flex items-center justify-center"
                  >
                    {user?.photoURL?.startsWith('http') || user?.photoURL?.startsWith('data:') ? (
                      <img
                        src={user.photoURL}
                        alt="Profile"
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <span className="text-[#9CA3AF] font-semibold text-xs">
                        {user?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    )}
                  </button>

                  {/* Profile Dropdown - Bitget style */}
                  <AnimatePresence>
                    {showProfileMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-72 bg-[#1B1B1D] border border-[#2B2F36] rounded-xl shadow-2xl z-50"
                      >
                        {/* Profile Header */}
                        <div className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 aspect-square flex-shrink-0 rounded-full overflow-hidden border-2 border-[#2B2F36]">
                              {user?.photoURL?.startsWith('http') || user?.photoURL?.startsWith('data:') ? (
                                <img
                                  src={user.photoURL}
                                  alt="Profile"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-[#252629] flex items-center justify-center">
                                  <span className="text-[#9CA3AF] font-semibold text-xl">
                                    {user?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-semibold text-base truncate">
                                {user?.displayName || user?.email?.split('@')[0] || 'User'}
                              </p>
                              <div className="flex items-center space-x-1.5 mt-0.5">
                                <span className="text-[#6B7280] text-xs">UID</span>
                                <span className="text-[#9CA3AF] text-xs font-mono">{userUID}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(userUID, 'uid');
                                  }}
                                  className="p-0.5 hover:bg-[#252629] rounded transition-colors"
                                >
                                  {copiedUID ? (
                                    <Check className="w-3 h-3 text-[#FCD535]" />
                                  ) : (
                                    <Copy className="w-3 h-3 text-[#6B7280]" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Badges */}
                          <div className="flex items-center space-x-2 mt-3">
                            <span className="px-2.5 py-1 bg-[#FCD535]/10 text-[#FCD535] text-xs font-medium rounded-full flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" />
                              Verified
                            </span>
                            <span className="px-2.5 py-1 bg-[#2B2F36] text-[#9CA3AF] text-xs font-medium rounded-full flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              VIP
                            </span>
                          </div>
                        </div>

                        {/* Menu Items */}
                        <div className="py-2">
                          <button
                            onClick={() => {
                              navigate('/dashboard');
                              setShowProfileMenu(false);
                            }}
                            className="w-full flex items-center space-x-3 px-4 py-2.5 text-[#E5E7EB] hover:bg-[#252629] transition-all"
                          >
                            <LayoutGrid className="w-5 h-5 text-[#9CA3AF]" />
                            <span>Dashboard</span>
                          </button>

                          <button
                            onClick={() => {
                              navigate('/settings');
                              setShowProfileMenu(false);
                            }}
                            className="w-full flex items-center space-x-3 px-4 py-2.5 text-[#E5E7EB] hover:bg-[#252629] transition-all"
                          >
                            <CreditCard className="w-5 h-5 text-[#9CA3AF]" />
                            <span>Identity verification</span>
                          </button>

                          <button
                            onClick={() => {
                              navigate('/settings?section=security');
                              setShowProfileMenu(false);
                            }}
                            className="w-full flex items-center space-x-3 px-4 py-2.5 text-[#E5E7EB] hover:bg-[#252629] transition-all"
                          >
                            <ShieldCheck className="w-5 h-5 text-[#9CA3AF]" />
                            <span>Security settings</span>
                          </button>

                          <button
                            onClick={() => {
                              navigate('/rewards');
                              setShowProfileMenu(false);
                            }}
                            className="w-full flex items-center justify-between px-4 py-2.5 text-[#E5E7EB] hover:bg-[#252629] transition-all"
                          >
                            <div className="flex items-center space-x-3">
                              <Gift className="w-5 h-5 text-[#9CA3AF]" />
                              <span>Rewards Center</span>
                            </div>
                            <span className="text-[#FCD535] text-sm">0 points</span>
                          </button>

                          <button
                            onClick={() => {
                              navigate('/vouchers');
                              setShowProfileMenu(false);
                            }}
                            className="w-full flex items-center space-x-3 px-4 py-2.5 text-[#E5E7EB] hover:bg-[#252629] transition-all"
                          >
                            <Ticket className="w-5 h-5 text-[#9CA3AF]" />
                            <span>Voucher</span>
                          </button>
                        </div>

                        {/* Referral Section */}
                        <div className="mx-4 mb-3 p-3 bg-[#252629] rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[#6B7280] text-xs">Become a Premier Inviter and enjoy...</p>
                              <p className="text-white font-mono text-sm mt-1">{referralCode}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(referralCode, 'referral');
                                }}
                                className="p-2 hover:bg-[#2B2F36] rounded-lg transition-colors"
                              >
                                {copiedReferral ? (
                                  <Check className="w-4 h-4 text-[#FCD535]" />
                                ) : (
                                  <Copy className="w-4 h-4 text-[#6B7280]" />
                                )}
                              </button>
                              <div className="w-8 h-8 bg-[#2B2F36] rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-[#6B7280]" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Menu Items */}
                        <div className="py-2 border-t border-[#2B2F36]">
                          <button
                            onClick={() => {
                              navigate('/settings?section=api');
                              setShowProfileMenu(false);
                            }}
                            className="w-full flex items-center space-x-3 px-4 py-2.5 text-[#E5E7EB] hover:bg-[#252629] transition-all"
                          >
                            <Link2 className="w-5 h-5 text-[#9CA3AF]" />
                            <span>Exchange Connections</span>
                          </button>

                          <button
                            onClick={() => {
                              navigate('/settings');
                              setShowProfileMenu(false);
                            }}
                            className="w-full flex items-center space-x-3 px-4 py-2.5 text-[#E5E7EB] hover:bg-[#252629] transition-all"
                          >
                            <SlidersHorizontal className="w-5 h-5 text-[#9CA3AF]" />
                            <span>Settings</span>
                          </button>
                        </div>

                        {/* Logout Button */}
                        <div className="p-3 border-t border-[#2B2F36]">
                          <button
                            onClick={() => {
                              handleLogout();
                              setShowProfileMenu(false);
                            }}
                            className="w-full py-2.5 bg-[#252629] hover:bg-[#222226] text-white rounded-lg font-medium transition-colors"
                          >
                            Log out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Notifications - Bitget style */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2 text-[#9CA3AF] hover:text-white hover:bg-[#252629] rounded-lg transition-colors relative"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-[#FCD535] rounded-full"></span>
                    )}
                  </button>

                  {/* Notifications Dropdown - Bitget style */}
                  <AnimatePresence>
                    {showNotifications && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-80 bg-[#1B1B1D] border border-[#2B2F36] rounded-xl shadow-dropdown z-50"
                      >
                        <div className="p-4 border-b border-[#2B2F36]">
                          <h3 className="text-white font-semibold">Notifications</h3>
                          <p className="text-[#6B7280] text-sm">{unreadCount} new messages</p>
                        </div>

                        <div className="max-h-96 overflow-y-auto">
                          {notifications.length > 0 ? (
                            notifications.map((notification) => {
                              const IconComponent = getNotificationIcon(notification.type);
                              return (
                                <div
                                  key={notification.id}
                                  className={`p-4 border-b border-[#2B2F36] hover:bg-[#252629] transition-colors cursor-pointer ${!notification.read ? 'bg-[#FCD535]/5' : ''
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
                                    <div className={`p-2 rounded-lg ${notification.type === 'trade' ? 'bg-[#FCD535]/10 text-[#FCD535]' :
                                        notification.type === 'performance' ? 'bg-[#FCD535]/10 text-[#FCD535]' :
                                          notification.type === 'strategy' ? 'bg-[#F59E0B]/10 text-[#F59E0B]' :
                                            notification.type === 'market' ? 'bg-[#FCD535]/10 text-[#FCD535]' :
                                              notification.type === 'goal' ? 'bg-[#FCD535]/10 text-[#FCD535]' :
                                                notification.type === 'whale' ? 'bg-[#F43F5E]/10 text-[#F43F5E]' :
                                                  'bg-[#2B2F36] text-[#9CA3AF]'
                                      }`}>
                                      <IconComponent className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1">
                                      <h4 className="text-white font-medium text-sm">{notification.title}</h4>
                                      <p className="text-[#6B7280] text-sm mt-1">{notification.message}</p>
                                      <div className="flex items-center justify-between mt-2">
                                        <p className="text-[#9CA3AF] text-xs">{notification.time}</p>
                                        {notification.action && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              markAsRead(notification.id);
                                              navigate(notification.action!.url);
                                              setShowNotifications(false);
                                            }}
                                            className="text-[#FCD535] hover:text-[#FFE066] text-xs font-medium px-2 py-1 rounded-md hover:bg-[#FCD535]/10 transition-all"
                                          >
                                            {notification.action.label}
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                    {!notification.read && (
                                      <div className="w-2 h-2 bg-[#FCD535] rounded-full mt-2" />
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="p-8 text-center">
                              <Bell className="w-12 h-12 text-[#6B7280] mx-auto mb-3 opacity-50" />
                              <p className="text-[#6B7280] text-sm">No notifications</p>
                            </div>
                          )}
                        </div>

                        {notifications.length > 0 && (
                          <div className="p-4 border-t border-[#2B2F36] space-y-2">
                            <button
                              onClick={markAllAsRead}
                              className="w-full text-[#FCD535] hover:text-[#FFE066] text-sm font-medium transition-colors py-2 px-3 rounded-lg hover:bg-[#FCD535]/10"
                            >
                              Mark all as read
                            </button>
                            <button
                              onClick={() => {
                                navigate('/settings');
                                setShowNotifications(false);
                              }}
                              className="w-full text-[#9CA3AF] hover:text-white text-sm transition-colors py-2 px-3 rounded-lg hover:bg-[#252629]"
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
                  className="px-4 py-2 text-sm font-medium text-white hover:text-[#FCD535] hover:bg-[#252629] rounded-lg transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={() => navigate('/signup')}
                  className="px-4 py-2 text-sm font-semibold text-[#151517] bg-[#FCD535] hover:bg-[#FFE066] rounded-lg transition-colors"
                >
                  Sign Up
                </button>
              </>
            )}

            {/* Utility Icons - Bitget style */}
            <div className="hidden md:flex items-center space-x-1 border-l border-[#2B2F36] pl-2 ml-1">
              {/* Language Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowLanguageCurrency(!showLanguageCurrency)}
                  className="p-2 text-[#9CA3AF] hover:text-white hover:bg-[#252629] rounded-lg transition-colors"
                >
                  <Globe className="w-5 h-5" />
                </button>

                {/* Language Dropdown - Bitget style */}
                <AnimatePresence>
                  {showLanguageCurrency && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-80 bg-[#1B1B1D] border border-[#2B2F36] rounded-xl shadow-dropdown z-[100]"
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
                            className="w-full px-3 py-2 bg-[#252629] border border-[#2B2F36] rounded-lg text-white text-sm placeholder-[#6B7280] focus:outline-none focus:border-[#FCD535] transition-all"
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
                                  ? 'text-[#FCD535] font-medium bg-[#FCD535]/10'
                                  : 'text-[#9CA3AF] hover:text-white hover:bg-[#252629]'
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

      {/* Mobile Menu - Bitget style */}
      <AnimatePresence>
        {showMobileMenu && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden border-t border-[#2B2F36] bg-[#151517]"
          >
            <div className="px-4 py-4 space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setShowMobileMenu(false)}
                    className={`
                      block px-3 py-2.5 text-sm font-medium rounded-lg transition-colors
                      ${isActive ? 'bg-[#1B1B1D] text-[#FCD535]' : 'text-white hover:text-[#FCD535] hover:bg-[#252629]'}
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
      {(Object.values(openDropdowns).some(Boolean) || showNotifications || showProfileMenu || showSearchDropdown || showLanguageCurrency || showWalletDropdown || showTradingDropdown || showMoreDropdown) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setOpenDropdowns({});
            setShowNotifications(false);
            setShowProfileMenu(false);
            setShowSearchDropdown(false);
            setShowLanguageCurrency(false);
            setShowWalletDropdown(false);
            setShowTradingDropdown(false);
            setShowMoreDropdown(false);
          }}
        />
      )}
    </nav>
  );
}







