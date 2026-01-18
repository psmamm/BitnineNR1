import DashboardLayout from "@/react-app/components/DashboardLayout";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  Search,
  TrendingUp,
  Users,
  Trophy,
  Shield,
  BarChart3,
  DollarSign,
  Filter
} from "lucide-react";
import { useNavigate } from "react-router";

// Bitget-Style Copy Trading Page
export default function CopyTradingPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'spot' | 'futures'>('futures');
  const [timeFilter, setTimeFilter] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Mock elite traders data
  const eliteTraders = [
    {
      id: '1',
      name: 'CryptoKing',
      avatar: null,
      verified: true,
      roi: 342.5,
      pnl: 125430,
      winRate: 78,
      followers: 12450,
      aum: 2450000,
      maxDrawdown: 12.3,
      sharpeRatio: 2.4,
      trades: 1250,
      avgHoldTime: '4h 32m',
      tags: ['Scalper', 'BTC/ETH'],
    },
    {
      id: '2',
      name: 'AlphaTrader',
      avatar: null,
      verified: true,
      roi: 256.8,
      pnl: 89560,
      winRate: 72,
      followers: 8920,
      aum: 1890000,
      maxDrawdown: 15.7,
      sharpeRatio: 2.1,
      trades: 980,
      avgHoldTime: '2h 15m',
      tags: ['Day Trader', 'Altcoins'],
    },
    {
      id: '3',
      name: 'SwingMaster',
      avatar: null,
      verified: false,
      roi: 198.4,
      pnl: 67890,
      winRate: 68,
      followers: 6540,
      aum: 1250000,
      maxDrawdown: 18.2,
      sharpeRatio: 1.9,
      trades: 420,
      avgHoldTime: '2d 8h',
      tags: ['Swing', 'Multi-Asset'],
    },
    {
      id: '4',
      name: 'GridBot_Pro',
      avatar: null,
      verified: true,
      roi: 145.2,
      pnl: 45670,
      winRate: 85,
      followers: 4320,
      aum: 890000,
      maxDrawdown: 8.5,
      sharpeRatio: 2.8,
      trades: 3200,
      avgHoldTime: '45m',
      tags: ['Grid', 'Low Risk'],
    },
    {
      id: '5',
      name: 'MomentumPro',
      avatar: null,
      verified: false,
      roi: 112.8,
      pnl: 34560,
      winRate: 62,
      followers: 3210,
      aum: 560000,
      maxDrawdown: 22.4,
      sharpeRatio: 1.6,
      trades: 890,
      avgHoldTime: '6h 45m',
      tags: ['Momentum', 'High Vol'],
    },
  ];

  const stats = [
    { label: 'Total Traders', value: '12,450+', icon: Users },
    { label: 'Total AUM', value: '$450M+', icon: DollarSign },
    { label: 'Total Profit Shared', value: '$25M+', icon: TrendingUp },
    { label: 'Active Copiers', value: '89,000+', icon: BarChart3 },
  ];

  const tabs = [
    { id: 'futures' as const, label: 'Futures Copy' },
    { id: 'spot' as const, label: 'Spot Copy' },
  ];

  const timeFilters = [
    { id: '7d' as const, label: '7D' },
    { id: '30d' as const, label: '30D' },
    { id: '90d' as const, label: '90D' },
    { id: 'all' as const, label: 'All' },
  ];

  return (
    <DashboardLayout>
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-[#1B1B1D] to-[#252629] rounded-2xl border border-[#2B2F36] p-8 relative overflow-hidden"
          >
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FCD535]/5 rounded-full blur-3xl" />

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-6 h-6 text-[#FCD535]" />
                <span className="text-[#FCD535] font-medium">Copy Trading</span>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Follow the Best Traders
              </h1>
              <p className="text-[#9CA3AF] text-lg mb-6 max-w-xl">
                Automatically copy trades from elite traders and grow your portfolio with minimal effort.
              </p>
              <div className="flex items-center gap-4">
                <button className="px-6 py-3 bg-[#FCD535] hover:bg-[#FFE066] text-[#151517] rounded-lg font-semibold transition-colors">
                  Become a Trader
                </button>
                <button className="px-6 py-3 bg-[#252629] hover:bg-[#222226] text-white border border-[#2B2F36] rounded-lg font-medium transition-colors">
                  How it Works
                </button>
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-5"
              >
                <div className="flex items-center gap-3 mb-2">
                  <stat.icon className="w-5 h-5 text-[#FCD535]" />
                  <span className="text-[#6B7280] text-sm">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </motion.div>
            ))}
          </div>

          {/* Tabs & Filters */}
          <div className="flex items-center justify-between">
            {/* Tabs */}
            <div className="flex items-center gap-1 bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-[#252629] text-white'
                      : 'text-[#9CA3AF] hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Right side filters */}
            <div className="flex items-center gap-4">
              {/* Time Filter */}
              <div className="flex items-center gap-1 bg-[#1B1B1D] rounded-lg border border-[#2B2F36] p-1">
                {timeFilters.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setTimeFilter(filter.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                      timeFilter === filter.id
                        ? 'bg-[#252629] text-white'
                        : 'text-[#6B7280] hover:text-white'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
                <input
                  type="text"
                  placeholder="Search traders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 bg-[#1B1B1D] border border-[#2B2F36] rounded-lg text-white placeholder-[#6B7280] focus:border-[#FCD535] focus:outline-none transition-colors text-sm w-64"
                />
              </div>

              {/* Filter Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors ${
                  showFilters
                    ? 'bg-[#FCD535]/10 border-[#FCD535] text-[#FCD535]'
                    : 'bg-[#1B1B1D] border-[#2B2F36] text-[#9CA3AF] hover:text-white'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span className="text-sm">Filters</span>
              </button>
            </div>
          </div>

          {/* Traders List */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] overflow-hidden"
          >
            {/* Table Header */}
            <div className="grid grid-cols-7 gap-4 px-6 py-4 border-b border-[#2B2F36] text-sm text-[#6B7280]">
              <div className="col-span-2">Trader</div>
              <div className="text-right">ROI ({timeFilter})</div>
              <div className="text-right">Win Rate</div>
              <div className="text-right">Followers</div>
              <div className="text-right">AUM</div>
              <div className="text-right">Action</div>
            </div>

            {/* Traders */}
            {eliteTraders.map((trader, index) => (
              <motion.div
                key={trader.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * index }}
                className="grid grid-cols-7 gap-4 px-6 py-5 border-b border-[#2B2F36] hover:bg-[#252629] transition-colors items-center cursor-pointer"
                onClick={() => navigate(`/copy-trading/${trader.id}`)}
              >
                {/* Trader Info */}
                <div className="col-span-2 flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-[#252629] border border-[#2B2F36] flex items-center justify-center text-white font-bold">
                      {trader.name.slice(0, 2).toUpperCase()}
                    </div>
                    {index < 3 && (
                      <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        index === 0 ? 'bg-[#FFD700] text-[#151517]' :
                        index === 1 ? 'bg-[#C0C0C0] text-[#151517]' :
                        'bg-[#CD7F32] text-white'
                      }`}>
                        {index + 1}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{trader.name}</span>
                      {trader.verified && (
                        <Shield className="w-4 h-4 text-[#FCD535]" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {trader.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-[#2B2F36] text-[#9CA3AF] text-[10px] rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ROI */}
                <div className="text-right">
                  <span className={`text-lg font-bold ${trader.roi > 0 ? 'text-[#FCD535]' : 'text-[#F43F5E]'}`}>
                    {trader.roi > 0 ? '+' : ''}{trader.roi.toFixed(1)}%
                  </span>
                </div>

                {/* Win Rate */}
                <div className="text-right">
                  <span className="text-white font-medium">{trader.winRate}%</span>
                </div>

                {/* Followers */}
                <div className="text-right">
                  <span className="text-white">{trader.followers.toLocaleString()}</span>
                </div>

                {/* AUM */}
                <div className="text-right">
                  <span className="text-white">${(trader.aum / 1000000).toFixed(2)}M</span>
                </div>

                {/* Action */}
                <div className="text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Copy action
                    }}
                    className="px-4 py-2 bg-[#FCD535] hover:bg-[#FFE066] text-[#151517] rounded-lg text-sm font-medium transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Load More */}
          <div className="text-center">
            <button className="px-6 py-3 bg-[#1B1B1D] hover:bg-[#252629] text-white border border-[#2B2F36] rounded-lg font-medium transition-colors">
              Load More Traders
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
