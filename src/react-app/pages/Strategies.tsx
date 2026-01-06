import DashboardLayout from "@/react-app/components/DashboardLayout";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Target,
  TrendingUp,
  Activity,
  Zap,
  Calendar,
  DollarSign,
  BarChart3,
  Loader2,
  Settings,
  Sparkles,
  Trophy,
  Eye,
  PieChart,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import { useState, useEffect } from "react";
import { useStrategies, useCreateStrategy, useUpdateStrategy, useStrategyPerformance } from "@/react-app/hooks/useStrategies";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguageCurrency } from "@/react-app/contexts/LanguageCurrencyContext";

interface StrategyFormData {
  name: string;
  description: string;
  category: string;
  rules: string;
  risk_per_trade: string;
  target_rr: string;
  timeframe: string;
  is_active: boolean;
}

const initialFormData: StrategyFormData = {
  name: '',
  description: '',
  category: '',
  rules: '',
  risk_per_trade: '',
  target_rr: '',
  timeframe: '',
  is_active: true
};

export default function StrategiesPage() {
  const { currency, convertCurrency } = useLanguageCurrency();
  const [conversionRate, setConversionRate] = useState<number>(1);
  const currencyCode = currency.split('-')[0];

  useEffect(() => {
    const loadRate = async () => {
      if (currencyCode === 'USD') {
        setConversionRate(1);
      } else {
        const rate = await convertCurrency(1, 'USD');
        setConversionRate(rate);
      }
    };
    loadRate();
  }, [currency, currencyCode]);

  const formatCurrency = (amount: number): string => {
    const converted = amount * conversionRate;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(converted);
  };

  const formatPrice = (price: number | string): string => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    const converted = numPrice * conversionRate;
    const currencySymbol = currency.split('-')[1] || currencyCode;
    return `${currencySymbol}${converted.toFixed(4)}`;
  };

  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<any>(null);
  const [formData, setFormData] = useState<StrategyFormData>(initialFormData);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [viewingPerformance, setViewingPerformance] = useState<number | null>(null);

  const { strategies, loading, refetch } = useStrategies();
  const { mutate: createStrategy, loading: creating } = useCreateStrategy();
  const { mutate: updateStrategy, loading: updating } = useUpdateStrategy(editingStrategy?.id || 0);

  const { performance, loading: performanceLoading } = useStrategyPerformance(viewingPerformance || 0);

  // Filter strategies
  const filteredStrategies = strategies.filter(strategy => {
    const matchesSearch = !searchTerm ||
      strategy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      strategy.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      strategy.category?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = !selectedCategory || strategy.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = Array.from(new Set(strategies.map(s => s.category).filter(Boolean))).sort() as string[];

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Strategy name is required';
    if (formData.risk_per_trade && Number(formData.risk_per_trade) <= 0) {
      newErrors.risk_per_trade = 'Risk per trade must be positive';
    }
    if (formData.target_rr && Number(formData.target_rr) <= 0) {
      newErrors.target_rr = 'Target R/R must be positive';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      console.log('Validation errors:', newErrors);
    }
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleSubmit called');

    if (!validateForm()) {
      console.log('Validation failed');
      return;
    }
    console.log('Validation passed, submitting:', formData);

    try {
      const strategyData = {
        name: formData.name,
        description: formData.description.trim() || null,
        category: formData.category.trim() || null,
        rules: formData.rules.trim() || null,
        risk_per_trade: formData.risk_per_trade ? Number(formData.risk_per_trade) : null,
        target_rr: formData.target_rr ? Number(formData.target_rr) : null,
        timeframe: formData.timeframe.trim() || null,
        is_active: Boolean(formData.is_active) // Ensure it's always a boolean
      };

      if (showEditForm && editingStrategy) {
        await updateStrategy(strategyData);
        setShowEditForm(false);
        setEditingStrategy(null);
      } else {
        await createStrategy(strategyData);
        setShowAddForm(false);
      }

      setFormData(initialFormData);
      setErrors({});
      refetch();
    } catch (error) {
      console.error('Failed to save strategy:', error);
      
      // Extract error message properly
      let errorMessage = 'An unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        // Try to extract message from error object
        if ('message' in error && typeof error.message === 'string') {
          errorMessage = error.message;
        } else if ('error' in error) {
          errorMessage = typeof error.error === 'string' ? error.error : JSON.stringify(error.error);
        } else {
          errorMessage = JSON.stringify(error);
        }
      }
      
      alert(`Failed to save strategy: ${errorMessage}`);
      setErrors({ submit: errorMessage });
    }
  };

  const handleEdit = (strategy: any) => {
    console.log('handleEdit called with strategy:', strategy);
    setEditingStrategy(strategy);
    setFormData({
      name: strategy.name,
      description: strategy.description ?? '',
      category: strategy.category ?? '',
      rules: strategy.rules ?? '',
      risk_per_trade: strategy.risk_per_trade ? strategy.risk_per_trade.toString() : '',
      target_rr: strategy.target_rr ? strategy.target_rr.toString() : '',
      timeframe: strategy.timeframe ?? '',
      is_active: Boolean(strategy.is_active) // Convert number (0/1) to boolean
    });
    setShowEditForm(true);
    setShowAddForm(false);
  };

  const handleDelete = async (id: number) => {
    console.log('handleDelete called with id:', id);
    if (!confirm('Are you sure you want to delete this strategy? This action cannot be undone.')) return;

    try {
      const response = await fetch(`/api/strategies/${id}`, { 
        method: 'DELETE', 
        credentials: 'include' 
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to delete strategy: ${response.status}`);
      }

      refetch();
    } catch (error) {
      console.error('Failed to delete strategy:', error);
      let errorMessage = 'An unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && 'error' in error) {
        errorMessage = typeof error.error === 'string' ? error.error : JSON.stringify(error.error);
      }
      alert(`Failed to delete strategy: ${errorMessage}`);
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setErrors({});
    setShowAddForm(false);
    setShowEditForm(false);
    setEditingStrategy(null);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getCategoryColor = (category: string | null) => {
    if (!category) return 'from-gray-500 to-gray-600';
    const colors = {
      'Momentum': 'from-green-500 to-emerald-600',
      'Mean Reversion': 'from-blue-500 to-cyan-600',
      'Breakout': 'from-purple-500 to-violet-600',
      'Scalping': 'from-red-500 to-pink-600',
      'Swing': 'from-orange-500 to-yellow-600',
      'News Trading': 'from-indigo-500 to-purple-600',
    };
    return colors[category as keyof typeof colors] || 'from-gray-500 to-gray-600';
  };

  const getPerformanceColor = (value: number, isWinRate = false) => {
    if (isWinRate) {
      if (value >= 60) return 'text-green-400';
      if (value >= 50) return 'text-yellow-400';
      return 'text-red-400';
    } else {
      if (value > 0) return 'text-green-400';
      if (value < 0) return 'text-red-400';
      return 'text-gray-400';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0D0F18] rounded-xl p-4 border border-white/10"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 via-blue-600/5 to-emerald-600/5" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-purple-500/10 to-transparent rounded-full blur-3xl" />

          <div className="relative flex flex-col xl:flex-row xl:items-center xl:justify-between">
            <div className="mb-6 xl:mb-0">
              <div className="flex items-center space-x-4 mb-4">
                <div className="p-3 bg-gradient-to-r from-purple-500 via-blue-500 to-emerald-500 rounded-2xl shadow-2xl">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl xl:text-5xl font-bold text-white mb-2">
                    Trading Strategies
                  </h1>
                  <p className="text-gray-300 text-lg">
                    Build, test, and optimize your trading playbooks
                  </p>
                </div>
              </div>
            </div>

            {/* Strategy Stats */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {[
                { label: 'Total Strategies', value: strategies.length, icon: Target },
                { label: 'Active', value: strategies.filter(s => s.is_active).length, icon: Zap },
                { label: 'Avg Win Rate', value: `${Math.round(strategies.reduce((sum, s) => sum + s.win_rate, 0) / Math.max(strategies.length, 1))}%`, icon: Trophy },
                { label: 'Best Strategy', value: strategies.length > 0 ? strategies.reduce((best, current) => current.total_pnl > best.total_pnl ? current : best).name.slice(0, 8) + '...' : 'None', icon: Sparkles }
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="text-center p-4 bg-[#0D0F18] rounded-xl border border-white/10"
                >
                  <stat.icon className="w-5 h-5 text-purple-400 mx-auto mb-2" />
                  <div className="text-xl font-bold text-white">{stat.value}</div>
                  <div className="text-xs text-gray-400">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Action Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col lg:flex-row gap-4"
        >
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search strategies by name, description, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-gray-800/50 backdrop-blur-sm border border-gray-600/50 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:bg-gray-800 transition-all"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-4 bg-gray-800/50 border border-gray-600/50 rounded-2xl text-white focus:outline-none focus:border-purple-500 transition-all"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          {/* Add Strategy */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setShowAddForm(true);
              setShowEditForm(false);
              setFormData(initialFormData);
            }}
            className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-4 rounded-2xl font-medium transition-all shadow-lg"
          >
            <Plus className="w-5 h-5" />
            <span>Add Strategy</span>
          </motion.button>
        </motion.div>

        {/* Strategies Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50 animate-pulse">
                <div className="h-4 bg-gray-700 rounded mb-4" />
                <div className="h-6 bg-gray-700 rounded mb-2" />
                <div className="h-4 bg-gray-700 rounded" />
              </div>
            ))
          ) : filteredStrategies.length === 0 ? (
            <div className="col-span-full text-center py-20">
              <div className="bg-[#0D0F18] rounded-xl p-4 border border-white/10">
                <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Target className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">No strategies found</h3>
                <p className="text-gray-400 mb-8 max-w-md mx-auto">
                  {searchTerm || selectedCategory ?
                    'Try adjusting your filters to see more strategies.' :
                    'Create your first trading strategy to track your methodology.'
                  }
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAddForm(true)}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold transition-all shadow-lg"
                >
                  Create Your First Strategy
                </motion.button>
              </div>
            </div>
          ) : (
            filteredStrategies.map((strategy, index) => (
              <motion.div
                key={strategy.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="group relative bg-[#0D0F18] rounded-xl p-4 border border-white/10 hover:bg-white/5 transition-all overflow-hidden"
              >
                {/* Background gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${getCategoryColor(strategy.category || null)} opacity-5 group-hover:opacity-10 transition-opacity`} />

                {/* Strategy Header */}
                <div className="relative flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className={`p-2 rounded-xl bg-gradient-to-r ${getCategoryColor(strategy.category || null)} shadow-lg`}>
                        <Target className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-xl font-bold text-white">{strategy.name}</h3>
                        {!strategy.is_active && (
                          <span className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs rounded-full border border-gray-500/30">
                            Inactive
                          </span>
                        )}
                      </div>
                    </div>

                    {strategy.category && (
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${getCategoryColor(strategy.category || null)} text-white shadow-sm`}>
                        {strategy.category}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 opacity-70 group-hover:opacity-100 transition-opacity relative z-10" style={{ pointerEvents: 'auto' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('View button clicked for strategy:', strategy.id);
                        setViewingPerformance(strategy.id);
                      }}
                      className="p-2 text-blue-400 hover:text-blue-300 rounded-lg hover:bg-blue-500/20 transition-all cursor-pointer"
                      title="View Performance"
                      style={{ pointerEvents: 'auto' }}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Edit button clicked for strategy:', strategy.id);
                        handleEdit(strategy);
                      }}
                      className="p-2 text-purple-400 hover:text-purple-300 rounded-lg hover:bg-purple-500/20 transition-all cursor-pointer"
                      title="Edit Strategy"
                      style={{ pointerEvents: 'auto' }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Delete button clicked for strategy:', strategy.id);
                        handleDelete(strategy.id);
                      }}
                      className="p-2 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/20 transition-all cursor-pointer"
                      title="Delete Strategy"
                      style={{ pointerEvents: 'auto' }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Strategy Description */}
                {strategy.description && (
                  <div className="relative mb-4">
                    <p className="text-gray-300 text-sm line-clamp-2">{strategy.description}</p>
                  </div>
                )}

                {/* Strategy Stats */}
                <div className="relative grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <span className="text-gray-400 text-xs">Win Rate</span>
                    <p className={`font-bold ${getPerformanceColor(strategy.win_rate, true)}`}>
                      {strategy.win_rate.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs">Total P&L</span>
                    <p className={`font-bold ${getPerformanceColor(strategy.total_pnl)}`}>
                      {formatCurrency(strategy.total_pnl)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs">Trades</span>
                    <p className="text-white font-medium">{strategy.trade_count}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs">Avg Return</span>
                    <p className={`font-medium ${getPerformanceColor(strategy.avg_return)}`}>
                      ${strategy.avg_return.toFixed(0)}
                    </p>
                  </div>
                </div>

                {/* Strategy Rules Preview */}
                {strategy.rules && (
                  <div className="relative mb-4 p-3 bg-gray-700/20 rounded-xl border border-gray-600/30">
                    <div className="flex items-center space-x-2 mb-2">
                      <Settings className="w-4 h-4 text-purple-400" />
                      <span className="text-gray-300 text-xs font-medium">Rules</span>
                    </div>
                    <p className="text-gray-400 text-xs line-clamp-2">{strategy.rules}</p>
                  </div>
                )}

                {/* Strategy Details */}
                <div className="relative flex items-center justify-between text-xs text-gray-400 pt-4 border-t border-gray-700/50">
                  <div className="flex items-center space-x-4">
                    {strategy.timeframe && (
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{strategy.timeframe}</span>
                      </div>
                    )}
                    {strategy.risk_per_trade && (
                      <div className="flex items-center space-x-1">
                        <PieChart className="w-3 h-3" />
                        <span>{strategy.risk_per_trade}% risk</span>
                      </div>
                    )}
                  </div>
                  <span>Last used: {formatDate(strategy.last_used || null)}</span>
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-purple-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none" />
              </motion.div>
            ))
          )}
        </motion.div>

        {/* Strategy Form Modal */}
        <AnimatePresence>
          {(showAddForm || showEditForm) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={resetForm}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-[#0D0F18] rounded-xl p-4 border border-white/10 w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl shadow-lg">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-3xl font-bold text-white">
                      {showEditForm ? 'Edit Strategy' : 'Create New Strategy'}
                    </h3>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={resetForm}
                    className="text-gray-400 hover:text-white p-3 rounded-xl hover:bg-gray-700/50 transition-all"
                  >
                    <X className="w-6 h-6" />
                  </motion.button>
                </div>

                {/* Error Display */}
                {errors.submit && (
                  <div className="mb-6 p-4 bg-[#E74C3C]/10 border border-[#E74C3C]/30 rounded-xl">
                    <p className="text-[#E74C3C] font-medium">{errors.submit}</p>
                  </div>
                )}

                {Object.keys(errors).length > 0 && !errors.submit && (
                  <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                    <p className="text-yellow-400 font-medium mb-2">Please fix the following errors:</p>
                    <ul className="list-disc list-inside text-yellow-300 text-sm space-y-1">
                      {Object.entries(errors).map(([key, value]) => (
                        <li key={key}>{value}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <style>{`
                  .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                  }
                  .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(31, 41, 55, 0.5);
                    border-radius: 10px;
                  }
                  .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: linear-gradient(180deg, #8B5CF6 0%, #6366F1 100%);
                    border-radius: 10px;
                  }
                  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(180deg, #7C3AED 0%, #4F46E5 100%);
                  }
                  
                  /* Modern Number Input Spinners */
                  input[type="number"]::-webkit-inner-spin-button,
                  input[type="number"]::-webkit-outer-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                  }
                  
                  input[type="number"] {
                    -moz-appearance: textfield;
                  }
                  
                  .modern-number-input {
                    position: relative;
                  }
                  
                  .modern-number-input::after {
                    content: '';
                    position: absolute;
                    right: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 20px;
                    height: 40px;
                    pointer-events: none;
                    background: linear-gradient(to bottom, 
                      rgba(139, 92, 246, 0.1) 0%,
                      transparent 50%,
                      rgba(139, 92, 246, 0.1) 100%);
                    border-radius: 8px;
                  }
                  
                  .number-spinner {
                    position: absolute;
                    right: 8px;
                    top: 50%;
                    transform: translateY(-50%);
                    display: flex;
                    flex-direction: column;
                    gap: 0px;
                    z-index: 10;
                  }
                  
                  .spinner-button {
                    width: 12px;
                    height: 12px;
                    min-width: 12px;
                    min-height: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(99, 102, 241, 0.12) 100%);
                    border: 1px solid rgba(139, 92, 246, 0.2);
                    border-radius: 2px;
                    cursor: pointer;
                    transition: all 0.15s ease;
                    color: #A78BFA;
                    padding: 0;
                    margin: 0;
                  }
                  
                  .spinner-button:hover {
                    background: linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(99, 102, 241, 0.25) 100%);
                    border-color: rgba(139, 92, 246, 0.4);
                    color: #C4B5FD;
                  }
                  
                  .spinner-button:active {
                    transform: scale(0.85);
                  }
                  
                  .spinner-button svg {
                    width: 6px !important;
                    height: 6px !important;
                    min-width: 6px;
                    min-height: 6px;
                  }
                `}</style>
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-white text-sm font-semibold mb-3 flex items-center space-x-2">
                        <Target className="w-4 h-4 text-purple-400" />
                        <span>Strategy Name *</span>
                      </label>
                      <div className="relative">
                      <input
                        type="text"
                        placeholder="Momentum Breakout"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className={`w-full px-5 py-4 bg-gradient-to-br from-gray-700/90 to-gray-800/90 backdrop-blur-sm border-2 rounded-2xl text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all shadow-lg ${errors.name ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/50' : 'border-gray-600/30 hover:border-gray-500/50'
                          }`}
                      />
                      </div>
                      {errors.name && <p className="text-red-400 text-sm mt-2 flex items-center space-x-1"><span>⚠</span><span>{errors.name}</span></p>}
                    </div>

                    <div>
                      <label className="block text-white text-sm font-semibold mb-3 flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-blue-400" />
                        <span>Category</span>
                      </label>
                      <div className="relative">
                      <input
                        type="text"
                        placeholder="Momentum, Mean Reversion, etc."
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="w-full px-5 py-4 bg-gradient-to-br from-gray-700/90 to-gray-800/90 backdrop-blur-sm border-2 border-gray-600/30 hover:border-gray-500/50 rounded-2xl text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all shadow-lg"
                      />
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-white text-sm font-semibold mb-3 flex items-center space-x-2">
                      <BarChart3 className="w-4 h-4 text-cyan-400" />
                      <span>Description</span>
                    </label>
                    <textarea
                      placeholder="Brief description of your strategy..."
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-5 py-4 bg-gradient-to-br from-gray-700/90 to-gray-800/90 backdrop-blur-sm border-2 border-gray-600/30 hover:border-gray-500/50 rounded-2xl text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all resize-none shadow-lg custom-scrollbar"
                      style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#8B5CF6 #1F2937'
                      }}
                    />
                  </div>

                  {/* Rules */}
                  <div>
                    <label className="block text-white text-sm font-semibold mb-3 flex items-center space-x-2">
                      <Settings className="w-4 h-4 text-emerald-400" />
                      <span>Trading Rules</span>
                    </label>
                    <textarea
                      placeholder="Entry: Break above resistance with volume confirmation. Exit: 2:1 R/R or trailing stop..."
                      rows={4}
                      value={formData.rules}
                      onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                      className="w-full px-5 py-4 bg-gradient-to-br from-gray-700/90 to-gray-800/90 backdrop-blur-sm border-2 border-gray-600/30 hover:border-gray-500/50 rounded-2xl text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all resize-none shadow-lg custom-scrollbar"
                      style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#8B5CF6 #1F2937'
                      }}
                    />
                  </div>

                  {/* Risk Management */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-white text-sm font-semibold mb-3 flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-orange-400" />
                        <span>Risk per Trade (%)</span>
                      </label>
                      <div className="relative modern-number-input">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="2.0"
                        value={formData.risk_per_trade}
                        onChange={(e) => setFormData({ ...formData, risk_per_trade: e.target.value })}
                          className={`w-full px-5 py-4 pr-8 bg-gradient-to-br from-gray-700/90 to-gray-800/90 backdrop-blur-sm border-2 rounded-2xl text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all shadow-lg ${errors.risk_per_trade ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/50' : 'border-gray-600/30 hover:border-gray-500/50'
                          }`}
                      />
                        <div className="number-spinner">
                          <button
                            type="button"
                            className="spinner-button"
                            onClick={() => {
                              const current = parseFloat(formData.risk_per_trade) || 0;
                              setFormData({ ...formData, risk_per_trade: (current + 0.1).toFixed(1) });
                            }}
                            tabIndex={-1}
                          >
                            <ChevronUp className="w-1.5 h-1.5" />
                          </button>
                          <button
                            type="button"
                            className="spinner-button"
                            onClick={() => {
                              const current = parseFloat(formData.risk_per_trade) || 0;
                              setFormData({ ...formData, risk_per_trade: Math.max(0, current - 0.1).toFixed(1) });
                            }}
                            tabIndex={-1}
                          >
                            <ChevronDown className="w-1.5 h-1.5" />
                          </button>
                        </div>
                      </div>
                      {errors.risk_per_trade && <p className="text-red-400 text-sm mt-2 flex items-center space-x-1"><span>⚠</span><span>{errors.risk_per_trade}</span></p>}
                    </div>

                    <div>
                      <label className="block text-white text-sm font-semibold mb-3 flex items-center space-x-2">
                        <Target className="w-4 h-4 text-yellow-400" />
                        <span>Target R/R Ratio</span>
                      </label>
                      <div className="relative modern-number-input">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="2.0"
                        value={formData.target_rr}
                        onChange={(e) => setFormData({ ...formData, target_rr: e.target.value })}
                          className={`w-full px-5 py-4 pr-8 bg-gradient-to-br from-gray-700/90 to-gray-800/90 backdrop-blur-sm border-2 rounded-2xl text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all shadow-lg ${errors.target_rr ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/50' : 'border-gray-600/30 hover:border-gray-500/50'
                          }`}
                      />
                        <div className="number-spinner">
                          <button
                            type="button"
                            className="spinner-button"
                            onClick={() => {
                              const current = parseFloat(formData.target_rr) || 0;
                              setFormData({ ...formData, target_rr: (current + 0.1).toFixed(1) });
                            }}
                            tabIndex={-1}
                          >
                            <ChevronUp className="w-1.5 h-1.5" />
                          </button>
                          <button
                            type="button"
                            className="spinner-button"
                            onClick={() => {
                              const current = parseFloat(formData.target_rr) || 0;
                              setFormData({ ...formData, target_rr: Math.max(0, current - 0.1).toFixed(1) });
                            }}
                            tabIndex={-1}
                          >
                            <ChevronDown className="w-1.5 h-1.5" />
                          </button>
                        </div>
                      </div>
                      {errors.target_rr && <p className="text-red-400 text-sm mt-2 flex items-center space-x-1"><span>⚠</span><span>{errors.target_rr}</span></p>}
                    </div>

                    <div>
                      <label className="block text-white text-sm font-semibold mb-3 flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-indigo-400" />
                        <span>Timeframe</span>
                      </label>
                      <div className="relative">
                      <input
                        type="text"
                        placeholder="15 minutes, 1 hour, daily..."
                        value={formData.timeframe}
                        onChange={(e) => setFormData({ ...formData, timeframe: e.target.value })}
                          className="w-full px-5 py-4 bg-gradient-to-br from-gray-700/90 to-gray-800/90 backdrop-blur-sm border-2 border-gray-600/30 hover:border-gray-500/50 rounded-2xl text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all shadow-lg"
                      />
                      </div>
                    </div>
                  </div>

                  {/* Active Toggle */}
                  <div className="flex items-center justify-between p-6 bg-gradient-to-r from-gray-800/50 to-gray-700/30 rounded-2xl border border-gray-600/30 hover:border-purple-500/50 transition-all">
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-xl transition-all ${formData.is_active 
                        ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20' 
                        : 'bg-gray-700/50'
                      }`}>
                        <Zap className={`w-5 h-5 transition-colors ${formData.is_active ? 'text-green-400' : 'text-gray-400'}`} />
                      </div>
                      <div>
                        <label htmlFor="is_active" className="text-white font-semibold text-lg cursor-pointer block">
                          Strategy Status
                    </label>
                        <p className="text-gray-400 text-sm mt-1">
                          {formData.is_active ? 'This strategy is currently active' : 'This strategy is currently inactive'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Modern Toggle Switch */}
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                        formData.is_active 
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                          : 'bg-gray-600'
                      }`}
                      role="switch"
                      aria-checked={formData.is_active}
                      aria-label="Toggle strategy active status"
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${
                          formData.is_active ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Form Actions */}
                  <div className="flex space-x-4 pt-8">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={creating || updating}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-purple-600/50 disabled:to-blue-600/50 text-white px-8 py-4 rounded-xl font-semibold transition-all flex items-center justify-center space-x-2 shadow-lg"
                    >
                      {(creating || updating) ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Target className="w-5 h-5" />
                          <span>{showEditForm ? 'Update Strategy' : 'Create Strategy'}</span>
                        </>
                      )}
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={resetForm}
                      className="px-8 py-4 bg-gray-600/50 hover:bg-gray-600 text-white rounded-xl font-semibold transition-all"
                    >
                      Cancel
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Performance Modal */}
        <AnimatePresence>
          {viewingPerformance && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setViewingPerformance(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-[#0D0F18] rounded-xl p-4 border border-white/10 w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl shadow-lg">
                      <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold text-white">Strategy Performance</h3>
                      <p className="text-gray-400">Detailed analytics and insights</p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setViewingPerformance(null)}
                    className="text-gray-400 hover:text-white p-3 rounded-xl hover:bg-gray-700/50 transition-all"
                    title="Close"
                  >
                    <X className="w-6 h-6" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setViewingPerformance(null)}
                    className="text-gray-400 hover:text-white p-3 rounded-xl hover:bg-gray-700/50 transition-all"
                  >
                    <X className="w-6 h-6" />
                  </motion.button>
                </div>

                {performanceLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Performance Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      {[
                        { label: 'Total Trades', value: performance.totalTrades, icon: Activity },
                        { label: 'Win Rate', value: `${performance.winRate.toFixed(1)}%`, icon: Target },
                        { label: 'Total P&L', value: `$${performance.totalPnl.toFixed(0)}`, icon: DollarSign },
                        { label: 'Avg P&L', value: `$${performance.avgPnl.toFixed(0)}`, icon: TrendingUp },
                        { label: 'Best Trade', value: `$${performance.bestTrade.toFixed(0)}`, icon: Trophy },
                        { label: 'Worst Trade', value: `$${performance.worstTrade.toFixed(0)}`, icon: Activity }
                      ].map((metric, index) => (
                        <motion.div
                          key={metric.label}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="bg-[#0D0F18] rounded-xl p-4 border border-white/10"
                        >
                          <metric.icon className="w-5 h-5 text-blue-400 mb-2" />
                          <div className="text-white font-bold text-lg">{metric.value}</div>
                          <div className="text-gray-400 text-xs">{metric.label}</div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Recent Trades */}
                    {performance.trades.length > 0 && (
                      <div>
                        <h4 className="text-xl font-semibold text-white mb-4">Recent Trades</h4>
                        <div className="bg-[#0D0F18] rounded-xl border border-white/10 overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-gray-600/50">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Symbol</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Direction</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Entry</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Exit</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">P&L</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Date</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-600/30">
                                {performance.trades.slice(0, 10).map((trade: any) => (
                                  <tr key={trade.id} className="hover:bg-gray-600/20">
                                    <td className="px-4 py-3 text-white font-medium">{trade.symbol}</td>
                                    <td className="px-4 py-3">
                                      <span className={`px-2 py-1 rounded text-xs font-medium ${trade.direction === 'long' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                        }`}>
                                        {trade.direction.toUpperCase()}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-300">{formatPrice(trade.entry_price)}</td>
                                    <td className="px-4 py-3 text-gray-300">{formatPrice(trade.exit_price)}</td>
                                    <td className={`px-4 py-3 font-medium ${getPerformanceColor(trade.pnl)}`}>
                                      {formatCurrency(trade.pnl || 0)}
                                    </td>
                                    <td className="px-4 py-3 text-gray-400 text-sm">
                                      {formatDate(trade.entry_date)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
