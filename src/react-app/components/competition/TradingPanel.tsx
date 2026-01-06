import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Plus } from 'lucide-react';
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
        <div className="w-80 bg-[#1E2232] rounded-xl border border-white/5 flex flex-col shrink-0">
            {/* Account Info */}
            <div className="p-4 border-b border-white/5 space-y-3">
                <div>
                    <div className="text-gray-400 text-xs mb-1">Total Balance</div>
                    <div className="text-2xl font-bold text-white">
                        ${tournamentStats.totalBalance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs">
                        <span className={`${tournamentStats.realized >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            Realized {tournamentStats.realized >= 0 ? '+' : ''}${tournamentStats.realized.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                        </span>
                        <span className="text-gray-600">|</span>
                        <span className={`${tournamentStats.unrealized >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            Unrealized {tournamentStats.unrealized >= 0 ? '+' : ''}${tournamentStats.unrealized.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                        </span>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <div className="text-gray-400 text-xs mb-1">Margin Used</div>
                        <div className="text-white font-semibold">0.00%</div>
                    </div>
                    <div>
                        <div className="text-gray-400 text-xs mb-1">Max Drawdown</div>
                        <div className="text-red-400 font-semibold">
                            ${tournamentStats.maxDrawdown.toLocaleString(undefined, { minimumFractionDigits: 0 })} {practiceSettings.maxDrawdownPercent ? `${practiceSettings.maxDrawdownPercent}%` : ''}
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
            <div className="p-4 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                {/* Quantity Input */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
                        <span>Quantity</span>
                        <button className="text-[#6A3DF4] hover:text-[#8B5CF6] text-xs">Switch to USD</button>
                    </div>
                    <div className="relative">
                        <input
                            type="number"
                            value={quantity}
                            onChange={(e) => onQuantityChange(parseFloat(e.target.value))}
                            className="w-full bg-[#0D0F18] border border-white/10 rounded-lg py-3 px-4 pr-16 text-white focus:outline-none focus:border-[#6A3DF4] font-mono"
                            disabled={!gameStarted || gameOver}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">{practiceSettings.symbol.replace('USDT', '')}</span>
                    </div>
                    <div className="relative h-1.5 w-full rounded-full bg-[#2A2E39]">
                        <div
                            className="absolute h-full rounded-full bg-[#6A3DF4]"
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
                    <div className="flex justify-between text-[10px] text-gray-600">
                        <span>1%</span>
                        <span>100%</span>
                    </div>
                </div>

                {/* Leverage Slider */}
                <div className="space-y-3">
                    <div className="flex justify-between text-xs text-gray-400">
                        <span>Leverage</span>
                        <span className="text-white">{leverage}x</span>
                    </div>
                    <div className="relative h-1.5 w-full rounded-full bg-[#2A2E39]">
                        <div
                            className="absolute h-full rounded-full bg-[#6A3DF4]"
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
                            className="absolute h-4 w-4 rounded-full bg-white border-2 border-[#6A3DF4] top-1/2 -translate-y-1/2 -ml-2 pointer-events-none shadow-lg"
                            style={{ left: `${leveragePercentage}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-600">
                        <span>1x</span>
                        <span>50x</span>
                        <span>100x</span>
                    </div>
                </div>

                {/* Order Types */}
                <div className="space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer group select-none">
                        <div className="relative flex items-center">
                            <input
                                type="checkbox"
                                checked={isLimitOrder}
                                onChange={(e) => onLimitOrderChange(e.target.checked)}
                                className="peer appearance-none w-3 h-3 rounded border border-white/20 bg-[#0D0F18] checked:bg-[#6A3DF4] checked:border-[#6A3DF4] transition-colors"
                            />
                            <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                        <span className="text-gray-400 group-hover:text-white transition-colors text-xs">Limit Order</span>
                    </label>
                    {isLimitOrder && (
                        <div className="pl-5">
                            <input
                                type="number"
                                placeholder="Limit Price"
                                value={limitPrice}
                                onChange={(e) => onLimitPriceChange(e.target.value)}
                                className="w-full bg-[#0D0F18] border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-[#6A3DF4] font-mono"
                            />
                        </div>
                    )}
                    <label className="flex items-center gap-2 cursor-pointer group select-none">
                        <div className="relative flex items-center">
                            <input
                                type="checkbox"
                                checked={isTpSlEnabled}
                                onChange={(e) => onTpSlChange(e.target.checked)}
                                className="peer appearance-none w-3 h-3 rounded border border-white/20 bg-[#0D0F18] checked:bg-[#6A3DF4] checked:border-[#6A3DF4] transition-colors"
                            />
                            <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                        <span className="text-gray-400 group-hover:text-white transition-colors text-xs">Take Profit / Stop Loss</span>
                    </label>

                    <AnimatePresence>
                        {isTpSlEnabled && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs text-gray-400">Take Profit</label>
                                        <input
                                            type="number"
                                            placeholder="Price"
                                            value={takeProfit}
                                            onChange={(e) => onTakeProfitChange(e.target.value)}
                                            className="w-full bg-[#0D0F18] border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-[#2EBD85] font-mono"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-gray-400">Stop Loss</label>
                                        <input
                                            type="number"
                                            placeholder="Price"
                                            value={stopLoss}
                                            onChange={(e) => onStopLossChange(e.target.value)}
                                            className="w-full bg-[#0D0F18] border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-[#F6465D] font-mono"
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onExecuteTrade('Long')}
                        className="bg-[#2EBD85] hover:bg-[#25a573] text-white py-3 rounded-lg font-bold shadow-[0_4px_14px_rgba(46,189,133,0.3)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!gameStarted || gameOver || exchangeOutage}
                    >
                        Open Long
                    </motion.button>
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onExecuteTrade('Short')}
                        className="bg-[#F6465D] hover:bg-[#d93d52] text-white py-3 rounded-lg font-bold shadow-[0_4px_14px_rgba(246,70,93,0.3)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!gameStarted || gameOver || exchangeOutage}
                    >
                        Open Short
                    </motion.button>
                </div>
                
                {/* Add Strategy Link */}
                <div className="pt-2">
                    <button className="text-[#6A3DF4] hover:text-[#8B5CF6] text-xs flex items-center gap-1 transition-colors">
                        <Plus className="w-3 h-3" />
                        Add Strategy
                    </button>
                </div>
            </div>
        </div>
    );
}

