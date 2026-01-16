import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { TournamentStats } from '@/react-app/hooks/useCompetitionGame';
import { PracticeSettings } from '@/react-app/hooks/useCompetitionGame';

interface TradingPanelProps {
    tournamentStats: TournamentStats;
    practiceSettings: PracticeSettings;
    exchangeOutage: boolean;
    quantity: number;
    leverage: number;
    isLimitOrder: boolean;
    limitPrice: string;
    isTpSlEnabled: boolean;
    takeProfit: string;
    stopLoss: string;
    gameStarted: boolean;
    gameOver: boolean;
    onQuantityChange: (value: number) => void;
    onLeverageChange: (value: number) => void;
    onLimitOrderChange: (checked: boolean) => void;
    onLimitPriceChange: (value: string) => void;
    onTpSlChange: (checked: boolean) => void;
    onTakeProfitChange: (value: string) => void;
    onStopLossChange: (value: string) => void;
    onExecuteTrade: (type: 'Long' | 'Short') => void;
}

export function TradingPanel({
    tournamentStats,
    practiceSettings,
    exchangeOutage,
    quantity,
    leverage,
    isLimitOrder,
    limitPrice,
    isTpSlEnabled,
    takeProfit,
    stopLoss,
    gameStarted,
    gameOver,
    onQuantityChange,
    onLeverageChange,
    onLimitOrderChange,
    onLimitPriceChange,
    onTpSlChange,
    onTakeProfitChange,
    onStopLossChange,
    onExecuteTrade,
}: TradingPanelProps) {
    const leveragePercentage = ((leverage - 1) / 99) * 100;

    return (
        <div className="w-80 bg-[#141416] rounded-2xl border border-white/10 flex flex-col shrink-0 shadow-xl shadow-black/20">
            {/* Account Info */}
            <div className="p-5 border-b border-white/5 space-y-4">
                <div>
                    <div className="text-gray-400 text-xs mb-1.5 font-medium">Total Balance</div>
                    <div className="text-3xl font-bold text-white tracking-tight">
                        ${tournamentStats.totalBalance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs">
                        <span className={`px-2 py-0.5 rounded-md ${tournamentStats.realized >= 0 ? 'text-[#0ecb81] bg-[#0ecb81]/10' : 'text-[#f6465d] bg-[#f6465d]/10'}`}>
                            Realized {tournamentStats.realized >= 0 ? '+' : ''}${tournamentStats.realized.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md ${tournamentStats.unrealized >= 0 ? 'text-[#0ecb81] bg-[#0ecb81]/10' : 'text-[#f6465d] bg-[#f6465d]/10'}`}>
                            Unrealized {tournamentStats.unrealized >= 0 ? '+' : ''}${tournamentStats.unrealized.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                        </span>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 rounded-xl p-3">
                        <div className="text-gray-400 text-[10px] mb-1 uppercase tracking-wider">Margin Used</div>
                        <div className="text-white font-bold text-lg">0.00%</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3">
                        <div className="text-gray-400 text-[10px] mb-1 uppercase tracking-wider">Max Drawdown</div>
                        <div className="text-[#f6465d] font-bold text-lg">
                            ${tournamentStats.maxDrawdown.toLocaleString(undefined, { minimumFractionDigits: 0 })} {practiceSettings.maxDrawdownPercent ? <span className="text-xs font-normal opacity-70">({practiceSettings.maxDrawdownPercent}%)</span> : ''}
                        </div>
                    </div>
                </div>
            </div>

            {/* Warning Messages */}
            <AnimatePresence>
                {exchangeOutage && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-red-500/10 border-y border-red-500/30 px-4 py-3"
                    >
                        <div className="flex items-center gap-2 text-red-400 text-xs">
                            <AlertTriangle size={16} />
                            <span className="font-bold">Trading Disabled!</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Order Entry */}
            <div className="p-5 space-y-5 flex-1 overflow-y-auto custom-scrollbar">
                {/* Quantity Input */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs text-gray-400">
                        <span className="font-medium">Quantity</span>
                        <Button variant="ghost" size="sm" className="text-[#6A3DF4] hover:text-[#8B5CF6] hover:bg-[#6A3DF4]/10 h-auto px-2 py-1 text-xs rounded-lg transition-all duration-200">Switch to USD</Button>
                    </div>
                    <div className="relative group">
                        <input
                            type="number"
                            value={quantity}
                            onChange={(e) => onQuantityChange(parseFloat(e.target.value))}
                            className="w-full bg-[#1e2329] border border-white/10 rounded-xl py-3.5 px-4 pr-16 text-white focus:outline-none focus:border-[#6A3DF4] focus:ring-2 focus:ring-[#6A3DF4]/20 font-mono text-lg transition-all duration-200 hover:border-white/20"
                            disabled={!gameStarted || gameOver}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">{practiceSettings.symbol.replace('USDT', '')}</span>
                    </div>
                    <div className="relative h-2 w-full rounded-full bg-[#2A2E39] overflow-hidden">
                        <div
                            className="absolute h-full rounded-full bg-gradient-to-r from-[#6A3DF4] to-[#8B5CF6] transition-all duration-150"
                            style={{ width: `${(quantity / 10) * 100}%` }}
                        />
                        <input
                            type="range"
                            min="0"
                            max="10"
                            step="0.1"
                            value={quantity}
                            onChange={(e) => onQuantityChange(parseFloat(e.target.value))}
                            className="absolute w-full h-full opacity-0 cursor-pointer z-10"
                            disabled={!gameStarted || gameOver}
                        />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500 px-0.5">
                        <span>1%</span>
                        <span>25%</span>
                        <span>50%</span>
                        <span>75%</span>
                        <span>100%</span>
                    </div>
                </div>

                {/* Leverage Slider */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400 font-medium">Leverage</span>
                        <span className="text-[#6A3DF4] font-bold text-base bg-[#6A3DF4]/10 px-2.5 py-1 rounded-lg">{leverage}x</span>
                    </div>
                    <div className="relative h-2 w-full rounded-full bg-[#2A2E39]">
                        <div
                            className="absolute h-full rounded-full bg-gradient-to-r from-[#6A3DF4] to-[#8B5CF6] transition-all duration-150"
                            style={{ width: `${leveragePercentage}%` }}
                        />
                        <input
                            type="range"
                            min="1"
                            max="100"
                            value={leverage}
                            onChange={(e) => onLeverageChange(parseInt(e.target.value))}
                            className="absolute w-full h-full opacity-0 cursor-pointer z-10"
                            disabled={!gameStarted || gameOver}
                        />
                        <div
                            className="absolute h-5 w-5 rounded-full bg-white border-2 border-[#6A3DF4] top-1/2 -translate-y-1/2 -ml-2.5 pointer-events-none shadow-lg shadow-[#6A3DF4]/30 transition-all duration-150"
                            style={{ left: `${leveragePercentage}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500 px-0.5">
                        <span>1x</span>
                        <span>25x</span>
                        <span>50x</span>
                        <span>75x</span>
                        <span>100x</span>
                    </div>
                </div>

                {/* Order Types */}
                <div className="space-y-3 bg-white/5 rounded-xl p-4">
                    <label className="flex items-center gap-3 cursor-pointer group select-none p-2 rounded-lg hover:bg-white/5 transition-colors">
                        <div className="relative flex items-center">
                            <input
                                type="checkbox"
                                checked={isLimitOrder}
                                onChange={(e) => onLimitOrderChange(e.target.checked)}
                                className="peer appearance-none w-4 h-4 rounded-md border-2 border-white/20 bg-[#141416] checked:bg-[#6A3DF4] checked:border-[#6A3DF4] transition-all duration-200 hover:border-[#6A3DF4]/50"
                            />
                            <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                        <span className="text-gray-400 group-hover:text-white transition-colors text-sm font-medium">Limit Order</span>
                    </label>
                    <AnimatePresence>
                        {isLimitOrder && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="pl-7 pb-2">
                                    <input
                                        type="number"
                                        placeholder="Limit Price"
                                        value={limitPrice}
                                        onChange={(e) => onLimitPriceChange(e.target.value)}
                                        className="w-full bg-[#1e2329] border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-[#6A3DF4] focus:ring-2 focus:ring-[#6A3DF4]/20 font-mono transition-all duration-200 hover:border-white/20"
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <label className="flex items-center gap-3 cursor-pointer group select-none p-2 rounded-lg hover:bg-white/5 transition-colors">
                        <div className="relative flex items-center">
                            <input
                                type="checkbox"
                                checked={isTpSlEnabled}
                                onChange={(e) => onTpSlChange(e.target.checked)}
                                className="peer appearance-none w-4 h-4 rounded-md border-2 border-white/20 bg-[#141416] checked:bg-[#6A3DF4] checked:border-[#6A3DF4] transition-all duration-200 hover:border-[#6A3DF4]/50"
                            />
                            <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                        <span className="text-gray-400 group-hover:text-white transition-colors text-sm font-medium">Take Profit / Stop Loss</span>
                    </label>

                    <AnimatePresence>
                        {isTpSlEnabled && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="grid grid-cols-2 gap-3 pl-7 pb-2">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] text-[#0ecb81] font-medium uppercase tracking-wider">Take Profit</label>
                                        <input
                                            type="number"
                                            placeholder="Price"
                                            value={takeProfit}
                                            onChange={(e) => onTakeProfitChange(e.target.value)}
                                            className="w-full bg-[#1e2329] border border-[#0ecb81]/20 rounded-xl py-2.5 px-3 text-sm text-white focus:outline-none focus:border-[#0ecb81] focus:ring-2 focus:ring-[#0ecb81]/20 font-mono transition-all duration-200"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] text-[#f6465d] font-medium uppercase tracking-wider">Stop Loss</label>
                                        <input
                                            type="number"
                                            placeholder="Price"
                                            value={stopLoss}
                                            onChange={(e) => onStopLossChange(e.target.value)}
                                            className="w-full bg-[#1e2329] border border-[#f6465d]/20 rounded-xl py-2.5 px-3 text-sm text-white focus:outline-none focus:border-[#f6465d] focus:ring-2 focus:ring-[#f6465d]/20 font-mono transition-all duration-200"
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Buttons */}
                <div className="grid grid-cols-2 gap-4 pt-3">
                    <motion.div whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.02 }}>
                        <Button
                            variant="default"
                            onClick={() => onExecuteTrade('Long')}
                            className="w-full h-14 bg-gradient-to-r from-[#0ecb81] to-[#00d9c8] hover:from-[#25e09b] hover:to-[#00f5e1] text-white font-bold text-base rounded-xl shadow-lg shadow-[#0ecb81]/30 hover:shadow-[#0ecb81]/50 transition-all duration-300 border-0"
                            disabled={!gameStarted || gameOver || exchangeOutage}
                        >
                            Open Long
                        </Button>
                    </motion.div>
                    <motion.div whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.02 }}>
                        <Button
                            variant="default"
                            onClick={() => onExecuteTrade('Short')}
                            className="w-full h-14 bg-gradient-to-r from-[#f6465d] to-[#ff6b6b] hover:from-[#ff5a6e] hover:to-[#ff8585] text-white font-bold text-base rounded-xl shadow-lg shadow-[#f6465d]/30 hover:shadow-[#f6465d]/50 transition-all duration-300 border-0"
                            disabled={!gameStarted || gameOver || exchangeOutage}
                        >
                            Open Short
                        </Button>
                    </motion.div>
                </div>
                
                {/* Add Strategy Link */}
                <div className="pt-3">
                    <Button variant="ghost" size="sm" className="text-[#6A3DF4] hover:text-[#8B5CF6] hover:bg-[#6A3DF4]/10 h-auto px-3 py-2 text-xs rounded-lg transition-all duration-200 flex items-center gap-1.5">
                        <Plus className="w-4 h-4" />
                        Add Strategy
                    </Button>
                </div>
            </div>
        </div>
    );
}


