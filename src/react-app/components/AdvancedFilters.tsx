import { motion, AnimatePresence } from "framer-motion";
import { X, Filter, RotateCcw, Check } from "lucide-react";
import { useState } from "react";

export interface AdvancedFilterOptions {
  dateRange: {
    start: string;
    end: string;
  };
  pnlRange: {
    min: number | null;
    max: number | null;
  };
  symbols: string[];
  directions: string[];
  assetTypes: string[];
  strategies: string[];
  onlyProfitable: boolean | null;
  minQuantity: number | null;
  maxQuantity: number | null;
  hasTags: boolean;
  hasNotes: boolean;
}

interface AdvancedFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  filters: AdvancedFilterOptions;
  onFiltersChange: (filters: AdvancedFilterOptions) => void;
  onApply: () => void;
  onReset: () => void;
  availableSymbols: string[];
  availableStrategies: any[];
}

export default function AdvancedFilters({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  onApply,
  onReset,
  availableSymbols
}: AdvancedFiltersProps) {
  const [localFilters, setLocalFilters] = useState<AdvancedFilterOptions>(filters);

  const updateFilters = (updates: Partial<AdvancedFilterOptions>) => {
    const newFilters = { ...localFilters, ...updates };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleApply = () => {
    onApply();
    onClose();
  };

  const handleReset = () => {
    onReset();
    setLocalFilters({
      dateRange: { start: '', end: '' },
      pnlRange: { min: null, max: null },
      symbols: [],
      directions: [],
      assetTypes: [],
      strategies: [],
      onlyProfitable: null,
      minQuantity: null,
      maxQuantity: null,
      hasTags: false,
      hasNotes: false,
    });
  };

  

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-gray-800/95 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl shadow-lg">
                  <Filter className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-3xl font-bold text-white">Advanced Filters</h3>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="text-gray-400 hover:text-white p-3 rounded-xl hover:bg-gray-700/50 transition-all"
              >
                <X className="w-6 h-6" />
              </motion.button>
            </div>

            <div className="space-y-8">
              {/* Date Range */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Date Range</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">Start Date</label>
                    <input
                      type="date"
                      value={localFilters.dateRange.start}
                      onChange={(e) => updateFilters({
                        dateRange: { ...localFilters.dateRange, start: e.target.value }
                      })}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:border-purple-500 transition-all [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">End Date</label>
                    <input
                      type="date"
                      value={localFilters.dateRange.end}
                      onChange={(e) => updateFilters({
                        dateRange: { ...localFilters.dateRange, end: e.target.value }
                      })}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:border-purple-500 transition-all [color-scheme:dark]"
                    />
                  </div>
                </div>
              </div>

              {/* P&L Range */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">P&L Range</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">Min P&L ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={localFilters.pnlRange.min || ''}
                      onChange={(e) => updateFilters({
                        pnlRange: { ...localFilters.pnlRange, min: e.target.value ? Number(e.target.value) : null }
                      })}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">Max P&L ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="1000.00"
                      value={localFilters.pnlRange.max || ''}
                      onChange={(e) => updateFilters({
                        pnlRange: { ...localFilters.pnlRange, max: e.target.value ? Number(e.target.value) : null }
                      })}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Multi-select Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Symbols */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4">Symbols</h4>
                  <div className="max-h-40 overflow-y-auto bg-gray-700/30 rounded-xl border border-gray-600/50 p-3">
                    {availableSymbols.map(symbol => (
                      <label key={symbol} className="flex items-center space-x-3 py-2 hover:bg-gray-600/30 rounded-lg px-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={localFilters.symbols.includes(symbol)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              updateFilters({ symbols: [...localFilters.symbols, symbol] });
                            } else {
                              updateFilters({ symbols: localFilters.symbols.filter(s => s !== symbol) });
                            }
                          }}
                          className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                        />
                        <span className="text-white">{symbol}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Asset Types */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4">Asset Types</h4>
                  <div className="space-y-2">
                    {[
                      { value: 'stocks', label: '📈 Stocks' },
                      { value: 'crypto', label: '₿ Crypto' },
                      { value: 'forex', label: '💱 Forex' }
                    ].map(assetType => (
                      <label key={assetType.value} className="flex items-center space-x-3 py-2 hover:bg-gray-600/30 rounded-lg px-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={localFilters.assetTypes.includes(assetType.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              updateFilters({ assetTypes: [...localFilters.assetTypes, assetType.value] });
                            } else {
                              updateFilters({ assetTypes: localFilters.assetTypes.filter(t => t !== assetType.value) });
                            }
                          }}
                          className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                        />
                        <span className="text-white">{assetType.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Direction and Profit Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4">Direction</h4>
                  <div className="space-y-2">
                    {[
                      { value: 'long', label: '🔼 Long' },
                      { value: 'short', label: '🔽 Short' }
                    ].map(direction => (
                      <label key={direction.value} className="flex items-center space-x-3 py-2 hover:bg-gray-600/30 rounded-lg px-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={localFilters.directions.includes(direction.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              updateFilters({ directions: [...localFilters.directions, direction.value] });
                            } else {
                              updateFilters({ directions: localFilters.directions.filter(d => d !== direction.value) });
                            }
                          }}
                          className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                        />
                        <span className="text-white">{direction.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-white mb-4">Profitability</h4>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-3 py-2 hover:bg-gray-600/30 rounded-lg px-2 cursor-pointer">
                      <input
                        type="radio"
                        name="profitability"
                        checked={localFilters.onlyProfitable === true}
                        onChange={() => updateFilters({ onlyProfitable: true })}
                        className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 focus:ring-green-500"
                      />
                      <span className="text-green-400">✅ Profitable Only</span>
                    </label>
                    <label className="flex items-center space-x-3 py-2 hover:bg-gray-600/30 rounded-lg px-2 cursor-pointer">
                      <input
                        type="radio"
                        name="profitability"
                        checked={localFilters.onlyProfitable === false}
                        onChange={() => updateFilters({ onlyProfitable: false })}
                        className="w-4 h-4 text-red-600 bg-gray-700 border-gray-600 focus:ring-red-500"
                      />
                      <span className="text-red-400">❌ Losing Only</span>
                    </label>
                    <label className="flex items-center space-x-3 py-2 hover:bg-gray-600/30 rounded-lg px-2 cursor-pointer">
                      <input
                        type="radio"
                        name="profitability"
                        checked={localFilters.onlyProfitable === null}
                        onChange={() => updateFilters({ onlyProfitable: null })}
                        className="w-4 h-4 text-gray-600 bg-gray-700 border-gray-600 focus:ring-gray-500"
                      />
                      <span className="text-gray-400">All Trades</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Additional Filters */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Additional Filters</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center space-x-3 py-3 hover:bg-gray-600/30 rounded-lg px-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localFilters.hasTags}
                      onChange={(e) => updateFilters({ hasTags: e.target.checked })}
                      className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-white">Has Tags</span>
                  </label>
                  <label className="flex items-center space-x-3 py-3 hover:bg-gray-600/30 rounded-lg px-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localFilters.hasNotes}
                      onChange={(e) => updateFilters({ hasNotes: e.target.checked })}
                      className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-white">Has Notes</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4 pt-8 border-t border-gray-700/50">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleReset}
                  className="flex items-center space-x-2 px-6 py-3 bg-gray-600/50 hover:bg-gray-600 text-white rounded-xl font-medium transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset</span>
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleApply}
                  className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg"
                >
                  <Check className="w-4 h-4" />
                  <span>Apply Filters</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
