import DashboardLayout from "@/react-app/components/DashboardLayout";
import {
  Plus,
  Search,
  Filter,
  Loader2,
  Edit2,
  Trash2,
  X,
  Settings,
  Download,
  Upload,
  Check,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Zap,
  BarChart3,
  Grid3X3,
  List,
  ArrowUpDown,
  Activity,
  Award,
  TrendingUp as TrendingUpIcon,
  PiggyBank,
  Coins,
  CreditCard,
  CheckCircle2,
  FileSpreadsheet,
  Wallet
} from "lucide-react";
import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useTrades, useCreateTrade, useUpdateTrade, useDailyStats, type Trade as TradeEntity } from "@/react-app/hooks/useTrades";
import { useWalletTransactions } from "@/react-app/hooks/useWalletTransactions";
import { useWallet } from "@/react-app/contexts/WalletContext";
import { useStrategies } from "@/react-app/hooks/useStrategies";
import { useBinanceCoins } from "@/react-app/hooks/useBinanceCoins";
import { useForexPairs } from "@/react-app/hooks/useForexPairs";
import { useStockSymbols } from "@/react-app/hooks/useStockSymbols";
import { useUserEquity } from "@/react-app/hooks/useUserEquity";
import { useLivePnL } from "@/react-app/hooks/useLivePnL";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguageCurrency } from "@/react-app/contexts/LanguageCurrencyContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { SymbolSearchDropdown, Modern3DDropdown, ModernInput, ModernDateInput } from "@/react-app/components/FormComponents";
import { CalendarView } from "@/react-app/components/CalendarView";

/**
 * Trade form data structure
 */
interface TradeFormData {
  symbol: string;
  asset_type: 'stocks' | 'crypto' | 'forex';
  direction: 'long' | 'short';
  quantity: string;
  entry_price: string;
  exit_price: string;
  entry_date: string;
  exit_date: string;
  strategy_id: string;
  commission: string;
  notes: string;
  tags: string;
  leverage: string;
  setup: string;
  mistakes: string;
  screenshot_url: string;
  emotion: string;
  rating: string;
}

const initialFormData: TradeFormData = {
  symbol: '',
  asset_type: 'crypto',
  direction: 'long',
  quantity: '',
  entry_price: '',
  exit_price: '',
  entry_date: '',
  exit_date: '',
  strategy_id: '',
  commission: '',
  notes: '',
  tags: '',
  leverage: '1',
  setup: '',
  mistakes: '',
  screenshot_url: '',
  emotion: '',
  rating: ''
};

type ExtendedTrade = TradeEntity & {
  source?: 'api' | 'imported';
  screenshot_url?: string;
  setup?: string;
  mistakes?: string;
  session?: string;
  emotion?: string;
  checklist?: string[];
};

type ChecklistItem = {
  id: string;
  label: string;
  checked: boolean;
};

/**
 * Main Journal Page Component
 * Displays and manages trading journal entries with advanced filtering and analytics
 */
export default function JournalPage() {
  const { currency, convertCurrency } = useLanguageCurrency();
  const [conversionRate, setConversionRate] = useState<number>(1);
  const currencyCode = currency.split('-')[0];

  // Load conversion rate when currency changes
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
  }, [currency, convertCurrency, currencyCode]);

  // Format currency values
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
    const num = typeof price === 'string' ? parseFloat(price) : price;
    const converted = num * conversionRate;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(converted);
  };

  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingTrade, setEditingTrade] = useState<any>(null);
  const [formData, setFormData] = useState<TradeFormData>(initialFormData);
  const [searchTerm, setSearchTerm] = useState('');
  const [symbolFilter, setSymbolFilter] = useState('');
  const [directionFilter, setDirectionFilter] = useState('');
  const [assetTypeFilter, setAssetTypeFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showEquityModal, setShowEquityModal] = useState(false);
  const [equityInput, setEquityInput] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importedTrades, setImportedTrades] = useState<ExtendedTrade[]>([]);
  const [journalNote, setJournalNote] = useState('');

  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: 'plan', label: 'Followed plan & rules', checked: false },
    { id: 'risk', label: 'Respected risk limits', checked: false },
    { id: 'docs', label: 'Documented trades & tags', checked: false },
    { id: 'emotion', label: 'No revenge trading', checked: false },
  ]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [sortOptions, setSortOptions] = useState({ field: 'entry_date', direction: 'desc' as 'asc' | 'desc' });
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);
  const [savedViews, setSavedViews] = useState<{ name: string; sort: typeof sortOptions; search: string; symbol: string; direction: string; asset: string }[]>([]);
  const [newViewName, setNewViewName] = useState('');
  const toggleChecklistItem = (id: string) => {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const applyPreset = (preset: 'all' | 'last7' | 'profitable' | 'losing' | 'crypto') => {
    switch (preset) {
      case 'all':
        clearFilters();
        setSelectedDateFilter(null);
        break;
      case 'last7':
        clearFilters();
        setSelectedDateFilter(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
        break;
      case 'profitable':
        // stub: could filter profitable trades in future
        break;
      case 'losing':
        // stub: could filter losing trades in future
        break;
      case 'crypto':
        setAssetTypeFilter('crypto');
        break;
    }
  };

  const saveCurrentView = () => {
    const name = newViewName.trim() || `View ${savedViews.length + 1}`;
    const view = {
      name,
      sort: sortOptions,
      search: searchTerm,
      symbol: symbolFilter,
      direction: directionFilter,
      asset: assetTypeFilter
    };
    setSavedViews(prev => [...prev, view]);
    setNewViewName('');
  };

  const applySavedView = (name: string) => {
    const view = savedViews.find(v => v.name === name);
    if (!view) return;
    setSortOptions(view.sort);
    setSearchTerm(view.search);
    setSymbolFilter(view.symbol);
    setDirectionFilter(view.direction);
    setAssetTypeFilter(view.asset);
    setSelectedDateFilter(null);
  };

  const addChecklistItem = () => {
    const text = newChecklistItem.trim();
    if (!text) return;
    setChecklist(prev => [...prev, { id: `custom-${prev.length}-${Date.now()}`, label: text, checked: false }]);
    setNewChecklistItem('');
  };

  const removeChecklistItem = (id: string) => {
    setChecklist(prev => prev.filter(i => i.id !== id));
  };

  useEffect(() => {
    const storedNote = localStorage.getItem('journal-note');
    const storedChecklist = localStorage.getItem('journal-checklist');
    if (storedNote) setJournalNote(storedNote);
    if (storedChecklist) {
      try {
        const parsed = JSON.parse(storedChecklist);
        if (Array.isArray(parsed)) {
          setChecklist(parsed);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('journal-note', journalNote);
  }, [journalNote]);

  useEffect(() => {
    localStorage.setItem('journal-checklist', JSON.stringify(checklist));
  }, [checklist]);

  useEffect(() => {
    const saved = localStorage.getItem('journal-saved-views');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setSavedViews(parsed);
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('journal-saved-views', JSON.stringify(savedViews));
  }, [savedViews]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  // Dropdown states
  const [assetTypeOpen, setAssetTypeOpen] = useState(false);
  const [strategyOpen, setStrategyOpen] = useState(false);
  const [symbolOpen, setSymbolOpen] = useState(false);

  const { trades: rawTrades, loading, refetch } = useTrades(500, 0, searchTerm, symbolFilter, directionFilter, assetTypeFilter);
  const { dailyStats } = useDailyStats();
  const { wallet } = useWallet();
  const { trades: walletTrades, loading: walletTradesLoading } = useWalletTransactions();

  const allTrades: ExtendedTrade[] = useMemo(() => {
    return [
      ...rawTrades.map(t => ({ ...t, source: 'api' as const })),
      ...importedTrades,
      ...(wallet.isConnected ? walletTrades.map(t => ({ ...t, source: 'wallet' as const })) : [])
    ];
  }, [rawTrades, importedTrades, walletTrades, wallet.isConnected]);

  // Get open positions for live P&L calculation
  const openPositions = useMemo(() => {
    return rawTrades
      .filter(trade => !trade.is_closed)
      .map(trade => ({
        id: trade.id,
        symbol: trade.symbol,
        asset_type: trade.asset_type || 'stocks' as const,
        direction: trade.direction,
        quantity: trade.quantity,
        entry_price: trade.entry_price,
        leverage: trade.leverage,
        commission: trade.commission
      }));
  }, [rawTrades]);

  const { livePnLData, loading: livePnLLoading } = useLivePnL(openPositions);

  // Helper function to get live P&L for a trade
  const getLivePnL = (tradeId: number) => {
    return livePnLData.find((data: any) => data.tradeId === tradeId);
  };

  const { strategies } = useStrategies();
  const { mutate: createTrade, loading: creating } = useCreateTrade();
  const { mutate: updateTrade, loading: updating } = useUpdateTrade(editingTrade?.id || 0);
  const { coins: binanceCoins } = useBinanceCoins();
  const { pairs: forexPairs } = useForexPairs();
  const { stocks: stockSymbols } = useStockSymbols();
  const { equity, updateStartingCapital } = useUserEquity();

  // Apply advanced filters and sorting - optimized with early returns
  const trades = useMemo(() => {
    if (!allTrades || allTrades.length === 0) return [];

    let filtered = allTrades;

    if (selectedDateFilter) {
      filtered = filtered.filter(trade => (trade.exit_date || trade.entry_date) === selectedDateFilter);
    }

    // Optimized sorting
    if (filtered.length > 1) {
      filtered.sort((a, b) => {
        let aValue: any = (a as any)[sortOptions.field];
        let bValue: any = (b as any)[sortOptions.field];

        if (aValue == null) aValue = sortOptions.direction === 'asc' ? -Infinity : Infinity;
        if (bValue == null) bValue = sortOptions.direction === 'asc' ? -Infinity : Infinity;

        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();

        if (sortOptions.direction === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      });
    }

    return filtered;
  }, [allTrades, sortOptions, selectedDateFilter]);

  const uniqueSymbols = Array.from(new Set(trades.map(trade => trade.symbol))).sort();

  // Get symbols based on selected asset type
  const getSymbolsForAssetType = (assetType: string) => {
    switch (assetType) {
      case 'crypto':
        return binanceCoins.map(coin => ({
          symbol: coin.symbol,
          name: coin.name,
          price: coin.price,
          type: 'crypto' as const
        }));
      case 'forex':
        return forexPairs.map(pair => ({
          symbol: pair.symbol,
          name: pair.name,
          price: pair.price,
          type: 'forex' as const
        }));
      case 'stocks':
        return stockSymbols.map(stock => ({
          symbol: stock.symbol,
          name: stock.name,
          exchange: stock.exchange,
          type: 'stocks' as const
        }));
      default:
        return [];
    }
  };

  const availableSymbols = getSymbolsForAssetType(formData.asset_type);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.symbol.trim()) newErrors.symbol = 'Symbol is required';
    if (!formData.quantity) newErrors.quantity = 'Positionsgröße ist erforderlich';
    if (Number(formData.quantity) <= 0) newErrors.quantity = 'Positionsgröße muss positiv sein';
    if (!formData.entry_price) newErrors.entry_price = 'Entry price is required';
    if (Number(formData.entry_price) <= 0) newErrors.entry_price = 'Entry price must be positive';
    if (!formData.entry_date) newErrors.entry_date = 'Entry date is required';

    if (formData.exit_price && Number(formData.exit_price) <= 0) {
      newErrors.exit_price = 'Exit price must be positive';
    }

    if (formData.commission && Number(formData.commission) < 0) {
      newErrors.commission = 'Fee cannot be negative';
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
      const tradeData = {
        symbol: formData.symbol.toUpperCase(),
        asset_type: formData.asset_type,
        direction: formData.direction,
        quantity: Number(formData.quantity),
        entry_price: Number(formData.entry_price),
        exit_price: formData.exit_price ? Number(formData.exit_price) : undefined,
        entry_date: formData.entry_date,
        exit_date: formData.exit_date || undefined,
        strategy_id: formData.strategy_id ? Number(formData.strategy_id) : undefined,
        commission: formData.commission ? Number(formData.commission) : undefined,
        notes: formData.notes || undefined,
        tags: formData.tags || undefined,
        leverage: formData.leverage ? Number(formData.leverage) : 1,
        setup: formData.setup || undefined,
        mistakes: formData.mistakes || undefined,
        screenshot_url: formData.screenshot_url || undefined,
        emotion: formData.emotion || undefined,
        rating: formData.rating ? Number(formData.rating) : undefined
      };

      if (showEditForm && editingTrade) {
        await updateTrade(tradeData);
        setShowEditForm(false);
        setEditingTrade(null);
      } else {
        await createTrade(tradeData);
        setShowAddForm(false);
      }

      setFormData(initialFormData);
      setErrors({});
      refetch();
    } catch (error) {
      console.error('Failed to save trade:', error);
      alert(`Failed to save trade: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleEdit = (trade: any) => {
    setEditingTrade(trade);
    setFormData({
      symbol: trade.symbol,
      asset_type: trade.asset_type || 'stocks',
      direction: trade.direction,
      quantity: trade.quantity.toString(),
      entry_price: trade.entry_price.toString(),
      exit_price: trade.exit_price ? trade.exit_price.toString() : '',
      entry_date: trade.entry_date,
      exit_date: trade.exit_date || '',
      strategy_id: trade.strategy_id ? trade.strategy_id.toString() : '',
      commission: trade.commission ? trade.commission.toString() : '',
      notes: trade.notes || '',
      tags: trade.tags || '',
      leverage: trade.leverage ? trade.leverage.toString() : '1',
      setup: (trade as ExtendedTrade).setup || '',
      mistakes: (trade as ExtendedTrade).mistakes || '',
      screenshot_url: (trade as ExtendedTrade).screenshot_url || '',
      emotion: (trade as ExtendedTrade).emotion || '',
      rating: (trade as ExtendedTrade).rating?.toString() || ''
    });
    setShowEditForm(true);
    setShowAddForm(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this trade?')) return;

    try {
      const response = await fetch(`/api/trades/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        refetch();
      } else {
        console.error('Failed to delete trade');
      }
    } catch (error) {
      console.error('Failed to delete trade:', error);
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setErrors({});
    setShowAddForm(false);
    setShowEditForm(false);
    setEditingTrade(null);
    // Close all dropdowns
    setAssetTypeOpen(false);
    setStrategyOpen(false);
    setSymbolOpen(false);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSymbolFilter('');
    setDirectionFilter('');
    setAssetTypeFilter('');
  };

  const parseCsvToTrades = (csv: string): ExtendedTrade[] => {
    const lines = csv.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length <= 1) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const required = ['symbol', 'direction', 'quantity', 'entry_price', 'entry_date'];
    const hasRequired = required.every(r => headers.includes(r));
    if (!hasRequired) {
      throw new Error(`CSV must include headers: ${required.join(', ')}`);
    }

    const idBase = Date.now();
    const records: ExtendedTrade[] = [];

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map(cell => cell.trim());
      if (row.length === 0 || row.every(c => c === '')) continue;
      const get = (key: string) => {
        const idx = headers.indexOf(key);
        return idx >= 0 ? row[idx] : '';
      };

      const entry_date = get('entry_date') || new Date().toISOString().split('T')[0];
      const exit_date = get('exit_date') || undefined;
      const quantity = Number(get('quantity') || 0);
      const entry_price = Number(get('entry_price') || 0);
      const exit_price = get('exit_price') ? Number(get('exit_price')) : undefined;
      const pnl = get('pnl') ? Number(get('pnl')) : undefined;

      records.push({
        id: idBase * 1000 + i,
        symbol: get('symbol').toUpperCase(),
        asset_type: (get('asset_type') as any) || 'crypto',
        direction: (get('direction') as 'long' | 'short') || 'long',
        quantity,
        entry_price,
        exit_price,
        entry_date,
        exit_date,
        pnl,
        commission: get('commission') ? Number(get('commission')) : undefined,
        notes: get('notes') || undefined,
        tags: get('tags') || undefined,
        leverage: get('leverage') ? Number(get('leverage')) : 1,
        is_closed: !!exit_price,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        source: 'imported',
      });
    }

    return records;
  };

  const handleImportSubmit = () => {
    try {
      const parsed = parseCsvToTrades(importText);
      if (parsed.length === 0) {
        setImportError('Keine gültigen Zeilen gefunden.');
        return;
      }
      setImportedTrades(prev => [...prev, ...parsed]);
      setImportText('');
      setImportError(null);
      setShowImportModal(false);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import fehlgeschlagen');
    }
  };

  const handleImportFile = async (file?: File | null) => {
    if (!file) return;
    const text = await file.text();
    setImportText(text);
    setImportError(null);
    setShowImportModal(true);
  };

  const handleExportFiltered = () => {
    if (!trades.length) return;
    const header = ['symbol', 'direction', 'quantity', 'entry_price', 'exit_price', 'entry_date', 'exit_date', 'pnl', 'tags', 'notes'];
    const rows = trades.map(t => [
      t.symbol,
      t.direction,
      t.quantity,
      t.entry_price,
      t.exit_price ?? '',
      t.entry_date,
      t.exit_date ?? '',
      t.pnl ?? '',
      t.tags ?? '',
      t.notes ?? ''
    ]);

    const totalTrades = trades.length;
    const totalPnl = trades.reduce((s, t) => s + (t.pnl || 0), 0);
    const winCount = trades.filter(t => (t.pnl || 0) > 0).length;
    const winRate = totalTrades ? (winCount / totalTrades) * 100 : 0;
    const summary = ['Summary', '', totalTrades, '', '', '', '', totalPnl.toFixed(2), '', `Winrate ${winRate.toFixed(1)}%`];

    const csvContent = [header, ...rows, summary]
      .map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'journal-trades.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleEquityUpdate = async () => {
    const newCapital = parseFloat(equityInput);
    if (isNaN(newCapital) || newCapital <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const result = await updateStartingCapital(newCapital);
    if (result.success) {
      setShowEquityModal(false);
      setEquityInput('');
    } else {
      alert(result.error || 'Error updating capital');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getAssetIcon = (assetType: string) => {
    switch (assetType) {
      case 'crypto': return '₿';
      case 'forex': return '💱';
      default: return '📈';
    }
  };

  const getAssetGradient = (assetType: string) => {
    switch (assetType) {
      case 'crypto': return 'from-orange-500 to-yellow-500';
      case 'forex': return 'from-blue-500 to-cyan-500';
      default: return 'from-purple-500 to-pink-500';
    }
  };

  const computeRiskMetrics = useCallback((closedTrades: ExtendedTrade[]) => {
    if (!closedTrades || closedTrades.length === 0) {
      return {
        profitFactor: 0,
        expectancy: 0,
        bestStreak: 0,
        worstStreak: 0,
        maxDrawdown: 0,
        avgRR: 0,
      };
    }

    const wins = closedTrades.filter(t => (t.pnl || 0) > 0);
    const losses = closedTrades.filter(t => (t.pnl || 0) < 0);

    const grossWin = wins.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + (t.pnl || 0), 0));
    const profitFactor = grossLoss === 0 ? (grossWin > 0 ? Infinity : 0) : grossWin / grossLoss;

    const avgWin = wins.length ? grossWin / wins.length : 0;
    const avgLoss = losses.length ? Math.abs(losses.reduce((sum, t) => sum + (t.pnl || 0), 0)) / losses.length : 0;
    const winRate = closedTrades.length ? wins.length / closedTrades.length : 0;
    const loseRate = 1 - winRate;
    const expectancy = (avgWin * winRate) - (avgLoss * loseRate);

    let bestStreak = 0;
    let worstStreak = 0;
    let currentWin = 0;
    let currentLoss = 0;

    const rrValues: number[] = [];

    const sorted = [...closedTrades].sort((a, b) =>
      new Date(a.exit_date || a.entry_date).getTime() - new Date(b.exit_date || b.entry_date).getTime()
    );

    let equityVal = equity.startingCapital;
    let peak = equityVal;
    let maxDrawdown = 0;

    sorted.forEach(trade => {
      const pnl = trade.pnl || 0;
      equityVal += pnl;
      if (equityVal > peak) peak = equityVal;
      if (peak > 0) {
        const dd = ((peak - equityVal) / peak) * 100;
        if (dd > maxDrawdown) maxDrawdown = dd;
      }

      if (pnl > 0) {
        currentWin += 1;
        bestStreak = Math.max(bestStreak, currentWin);
        currentLoss = 0;
      } else if (pnl < 0) {
        currentLoss += 1;
        worstStreak = Math.max(worstStreak, currentLoss);
        currentWin = 0;
      } else {
        currentWin = 0;
        currentLoss = 0;
      }

      // Approximate R multiple using 1% notional risk fallback
      const notionalRisk = Math.max(Math.abs(trade.entry_price * trade.quantity * 0.01), 1);
      if (pnl !== 0) {
        rrValues.push(pnl / notionalRisk);
      }
    });

    const avgRR = rrValues.length ? rrValues.reduce((s, v) => s + v, 0) / rrValues.length : 0;

    return {
      profitFactor,
      expectancy,
      bestStreak,
      worstStreak,
      maxDrawdown,
      avgRR,
    };
  }, [equity.startingCapital]);

  const riskMetrics = useMemo(() => {
    const closed = trades.filter(t => t.is_closed && t.pnl !== null);
    return computeRiskMetrics(closed as ExtendedTrade[]);
  }, [trades, computeRiskMetrics]);









  // Calculate enhanced portfolio stats - optimized calculations
  const portfolioStats = useMemo(() => {
    if (!trades || trades.length === 0) {
      return {
        totalTrades: 0, closedTrades: 0, openTrades: 0, totalPnl: 0,
        winRate: 0, avgTrade: 0, avgRR: 0, bestTrade: 0, worstTrade: 0, avgHoldingTime: 0
      };
    }

    const closedTrades = trades.filter(t => t.is_closed && t.pnl !== null);
    const openTrades = trades.filter(t => !t.is_closed);

    if (closedTrades.length === 0) {
      return {
        totalTrades: trades.length, closedTrades: 0, openTrades: openTrades.length,
        totalPnl: 0, winRate: 0, avgTrade: 0, avgRR: 0, bestTrade: 0, worstTrade: 0, avgHoldingTime: 0
      };
    }

    let totalPnl = 0;
    let winCount = 0;
    let totalWinPnl = 0;
    let totalLossPnl = 0;
    let bestTrade = -Infinity;
    let worstTrade = Infinity;
    let totalHoldingTime = 0;
    let holdingTimeCount = 0;

    // Single pass calculation for better performance
    for (const trade of closedTrades) {
      const pnl = trade.pnl || 0;
      totalPnl += pnl;

      if (pnl > 0) {
        winCount++;
        totalWinPnl += pnl;
      } else {
        totalLossPnl += Math.abs(pnl);
      }

      if (pnl > bestTrade) bestTrade = pnl;
      if (pnl < worstTrade) worstTrade = pnl;

      // Calculate holding time
      if (trade.exit_date) {
        const entry = new Date(trade.entry_date);
        const exit = new Date(trade.exit_date);
        totalHoldingTime += (exit.getTime() - entry.getTime());
        holdingTimeCount++;
      }
    }

    const winRate = (winCount / closedTrades.length) * 100;
    const avgWin = winCount > 0 ? totalWinPnl / winCount : 0;
    const avgLoss = (closedTrades.length - winCount) > 0 ? totalLossPnl / (closedTrades.length - winCount) : 0;
    const avgRR = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 999 : 0;
    const avgHoldingTime = holdingTimeCount > 0 ? totalHoldingTime / holdingTimeCount / (1000 * 60 * 60 * 24) : 0;

    return {
      totalTrades: trades.length,
      closedTrades: closedTrades.length,
      openTrades: openTrades.length,
      totalPnl,
      winRate,
      avgTrade: totalPnl / closedTrades.length,
      avgRR,
      bestTrade: bestTrade === -Infinity ? 0 : bestTrade,
      worstTrade: worstTrade === Infinity ? 0 : worstTrade,
      avgHoldingTime
    };
  }, [trades]);

  // Prepare chart data - Equity curve starts at 0 and accumulates from trades
  const equityCurveData = useMemo(() => {
    const data = [];
    let runningPnl = 0; // Start at 0, not starting capital

    const sortedTrades = [...trades]
      .filter(t => t.is_closed && t.pnl !== null)
      .sort((a, b) => new Date(a.exit_date || a.entry_date).getTime() - new Date(b.exit_date || b.entry_date).getTime());

    // Generate last 30 days of data
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Add trades that occurred on this day
      sortedTrades.forEach(trade => {
        const tradeDate = trade.exit_date || trade.entry_date;
        if (tradeDate === dateStr) {
          runningPnl += trade.pnl || 0;
        }
      });

      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: runningPnl
      });
    }

    return data;
  }, [trades]);



  const symbolData = useMemo(() => {
    const symbolCounts = trades.reduce((acc, trade) => {
      acc[trade.symbol] = (acc[trade.symbol] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(symbolCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([symbol, count]) => ({ symbol, count }));
  }, [trades]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0D0F18] border border-white/10 rounded-lg p-3">
          <p className="text-[#BDC3C7] text-sm mb-1">{label}</p>
          <p className="text-white font-semibold">
            {typeof payload[0].value === 'number' && payload[0].value > 100
              ? formatCurrency(payload[0].value)
              : payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-24 pt-2 w-full max-w-7xl mx-auto overflow-x-hidden px-4 sm:px-6 lg:px-8">
        {/* Clean Header */}
        <div className="bg-[#0D0F18] rounded-xl p-4 border border-white/10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Trade Journal</h1>
                <p className="text-[#7F8C8D] text-sm">Track and analyze your trading performance</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {trades.length !== rawTrades.length && (
                <div className="flex items-center space-x-2 text-[#667eea] bg-[#667eea]/10 px-3 py-2 rounded-lg border border-[#667eea]/20">
                  <Filter className="w-4 h-4" />
                  <span className="text-sm font-medium">{trades.length} of {rawTrades.length}</span>
                </div>
              )}
              <button
                onClick={() => {
                  setShowAddForm(true);
                  setShowEditForm(false);
                  setFormData(initialFormData);
                }}
                className="flex items-center space-x-2 h-11 bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:from-[#7B8EF0] hover:to-[#8A5CFF] text-white px-5 rounded-xl font-medium transition-all shadow-lg shadow-purple-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Add Trade</span>
              </button>
            </div>
          </div>
        </div>

        {/* Performance Widgets - 8 Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: 'Net P&L', value: `$${portfolioStats.totalPnl.toFixed(0)}`, sub: 'Closed trades', icon: DollarSign, color: portfolioStats.totalPnl >= 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]' },
            { label: 'Profit Factor', value: riskMetrics.profitFactor === Infinity ? '∞' : riskMetrics.profitFactor.toFixed(2), sub: 'Gross win / loss', icon: Activity, color: 'text-white' },
            { label: 'Expectancy', value: `$${riskMetrics.expectancy.toFixed(2)}`, sub: 'Avg per trade', icon: Zap, color: riskMetrics.expectancy >= 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]' },
            { label: 'Win Rate', value: `${portfolioStats.winRate.toFixed(1)}%`, sub: 'Closed trades', icon: Target, color: portfolioStats.winRate >= 50 ? 'text-[#2ECC71]' : 'text-[#E74C3C]' },
            { label: 'Max Drawdown', value: `${riskMetrics.maxDrawdown.toFixed(1)}%`, sub: 'vs equity', icon: TrendingDown, color: 'text-[#E74C3C]' },
            { label: 'Best Streak', value: `${riskMetrics.bestStreak} wins`, sub: 'In a row', icon: Award, color: 'text-[#2ECC71]' },
            { label: 'Loss Streak', value: `${riskMetrics.worstStreak} losses`, sub: 'In a row', icon: TrendingDown, color: 'text-[#E74C3C]' },
            { label: 'Avg R Multiple', value: riskMetrics.avgRR > 10 ? '∞' : riskMetrics.avgRR.toFixed(2), sub: 'estimated', icon: TrendingUpIcon, color: 'text-white' },
          ].map((card) => (
            <div key={card.label} className="bg-[#0D0F18] rounded-xl p-4 border border-white/10 hover:bg-white/5 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-[#6A3DF4]/10 rounded-lg">
                  <card.icon className="w-4 h-4 text-[#6A3DF4]" />
                </div>
                <span className="text-xs text-[#7F8C8D]">{card.sub}</span>
              </div>
              <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
              <div className="text-sm text-[#BDC3C7] mt-1">{card.label}</div>
            </div>
          ))}
        </div>

        {/* Calendar - Full Width */}
        <div className="bg-[#0D0F18] rounded-xl p-4 border border-white/10">
          <CalendarView
            dailyStats={dailyStats || []}
            selectedDate={selectedDateFilter}
            onSelectDate={(date) => setSelectedDateFilter(date)}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Equity Curve - Left */}
          <div className="bg-[#0D0F18] rounded-xl p-4 border border-white/10">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-[#667eea]/10 rounded-lg">
                <TrendingUp className="w-4 h-4 text-[#667eea]" />
              </div>
              <h3 className="text-lg font-semibold text-white">Equity Curve</h3>
            </div>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={equityCurveData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" stroke="#7F8C8D" fontSize={10} />
                  <YAxis stroke="#7F8C8D" fontSize={10} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="value" stroke="#667eea" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Symbols - Right */}
          <div className="bg-[#0D0F18] rounded-xl p-4 border border-white/10">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-[#667eea]/10 rounded-lg">
                <BarChart3 className="w-4 h-4 text-[#667eea]" />
              </div>
              <h3 className="text-lg font-semibold text-white">Top Traded Symbols</h3>
            </div>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={symbolData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="symbol" stroke="#7F8C8D" fontSize={11} />
                  <YAxis stroke="#7F8C8D" fontSize={11} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#667eea" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Checklist - Full */}
        <div className="bg-[#0D0F18] rounded-xl p-4 border border-white/10">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-[#2ECC71]/10 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-[#2ECC71]" />
              </div>
              <div>
                <div className="text-white font-semibold">Daily Checklist</div>
                <div className="text-xs text-[#7F8C8D]">
                  {checklist.filter(i => i.checked).length}/{checklist.length} complete
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#7F8C8D]">
              <button type="button" onClick={() => setChecklist(prev => prev.map(i => ({ ...i, checked: true })))} className="px-2 py-1 rounded bg-white/5 hover:text-white hover:bg-white/10">All</button>
              <button type="button" onClick={() => setChecklist(prev => prev.map(i => ({ ...i, checked: false })))} className="px-2 py-1 rounded bg-white/5 hover:text-white hover:bg-white/10">None</button>
              <button type="button" onClick={() => setChecklist([
                { id: 'plan', label: 'Followed plan & rules', checked: false },
                { id: 'risk', label: 'Respected risk limits', checked: false },
                { id: 'docs', label: 'Documented trades & tags', checked: false },
                { id: 'emotion', label: 'No revenge trading', checked: false },
              ])} className="px-2 py-1 rounded bg-white/5 hover:text-white hover:bg-white/10">Reset</button>
            </div>
          </div>

          <div className="w-full h-2 bg-white/5 rounded-full mb-4 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#6A3DF4] to-[#8A5CFF] transition-all"
              style={{ width: `${(checklist.filter(i => i.checked).length / Math.max(checklist.length, 1)) * 100}%` }}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <input
              value={newChecklistItem}
              onChange={(e) => setNewChecklistItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addChecklistItem();
                }
              }}
              placeholder="Add custom item..."
              className="flex-1 h-10 px-3 bg-[#0D0F18] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#6A3DF4]"
            />
            <button
              type="button"
              onClick={addChecklistItem}
              className="px-4 h-10 rounded-lg bg-gradient-to-r from-[#6A3DF4] to-[#8A5CFF] text-white text-sm font-semibold shadow-md"
            >
              Add
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {checklist.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 border border-white/10 hover:border-[#6A3DF4]/40 transition-colors"
              >
                <label className="flex items-center space-x-3 text-sm text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => toggleChecklistItem(item.id)}
                    className="sr-only peer"
                  />
                  <span
                    className={`flex items-center justify-center h-5 w-5 rounded-md border transition-all duration-150 ${item.checked
                      ? 'bg-gradient-to-r from-[#6A3DF4] to-[#8A5CFF] border-[#6A3DF4] shadow-[0_0_0_4px_rgba(106,61,244,0.15)]'
                      : 'bg-[#0D0F18] border-white/20'
                      }`}
                  >
                    {item.checked && <Check className="w-3 h-3 text-white" />}
                  </span>
                  <span className={`select-none transition-colors duration-150 ${item.checked ? 'text-white/60' : ''}`}>
                    {item.label}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => removeChecklistItem(item.id)}
                  className="text-white/40 hover:text-white transition-colors"
                  title="Remove item"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Search & Controls */}
        <div className="bg-[#0D0F18] rounded-xl p-4 border border-white/10">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#7F8C8D] w-4 h-4" />
              <input
                type="text"
                placeholder="Search trades..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-11 pl-11 pr-4 bg-[#0D0F18] border border-white/10 rounded-xl text-white placeholder-[#7F8C8D] focus:outline-none focus:border-[#667eea] transition-all"
              />
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Sort */}
              <div className="flex items-center space-x-2 bg-[#0D0F18] border border-white/10 rounded-xl px-3 h-11">
                <select
                  value={sortOptions.field}
                  onChange={(e) => setSortOptions(prev => ({ ...prev, field: e.target.value }))}
                  className="bg-transparent text-white text-sm focus:outline-none"
                >
                  <option value="entry_date">Date</option>
                  <option value="pnl">P&L</option>
                  <option value="symbol">Symbol</option>
                </select>
                <button
                  onClick={() => setSortOptions(prev => ({ ...prev, direction: prev.direction === 'asc' ? 'desc' : 'asc' }))}
                  className="text-[#7F8C8D] hover:text-white"
                >
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </div>

              {/* View Toggle */}
              <div className="flex bg-[#0D0F18] rounded-xl p-1 border border-white/10">
                <button
                  onClick={() => setViewMode('card')}
                  className={`flex items-center px-3 py-2 rounded-lg transition-all ${viewMode === 'card'
                    ? 'bg-[#667eea] text-white'
                    : 'text-[#7F8C8D] hover:text-white'
                    }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex items-center px-3 py-2 rounded-lg transition-all ${viewMode === 'table'
                    ? 'bg-[#667eea] text-white'
                    : 'text-[#7F8C8D] hover:text-white'
                    }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Filter */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 h-11 px-4 rounded-xl transition-all ${showFilters
                  ? 'bg-[#667eea] text-white'
                  : 'bg-[#0D0F18] border border-white/10 text-white hover:border-[#667eea]/50'
                  }`}
              >
                <Filter className="w-4 h-4" />
              </button>

              {/* Import/Export */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center h-11 bg-[#0D0F18] border border-white/10 hover:border-[#667eea]/50 text-white px-4 rounded-xl transition-all"
              >
                <Upload className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => handleImportFile(e.target.files?.[0])}
              />

              <button
                onClick={handleExportFiltered}
                className="flex items-center h-11 bg-[#0D0F18] border border-white/10 hover:border-[#667eea]/50 text-white px-4 rounded-xl transition-all"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Basic Filters Panel (simplified) */}
        <AnimatePresence>
          {showFilters && (
            <div className="bg-[#0D0F18] rounded-xl p-4 border border-white/10 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[#BDC3C7] text-sm font-medium mb-2">Symbol</label>
                  <select
                    value={symbolFilter}
                    onChange={(e) => setSymbolFilter(e.target.value)}
                    className="w-full h-12 px-4 bg-[#0D0F18] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#6A3DF4] transition-all"
                  >
                    <option value="">All Symbols</option>
                    {uniqueSymbols.map(symbol => (
                      <option key={symbol} value={symbol}>{symbol}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#BDC3C7] text-sm font-medium mb-2">Asset Type</label>
                  <div className="flex gap-2">
                    {[
                      { label: 'All', value: '' },
                      { label: 'Stocks', value: 'stocks' },
                      { label: 'Crypto', value: 'crypto' },
                      { label: 'Forex', value: 'forex' },
                    ].map(opt => (
                      <button
                        key={opt.label}
                        onClick={() => setAssetTypeFilter(opt.value)}
                        className={`flex-1 h-12 rounded-lg border text-sm font-semibold transition-all duration-150 active:scale-95 ${assetTypeFilter === opt.value
                          ? 'bg-[#6A3DF4] border-[#6A3DF4] text-white'
                          : 'bg-[#0D0F18] border-white/10 text-[#BDC3C7] hover:border-[#6A3DF4]/40'
                          }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[#BDC3C7] text-sm font-medium mb-2">Direction</label>
                  <div className="flex gap-2">
                    {[
                      { label: 'All', value: '' },
                      { label: 'Long', value: 'long' },
                      { label: 'Short', value: 'short' },
                    ].map(opt => (
                      <button
                        key={opt.label}
                        onClick={() => setDirectionFilter(opt.value)}
                        className={`flex-1 h-12 rounded-lg border text-sm font-semibold transition-all duration-150 active:scale-95 ${directionFilter === opt.value
                          ? 'bg-[#6A3DF4] border-[#6A3DF4] text-white'
                          : 'bg-[#0D0F18] border-white/10 text-[#BDC3C7] hover:border-[#6A3DF4]/40'
                          }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button onClick={clearFilters} className="h-10 px-3 rounded-lg border border-white/10 text-white hover:border-white/30">Clear All</button>
                <button onClick={() => applyPreset('all')} className="h-10 px-3 rounded-lg bg-white/5 text-white border border-white/10 hover:border-[#6A3DF4]/40">All</button>
                <button onClick={() => applyPreset('last7')} className="h-10 px-3 rounded-lg bg-white/5 text-white border border-white/10 hover:border-[#6A3DF4]/40">Last 7d</button>
                <button onClick={() => applyPreset('profitable')} className="h-10 px-3 rounded-lg bg-white/5 text-white border border-white/10 hover:border-[#6A3DF4]/40">Profitable</button>
                <button onClick={() => applyPreset('losing')} className="h-10 px-3 rounded-lg bg-white/5 text-white border border-white/10 hover:border-[#6A3DF4]/40">Losing</button>
                <button onClick={() => applyPreset('crypto')} className="h-10 px-3 rounded-lg bg-white/5 text-white border border-white/10 hover:border-[#6A3DF4]/40">Crypto only</button>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center space-x-2">
                  <input
                    value={newViewName}
                    onChange={(e) => setNewViewName(e.target.value)}
                    placeholder="Save current view as..."
                    className="flex-1 h-10 px-3 bg-[#0D0F18] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#6A3DF4]"
                  />
                  <button
                    onClick={saveCurrentView}
                    className="h-10 px-4 bg-[#6A3DF4] text-white rounded-lg text-sm font-semibold hover:bg-[#7B47FF]"
                  >
                    Save view
                  </button>
                </div>
                {savedViews.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {savedViews.map(view => (
                      <button
                        key={view.name}
                        onClick={() => applySavedView(view.name)}
                        className="px-3 py-1 text-xs bg-[#6A3DF4]/10 text-[#6A3DF4] border border-[#6A3DF4]/30 rounded-full hover:bg-[#6A3DF4]/20"
                      >
                        {view.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* Import Modal */}
        <AnimatePresence>
          {showImportModal && (
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowImportModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#0D0F18] w-full max-w-3xl rounded-xl border border-white/10 p-4"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-[#6A3DF4]/20 rounded-lg">
                      <FileSpreadsheet className="w-5 h-5 text-[#6A3DF4]" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">CSV Import</h3>
                      <p className="text-sm text-[#AAB0C0]">Headers: symbol, direction, quantity, entry_price, exit_price, entry_date, exit_date, pnl, tags, notes</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="p-2 rounded-lg hover:bg-white/10 text-white/70"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    rows={10}
                    className="w-full bg-[#0D0F18] border border-white/10 rounded-xl p-4 text-white placeholder-[#7F8C8D] focus:outline-none focus:border-[#6A3DF4] focus:ring-2 focus:ring-[#6A3DF4]/30"
                    placeholder="symbol,direction,quantity,entry_price,exit_price,entry_date,exit_date,pnl,tags,notes&#10;BTCUSDT,long,1,50000,52000,2024-06-20,2024-06-21,2000,breakout;news,Fed day breakout"
                  />
                  {importError && <div className="text-[#E74C3C] text-sm">{importError}</div>}
                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => setShowImportModal(false)}
                      className="px-4 py-2 rounded-lg border border-white/20 text-white hover:bg-white/10 transition-colors"
                    >
                      Abbrechen
                    </button>
                    <div className="flex items-center space-x-3">
                      <label className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#0D0F18] border border-white/10 hover:bg-white/5 text-white cursor-pointer transition-colors">
                        <Upload className="w-4 h-4" />
                        <span>CSV wählen</span>
                        <input
                          type="file"
                          accept=".csv,text/csv"
                          className="hidden"
                          onChange={(e) => handleImportFile(e.target.files?.[0])}
                        />
                      </label>
                      <button
                        onClick={handleImportSubmit}
                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#6A3DF4] to-[#8A5CFF] text-white font-semibold shadow-lg"
                      >
                        Importieren
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Trade Form Modal */}
        <AnimatePresence>
          {(showAddForm || showEditForm) && (
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={resetForm}
            >
              <div
                className="bg-[#0D0F18] rounded-xl p-4 border border-white/10 
                           w-full max-w-4xl max-h-[90vh] overflow-y-auto backdrop-blur-xl"
                onClick={(e) => e.stopPropagation()}
                style={{ zIndex: 60 }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center space-x-4">
                    <div className="p-4 bg-gradient-to-r from-[#6A3DF4] to-[#8A5CFF] rounded-xl shadow-lg">
                      <Plus className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold text-white mb-1">
                        {showEditForm ? 'Edit Trade' : 'Add New Trade'}
                      </h3>
                      <p className="text-[#BDC3C7]">
                        {showEditForm ? 'Update your trade details' : 'Record your trading activity'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={resetForm}
                    className="text-[#BDC3C7] hover:text-[#E74C3C] p-3 rounded-xl hover:bg-[#E74C3C]/10 transition-colors duration-200"
                  >
                    <X className="w-7 h-7" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-10">
                  {/* Section 1: Trade Setup */}
                  <div className="bg-[#0D0F18] rounded-xl p-4 border border-white/10">
                    <div className="flex items-center space-x-3 mb-8">
                      <div className="p-2 bg-[#6A3DF4]/20 rounded-xl">
                        <Coins className="w-5 h-5 text-[#6A3DF4]" />
                      </div>
                      <h4 className="text-lg font-bold text-[#6A3DF4] uppercase tracking-wider">
                        Trade Setup
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-[#BDC3C7] text-sm font-semibold mb-3">
                          Symbol *
                        </label>
                        <SymbolSearchDropdown
                          value={formData.symbol}
                          onChange={(value: string) => {
                            const selectedSymbol = availableSymbols.find(item => item.symbol === value);
                            if (selectedSymbol && 'price' in selectedSymbol && selectedSymbol.price) {
                              setFormData(prev => ({
                                ...prev,
                                symbol: value,
                                entry_price: selectedSymbol.price?.toString() || ''
                              }));
                            } else {
                              setFormData(prev => ({ ...prev, symbol: value }));
                            }
                          }}
                          options={[
                            { value: '', label: 'Select Symbol...', icon: '🔍' },
                            ...availableSymbols.map(item => ({
                              value: item.symbol,
                              label: item.symbol,
                              name: item.name,
                              price: 'price' in item ? item.price : undefined,
                              exchange: 'exchange' in item ? item.exchange : undefined,
                              type: item.type
                            }))
                          ]}
                          placeholder="Select Symbol..."
                          icon={Search}
                          isOpen={symbolOpen}
                          setIsOpen={setSymbolOpen}
                          renderOption={(option: any) => (
                            <div className="flex items-center justify-between w-full">
                              <div className="flex flex-col">
                                <div className="flex items-center space-x-2">
                                  <span className="font-semibold text-white">{option.label}</span>
                                </div>
                                {option.name && (
                                  <span className="text-xs text-[#7F8C8D] mt-1">{option.name}</span>
                                )}
                              </div>
                              {option.price && (
                                <div className="text-[#2ECC71] font-semibold text-sm">
                                  ${option.price.toLocaleString()}
                                </div>
                              )}
                            </div>
                          )}
                        />
                        {errors.symbol && <p className="text-[#E74C3C] text-sm mt-2">{errors.symbol}</p>}
                      </div>

                      <div>
                        <label className="block text-[#BDC3C7] text-sm font-semibold mb-3">
                          Asset Type *
                        </label>
                        <Modern3DDropdown
                          value={formData.asset_type}
                          onChange={(value: string) => setFormData({ ...formData, asset_type: value as 'stocks' | 'crypto' | 'forex' })}
                          options={[
                            { value: 'crypto', label: 'Crypto', icon: '₿' }
                          ]}
                          placeholder="Crypto"
                          icon={Coins}
                          isOpen={assetTypeOpen}
                          setIsOpen={setAssetTypeOpen}
                          renderOption={(option: any) => (
                            <div className="flex items-center space-x-3">
                              <span className="text-xl">{option.icon}</span>
                              <span className="font-semibold">{option.label}</span>
                            </div>
                          )}
                        />
                      </div>

                      <div>
                        <label className="block text-[#BDC3C7] text-sm font-semibold mb-3">
                          Direction *
                        </label>
                        <div className="flex space-x-3">
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, direction: 'long' })}
                            className={`flex-1 h-14 flex items-center justify-center space-x-3 rounded-xl font-semibold transition-all duration-200 ${formData.direction === 'long'
                              ? 'bg-[#2ECC71] text-white shadow-lg'
                              : 'bg-[#0D0F18] border border-white/10 text-[#BDC3C7] hover:bg-white/5'
                              }`}
                          >
                            <TrendingUp className="w-5 h-5" />
                            <span>LONG</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, direction: 'short' })}
                            className={`flex-1 h-14 flex items-center justify-center space-x-3 rounded-xl font-semibold transition-all duration-200 ${formData.direction === 'short'
                              ? 'bg-[#E74C3C] text-white shadow-lg'
                              : 'bg-[#0D0F18] border border-white/10 text-[#BDC3C7] hover:bg-white/5'
                              }`}
                          >
                            <TrendingDown className="w-5 h-5" />
                            <span>SHORT</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Price Details */}
                  <div className="bg-[#0D0F18] rounded-xl p-4 border border-white/10">
                    <div className="flex items-center space-x-3 mb-8">
                      <div className="p-2 bg-[#6A3DF4]/20 rounded-xl">
                        <DollarSign className="w-5 h-5 text-[#6A3DF4]" />
                      </div>
                      <h4 className="text-lg font-bold text-[#6A3DF4] uppercase tracking-wider">
                        Price Details
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-[#BDC3C7] text-sm font-semibold mb-3">
                          Positionsgröße *
                        </label>
                        <ModernInput
                          type="number"
                          step="any"
                          placeholder="123"
                          value={formData.quantity}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFormData({ ...formData, quantity: e.target.value })
                          }
                          error={errors.quantity}
                          icon={Target}
                        />
                      </div>

                      <div>
                        <label className="block text-[#BDC3C7] text-sm font-semibold mb-3">
                          Entry Price *
                        </label>
                        <ModernInput
                          type="number"
                          step="any"
                          placeholder="0.00000"
                          value={formData.entry_price}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFormData({ ...formData, entry_price: e.target.value })
                          }
                          error={errors.entry_price}
                          icon={DollarSign}
                        />
                      </div>

                      <div>
                        <label className="block text-[#BDC3C7] text-sm font-semibold mb-3">
                          Exit Price
                        </label>
                        <ModernInput
                          type="number"
                          step="any"
                          placeholder="155.00"
                          value={formData.exit_price}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFormData({ ...formData, exit_price: e.target.value })
                          }
                          error={errors.exit_price}
                          icon={DollarSign}
                        />
                      </div>

                      <div>
                        <label className="block text-[#BDC3C7] text-sm font-semibold mb-3">
                          Entry Date *
                        </label>
                        <ModernDateInput
                          value={formData.entry_date}
                          onChange={(value: string) => setFormData({ ...formData, entry_date: value })}
                          error={errors.entry_date}
                          placeholder="Select entry date"
                        />
                      </div>

                      <div>
                        <label className="block text-[#BDC3C7] text-sm font-semibold mb-3">
                          Exit Date
                        </label>
                        <ModernDateInput
                          value={formData.exit_date}
                          onChange={(value: string) => setFormData({ ...formData, exit_date: value })}
                          placeholder="Select exit date"
                        />
                      </div>

                      <div>
                        <label className="block text-[#BDC3C7] text-sm font-semibold mb-3">
                          Industry/Sector Fee
                        </label>
                        <ModernInput
                          type="number"
                          step="any"
                          placeholder="0.00"
                          value={formData.commission}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFormData({ ...formData, commission: e.target.value })
                          }
                          error={errors.commission}
                          icon={CreditCard}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Additional Details */}
                  <div className="bg-[#0D0F18] rounded-xl p-4 border border-white/10">
                    <div className="flex items-center space-x-3 mb-8">
                      <div className="p-2 bg-[#6A3DF4]/20 rounded-xl">
                        <Settings className="w-5 h-5 text-[#6A3DF4]" />
                      </div>
                      <h4 className="text-lg font-bold text-[#6A3DF4] uppercase tracking-wider">
                        Additional Details
                      </h4>
                    </div>

                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-[#BDC3C7] text-sm font-semibold mb-3">
                            Tags
                          </label>
                          <ModernInput
                            type="text"
                            placeholder="earnings, breakout, momentum..."
                            value={formData.tags}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setFormData({ ...formData, tags: e.target.value })
                            }
                          />
                        </div>

                        <div>
                          <label className="block text-[#BDC3C7] text-sm font-semibold mb-3">
                            Strategy
                          </label>
                          <Modern3DDropdown
                            value={formData.strategy_id}
                            onChange={(value: string) => setFormData({ ...formData, strategy_id: value })}
                            options={[
                              { value: '', label: 'No Strategy', icon: '⚡' },
                              ...strategies.map(strategy => ({
                                value: strategy.id.toString(),
                                label: strategy.name,
                                icon: '🎯'
                              }))
                            ]}
                            placeholder="Select Strategy"
                            icon={Zap}
                            isOpen={strategyOpen}
                            setIsOpen={setStrategyOpen}
                            renderOption={(option: any) => (
                              <div className="flex items-center space-x-3">
                                <span className="text-lg">{option.icon}</span>
                                <span className="font-semibold text-white">{option.label}</span>
                              </div>
                            )}
                          />
                        </div>

                        <div>
                          <label className="block text-[#BDC3C7] text-sm font-semibold mb-3">
                            Setup / Playbook
                          </label>
                          <ModernInput
                            type="text"
                            placeholder="Breakout, Pullback, Range, News..."
                            value={formData.setup}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setFormData({ ...formData, setup: e.target.value })
                            }
                          />
                        </div>

                        <div>
                          <label className="block text-[#BDC3C7] text-sm font-semibold mb-3">
                            Lessons / Mistakes
                          </label>
                          <ModernInput
                            type="text"
                            placeholder="Too late entry, sized too big..."
                            value={formData.mistakes}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setFormData({ ...formData, mistakes: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[#BDC3C7] text-sm font-semibold mb-3">
                          Screenshot / Chart URL
                        </label>
                        <ModernInput
                          type="text"
                          placeholder="https://..."
                          value={formData.screenshot_url}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFormData({ ...formData, screenshot_url: e.target.value })
                          }
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-[#BDC3C7] text-sm font-semibold mb-3">
                            Emotion
                          </label>
                          <ModernInput
                            type="text"
                            placeholder="Calm, anxious, overconfident..."
                            value={formData.emotion}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setFormData({ ...formData, emotion: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-[#BDC3C7] text-sm font-semibold mb-3">
                            Rating (1-10)
                          </label>
                          <ModernInput
                            type="number"
                            min="1"
                            max="10"
                            placeholder="7"
                            value={formData.rating}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setFormData({ ...formData, rating: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[#BDC3C7] text-sm font-semibold mb-3">
                          Notes
                        </label>
                        <textarea
                          placeholder="Trade analysis and thoughts..."
                          rows={5}
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          className="w-full p-5 bg-[#0D0F18] 
                                     border border-white/20 hover:border-[#6A3DF4]/50 rounded-xl text-white font-medium 
                                     placeholder-[#BDC3C7] focus:outline-none focus:border-[#6A3DF4] 
                                     focus:ring-2 focus:ring-[#6A3DF4]/20 transition-colors duration-200 resize-none
                                     backdrop-blur-xl"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex space-x-6 pt-8">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="flex-1 h-16 bg-white/10 hover:bg-white/20 
                                 text-white rounded-xl font-semibold transition-colors duration-200 backdrop-blur-xl
                                 border border-white/10 hover:border-white/20"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={creating || updating}
                      className="flex-1 h-16 bg-gradient-to-r from-[#6A3DF4] to-[#8A5CFF] 
                                 hover:from-[#7B47FF] hover:to-[#9B6AFF]
                                 disabled:from-[#6A3DF4]/50 disabled:to-[#8A5CFF]/50 text-white rounded-xl 
                                 font-bold transition-colors duration-200 flex items-center justify-center space-x-3 
                                 backdrop-blur-xl"
                    >
                      {(creating || updating) ? (
                        <>
                          <div className="animate-spin">
                            <Loader2 className="w-5 h-5" />
                          </div>
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-5 h-5" />
                          <span>{showEditForm ? 'Update Trade' : 'Create Trade'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* Trades Display */}
        <div>
          {viewMode === 'card' ? (
            /* Clean Card View */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-[#0D0F18] rounded-xl p-4 border border-white/10">
                    <div className="animate-pulse">
                      <div className="flex items-center space-x-4 mb-6">
                        <div className="w-12 h-12 bg-white/10 rounded-xl" />
                        <div className="flex-1">
                          <div className="h-5 bg-white/10 rounded w-20 mb-2" />
                          <div className="h-3 bg-white/10 rounded w-32" />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="h-4 bg-white/10 rounded w-full" />
                        <div className="h-4 bg-white/10 rounded w-3/4" />
                        <div className="h-6 bg-white/10 rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                ))
              ) : trades.length === 0 ? (
                <div className="col-span-full text-center py-20">
                  <div className="bg-[#0D0F18] rounded-xl p-4 border border-white/10">
                    <div className="w-20 h-20 bg-gradient-to-r from-[#6A3DF4] to-[#8A5CFF] rounded-full flex items-center justify-center mx-auto mb-6">
                      <BarChart3 className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-4">No trades found</h3>
                    <p className="text-[#BDC3C7] mb-8 max-w-md mx-auto">
                      {searchTerm || symbolFilter || directionFilter || assetTypeFilter ?
                        'Try adjusting your filters to see more trades.' :
                        'Start by adding your first trade to track your performance.'
                      }
                    </p>
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="h-12 bg-gradient-to-r from-[#6A3DF4] to-[#8A5CFF] text-white px-8 rounded-lg font-semibold transition-all shadow-lg"
                    >
                      Add Your First Trade
                    </button>
                  </div>
                </div>
              ) : (
                trades.map((trade) => {
                  const livePnL = getLivePnL(trade.id);
                  const returnPct = trade.exit_price && trade.entry_price ?
                    (((trade.exit_price - trade.entry_price) / trade.entry_price) * 100 * (trade.direction === 'long' ? 1 : -1) * (trade.leverage || 1)).toFixed(2) : null;
                  const isProfitable = trade.is_closed ? (trade.pnl || 0) > 0 : livePnL ? livePnL.unrealizedPnL > 0 : false;

                  return (
                    <div
                      key={trade.id}
                      className="group relative bg-[#0D0F18] rounded-xl p-4 border border-white/10 hover:bg-white/5 transition-all cursor-pointer overflow-hidden"
                    >
                      {/* Edit/Delete Icons - Only show for non-wallet trades */}
                      {trade.source !== 'wallet' && (
                        <div className="absolute top-4 right-4 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(trade);
                            }}
                            className="w-8 h-8 flex items-center justify-center text-[#6A3DF4] hover:text-[#8A5CFF] rounded-lg hover:bg-[#6A3DF4]/10 transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(trade.id);
                            }}
                            className="w-8 h-8 flex items-center justify-center text-[#E74C3C] hover:text-red-300 rounded-lg hover:bg-[#E74C3C]/10 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {/* Trade Header */}
                      <div className="flex items-center space-x-4 mb-6">
                        <div className={`p-3 rounded-xl bg-gradient-to-r ${getAssetGradient(trade.asset_type || 'stocks')} shadow-lg`}>
                          <span className="text-white font-bold text-lg">
                            {getAssetIcon(trade.asset_type || 'stocks')}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-xl font-bold text-white">{trade.symbol}</h3>
                            {trade.source === 'wallet' && (
                              <span className="px-2 py-0.5 bg-[#6A3DF4]/20 text-[#6A3DF4] border border-[#6A3DF4]/30 rounded text-xs font-medium flex items-center space-x-1">
                                <Wallet className="w-3 h-3" />
                                <span>Wallet</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <p className="text-[#BDC3C7] text-sm">{formatDate(trade.entry_date)}</p>
                            {trade.strategy_name && (
                              <>
                                <span className="text-white/20">•</span>
                                <p className="text-[#6A3DF4] text-sm font-medium">{trade.strategy_name}</p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Trade Details */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[#BDC3C7] text-sm">Direction</span>
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${trade.direction === 'long'
                            ? 'bg-[#2ECC71]/20 text-[#2ECC71] border border-[#2ECC71]/30'
                            : 'bg-[#E74C3C]/20 text-[#E74C3C] border border-[#E74C3C]/30'
                            }`}>
                            {trade.direction === 'long' ? '↗ LONG' : '↘ SHORT'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-[#BDC3C7] text-xs">Positionsgröße</span>
                            <p className="text-white font-medium">{trade.quantity.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-[#BDC3C7] text-xs">Entry Price</span>
                            <p className="text-white font-medium">{formatPrice(trade.entry_price)}</p>
                          </div>
                        </div>

                        {trade.exit_price && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-[#BDC3C7] text-xs">Exit Price</span>
                              <p className="text-white font-medium">{formatPrice(trade.exit_price)}</p>
                            </div>
                            {returnPct && (
                              <div>
                                <span className="text-[#BDC3C7] text-xs">Return</span>
                                <p className={`font-medium ${isProfitable ? 'text-[#2ECC71]' : 'text-[#E74C3C]'}`}>
                                  {isProfitable ? '+' : ''}{returnPct}%
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* P&L or Status */}
                        <div className="pt-4 border-t border-white/5">
                          {!trade.is_closed ? (
                            <div className="space-y-3">
                              <div className="flex items-center justify-center">
                                <div className="flex items-center space-x-2 bg-yellow-500/10 px-4 py-2 rounded-xl border border-yellow-500/30">
                                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                                  <span className="text-yellow-400 font-medium text-sm">Position Open</span>
                                </div>
                              </div>
                              {livePnL && (
                                <div className="text-center">
                                  <p className="text-[#BDC3C7] text-xs mb-1">Unrealized P&L</p>
                                  <div className="space-y-1">
                                    <p className={`text-xl font-bold ${livePnL.unrealizedPnL >= 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]'
                                      }`}>
                                      {livePnL.unrealizedPnL >= 0 ? '+' : ''}{formatCurrency(livePnL.unrealizedPnL)}
                                    </p>
                                    <p className={`text-sm ${livePnL.unrealizedPnLPercent >= 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]'
                                      }`}>
                                      {livePnL.unrealizedPnLPercent >= 0 ? '+' : ''}{livePnL.unrealizedPnLPercent.toFixed(2)}%
                                    </p>
                                    <div className="flex items-center justify-center space-x-2 text-xs text-[#BDC3C7]">
                                      <span>Current Price:</span>
                                      <span className="text-white font-medium">{formatPrice(livePnL.currentPrice)}</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                              {livePnLLoading && !livePnL && (
                                <div className="flex items-center justify-center">
                                  <div className="w-4 h-4 border-2 border-[#6A3DF4] border-t-transparent rounded-full animate-spin" />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center">
                              <p className="text-[#BDC3C7] text-xs mb-1">Profit & Loss</p>
                              <p className={`text-2xl font-bold ${isProfitable ? 'text-[#2ECC71]' : 'text-[#E74C3C]'
                                }`}>
                                {isProfitable ? '+' : ''}{formatCurrency(trade.pnl || 0)}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Context */}
                        {(trade as ExtendedTrade).setup || (trade as ExtendedTrade).mistakes || (trade as ExtendedTrade).screenshot_url ? (
                          <div className="pt-3 space-y-2">
                            {(trade as ExtendedTrade).setup && (
                              <div className="text-xs text-[#AAB0C0]">
                                <span className="text-white font-semibold mr-1">Setup:</span>
                                {(trade as ExtendedTrade).setup}
                              </div>
                            )}
                            {(trade as ExtendedTrade).mistakes && (
                              <div className="text-xs text-[#AAB0C0]">
                                <span className="text-white font-semibold mr-1">Lessons:</span>
                                {(trade as ExtendedTrade).mistakes}
                              </div>
                            )}
                            {(trade as ExtendedTrade).screenshot_url && (
                              <a
                                href={(trade as ExtendedTrade).screenshot_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-[#6A3DF4] hover:text-[#8A5CFF] underline"
                              >
                                View screenshot
                              </a>
                            )}
                          </div>
                        ) : null}

                        {/* Tags */}
                        {trade.tags && (
                          <div className="pt-3">
                            <div className="flex flex-wrap gap-1">
                              {trade.tags.split(',').slice(0, 3).map((tag, tagIndex) => (
                                <span
                                  key={tagIndex}
                                  className="px-2 py-1 bg-[#6A3DF4]/10 text-[#6A3DF4] text-xs rounded-full border border-[#6A3DF4]/20"
                                >
                                  {tag.trim()}
                                </span>
                              ))}
                              {trade.tags.split(',').length > 3 && (
                                <span className="px-2 py-1 bg-white/10 text-[#BDC3C7] text-xs rounded-full border border-white/20">
                                  +{trade.tags.split(',').length - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* Clean Table View */
            <div className="bg-[#0D0F18] rounded-xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#0D0F18]/50">
                    <tr>
                      {['Date', 'Symbol', 'Asset', 'Direction', 'Positionsgröße', 'Entry', 'Exit', 'P&L', 'Strategy', 'Tags', 'Notes', 'Actions'].map((header) => (
                        <th key={header} className="px-6 py-4 text-left text-xs font-semibold text-[#BDC3C7] uppercase tracking-wider border-b border-white/5">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {loading ? (
                      <tr>
                        <td colSpan={12} className="px-6 py-12 text-center">
                          <div className="flex items-center justify-center space-x-3">
                            <Loader2 className="w-6 h-6 text-[#6A3DF4] animate-spin" />
                            <span className="text-[#BDC3C7]">Loading trades...</span>
                          </div>
                        </td>
                      </tr>
                    ) : trades.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="px-6 py-12 text-center text-[#BDC3C7]">
                          {searchTerm || symbolFilter || directionFilter || assetTypeFilter ?
                            'No trades match your filters.' :
                            'No trades yet. Add your first trade to get started!'
                          }
                        </td>
                      </tr>
                    ) : (
                      trades.map((trade) => (
                        <tr
                          key={trade.id}
                          className="hover:bg-white/5 group transition-all"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[#BDC3C7]">
                            {formatDate(trade.entry_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-white">
                            {trade.symbol}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[#BDC3C7]">
                            <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${getAssetGradient(trade.asset_type || 'stocks')} text-white`}>
                              <span>{getAssetIcon(trade.asset_type || 'stocks')}</span>
                              <span>{(trade.asset_type || 'stocks').toUpperCase()}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[#BDC3C7]">
                            <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${trade.direction === 'long' ? 'bg-[#2ECC71]/20 text-[#2ECC71] border border-[#2ECC71]/30' : 'bg-[#E74C3C]/20 text-[#E74C3C] border border-[#E74C3C]/30'
                              }`}>
                              <span>{trade.direction === 'long' ? '↗' : '↘'}</span>
                              <span>{trade.direction.toUpperCase()}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[#BDC3C7] font-medium">
                            {trade.quantity.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[#BDC3C7] font-medium">{formatPrice(trade.entry_price)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[#BDC3C7] font-medium">
                            {trade.exit_price ? formatPrice(trade.exit_price) : (
                              <div className="flex items-center space-x-1 text-yellow-400">
                                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                                <span className="text-xs font-medium">OPEN</span>
                              </div>
                            )}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${(trade.pnl || 0) > 0 ? 'text-[#2ECC71]' : (trade.pnl || 0) < 0 ? 'text-[#E74C3C]' : 'text-[#BDC3C7]'
                            }`}>
                            {trade.pnl !== null && typeof trade.pnl !== 'undefined' ? (
                              <>
                                {trade.pnl > 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                              </>
                            ) : (
                              <span className="text-[#BDC3C7]">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[#BDC3C7]">
                            {trade.strategy_name ? (
                              <span className="px-2 py-1 bg-[#6A3DF4]/20 text-[#6A3DF4] text-xs rounded-full border border-[#6A3DF4]/30">
                                {trade.strategy_name}
                              </span>
                            ) : (
                              <span className="text-white/30">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-[#BDC3C7]">
                            {trade.tags ? (
                              <div className="flex flex-wrap gap-1">
                                {trade.tags.split(',').slice(0, 3).map(tag => (
                                  <span key={tag} className="px-2 py-1 bg-[#6A3DF4]/10 text-[#6A3DF4] text-xs rounded-full border border-[#6A3DF4]/20">
                                    {tag.trim()}
                                  </span>
                                ))}
                              </div>
                            ) : <span className="text-white/30">-</span>}
                          </td>
                          <td className="px-6 py-4 text-sm text-[#BDC3C7] max-w-xs">
                            {(trade as ExtendedTrade).setup || trade.notes ? (
                              <div className="space-y-1">
                                {(trade as ExtendedTrade).setup && <div className="text-xs text-white">{(trade as ExtendedTrade).setup}</div>}
                                {trade.notes && <div className="text-xs text-[#AAB0C0] line-clamp-2">{trade.notes}</div>}
                              </div>
                            ) : <span className="text-white/30">-</span>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[#BDC3C7]">
                            <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleEdit(trade)}
                                className="w-8 h-8 flex items-center justify-center text-[#6A3DF4] hover:text-[#8A5CFF] rounded-lg hover:bg-[#6A3DF4]/10 transition-all"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(trade.id)}
                                className="w-8 h-8 flex items-center justify-center text-[#E74C3C] hover:text-red-300 rounded-lg hover:bg-[#E74C3C]/10 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Equity Modal */}
        <AnimatePresence>
          {showEquityModal && (
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowEquityModal(false)}
            >
              <div
                className="bg-[#0D0F18] rounded-xl p-8 border border-white/10 shadow-2xl w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-gradient-to-r from-[#6A3DF4] to-[#8A5CFF] rounded-xl">
                      <PiggyBank className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Set Starting Capital</h3>
                  </div>
                  <button
                    onClick={() => setShowEquityModal(false)}
                    className="text-[#BDC3C7] hover:text-white p-2 rounded-lg hover:bg-white/10 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-[#BDC3C7] text-sm font-medium mb-2">
                      Current Starting Capital: ${equity.startingCapital.toLocaleString()}
                    </label>
                    <input
                      type="number"
                      placeholder="10000"
                      value={equityInput}
                      onChange={(e) => setEquityInput(e.target.value)}
                      className="w-full h-12 px-4 bg-[#1E2232] border border-white/10 rounded-lg text-white placeholder-[#BDC3C7] focus:outline-none focus:border-[#6A3DF4] focus:ring-2 focus:ring-[#6A3DF4]/20 transition-all"
                    />
                    <p className="text-[#BDC3C7] text-sm mt-2">
                      Enter your starting capital to improve performance calculations.
                    </p>
                  </div>

                  <div className="flex space-x-4">
                    <button
                      onClick={() => setShowEquityModal(false)}
                      className="flex-1 h-12 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={handleEquityUpdate}
                      className="flex-1 h-12 bg-gradient-to-r from-[#6A3DF4] to-[#8A5CFF] hover:from-[#7B47FF] hover:to-[#9B6AFF] text-white rounded-lg font-medium transition-all flex items-center justify-center space-x-2 shadow-lg"
                    >
                      <PiggyBank className="w-4 h-4" />
                      <span>Save</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout >
  );
}

