import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/react-app/contexts/AuthContext';
import { useSearchParams } from 'react-router';
import { CandlestickData } from 'lightweight-charts';
import { motion, AnimatePresence } from 'framer-motion';
import { buildApiUrl } from '@/react-app/hooks/useApi';
import { apiConfig } from '@/react-app/config/apiConfig';
import { PracticeSettingsModal } from '@/react-app/components/competition/PracticeSettingsModal';
import { PositionsTable } from '@/react-app/components/competition/PositionsTable';
import { OrdersTable } from '@/react-app/components/competition/OrdersTable';
import { HistoryTable } from '@/react-app/components/competition/HistoryTable';
import { TradingViewAdvancedChart } from '@/react-app/components/competition/TradingViewAdvancedChart';
import { FutureChart } from '@/react-app/components/competition/FutureChart';
import { TradingPanel } from '@/react-app/components/competition/TradingPanel';
import { IndicatorsPanel, Indicator } from '@/react-app/components/competition/IndicatorsPanel';
import { PracticeSettings } from '@/react-app/hooks/useCompetitionGame';
import { useMarketEvents } from '@/react-app/hooks/useMarketEvents';
import { Position } from '@/react-app/hooks/useCompetitionTrading';
import { CandleGenerator, createMarketEventImpact } from '@/react-app/utils/candleGenerator';
import {
    Trophy,
    Skull,
    BarChart3,
    TrendingUp,
    TrendingDown,
} from 'lucide-react';
import { useLanguageCurrency } from '@/react-app/contexts/LanguageCurrencyContext';

interface Player {
    username: string;
    elo: number;
    rank: number;
    pnl: number;
    isYou?: boolean;
}

type GameMode = 'speed' | 'survival' | 'tournament';

export default function CompetitionPage() {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
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
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(converted);
    };

    const matchType = searchParams.get('type') || 'practice';

    // Data State
    const [allCandles, setAllCandles] = useState<(CandlestickData & { volume?: number })[]>([]);
    const [currentPrice, setCurrentPrice] = useState<number>(0);
    const [replayIndex, setReplayIndex] = useState<number>(0);
    const [_currentCandle, setCurrentCandle] = useState<CandlestickData | null>(null);
    const [futureCandles, setFutureCandles] = useState<CandlestickData[]>([]);
    const [isInFuture, setIsInFuture] = useState(false);
    const candleGeneratorRef = useRef<CandleGenerator | null>(null);

    // Practice Settings State
    const [showPracticeSettings, setShowPracticeSettings] = useState(false);
    const [practiceSettings] = useState<PracticeSettings>({
        symbol: 'BTCUSDT',
        timeLimit: 3, // minutes
        initialBalance: 100000,
        maxDrawdownPercent: 5,
    });

    // Game State
    const [gameMode] = useState<GameMode>('speed');
    const [_timeLeft, setTimeLeft] = useState(300); // 5 minutes for speed mode
    const [gameStarted, setGameStarted] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [isLiquidated, setIsLiquidated] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Playback State
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(100);

    // UI State
    const [activeTab, setActiveTab] = useState('positions');
    const [quantity, setQuantity] = useState(0.5);
    const [leverage, setLeverage] = useState(10);
    const [selectedTimeframe] = useState('1m');
    const [showIndicators, setShowIndicators] = useState(false);
    const [indicators, setIndicators] = useState<Indicator[]>([
        { id: 'rsi', name: 'RSI (14)', category: 'momentum', icon: <BarChart3 className="w-4 h-4" />, enabled: false },
        { id: 'macd', name: 'MACD', category: 'trend', icon: <TrendingUp className="w-4 h-4" />, enabled: false },
        { id: 'ema20', name: 'EMA (20)', category: 'trend', icon: <TrendingUp className="w-4 h-4" />, enabled: false },
        { id: 'ema50', name: 'EMA (50)', category: 'trend', icon: <TrendingUp className="w-4 h-4" />, enabled: false },
        { id: 'sma20', name: 'SMA (20)', category: 'trend', icon: <TrendingDown className="w-4 h-4" />, enabled: false },
        { id: 'sma50', name: 'SMA (50)', category: 'trend', icon: <TrendingDown className="w-4 h-4" />, enabled: false },
    ]);

    // Order State
    const [isTpSlEnabled, setIsTpSlEnabled] = useState(false);
    const [takeProfit, setTakeProfit] = useState<string>('');
    const [stopLoss, setStopLoss] = useState<string>('');
    const [isLimitOrder, setIsLimitOrder] = useState(false);
    const [limitPrice, setLimitPrice] = useState<string>('');

    // Positions & Stats
    const [positions, setPositions] = useState<Position[]>([]);
    const [maxPositions] = useState(3); // HARD LIMIT
    const [tournamentStats, setTournamentStats] = useState({
        totalBalance: 100000,
        realized: 0,
        unrealized: 0,
        rank: 4,
        maxDrawdown: 0,
        totalFees: 0,
        winRate: 0,
        totalTrades: 0,
    });

    // Hardcore Features
    const [maxDrawdownLimit, setMaxDrawdownLimit] = useState<number>(5000); // Drawdown limit value (only used when enabled)
    const [isMaxDrawdownEnabled, setIsMaxDrawdownEnabled] = useState<boolean>(true); // Explicit flag to control liquidation check
    const [tradingFeePercent] = useState(0.06); // 0.06% per trade
    
    // Market Events Hook
    const {
        activeEvent,
        slippageMultiplier,
        exchangeOutage,
        resetEvents: resetMarketEvents,
    } = useMarketEvents({
        gameStarted,
        gameOver,
        currentPrice,
        onFlashCrash: (crashPrice) => {
            setCurrentPrice(crashPrice);
        },
        onVolatilitySpike: (speed) => {
            setPlaybackSpeed(speed);
        },
    });

    // Multiplayer State
    const [players, setPlayers] = useState<Player[]>([]);

    // Fetch Leaderboard
    const fetchLeaderboard = async () => {
        try {
            const response = await fetch(buildApiUrl('/api/competition/leaderboard?mode=speed&limit=10'), {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                const leaderboardPlayers: Player[] = (data.scores || []).map((score: any, index: number) => ({
                    username: score.username || 'Anonymous',
                    elo: 0,
                    rank: index + 1,
                    pnl: score.pnl || 0,
                }));
                setPlayers(leaderboardPlayers);
            }
        } catch (error) {
            console.error('Failed to fetch leaderboard:', error);
        }
    };

    const saveScore = async () => {
        if (matchType === 'practice' || !user) return;

        if (user) {
            try {
                await fetch(buildApiUrl('/api/competition/scores'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        finalBalance: tournamentStats.totalBalance,
                        pnl: tournamentStats.realized + tournamentStats.unrealized,
                        totalTrades: tournamentStats.totalTrades,
                        maxDrawdown: tournamentStats.maxDrawdown,
                        gameMode
                    })
                });
                // Refresh leaderboard after saving
                setTimeout(fetchLeaderboard, 1000);
            } catch (error) {
                console.error('Failed to save score', error);
            }
        }
    };

    useEffect(() => {
        if (user) {
            fetchLeaderboard();
        }
    }, [gameMode, user]);

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch 5 batches of 1000 candles to ensure enough data for gameplay (5000 candles)
                // At 100ms speed, 5000 candles = 500 seconds > 300 seconds (5 min game)
                const limit = 1000;
                const batches = 5;
                let allFetchedData: any[] = [];
                let currentEndTime = Date.now();

                for (let i = 0; i < batches; i++) {
                    const response = await fetch(apiConfig.binance.endpoints.klines('BTCUSDT', '1m', limit, currentEndTime));
                    const data = await response.json();

                    if (Array.isArray(data) && data.length > 0) {
                        // Binance returns [oldest, ..., newest]
                        // We want to prepend older batches: [Batch2, Batch1]
                        allFetchedData = [...data, ...allFetchedData];
                        // Update endTime to be before the oldest candle we just got
                        currentEndTime = data[0][0] - 1;
                    } else {
                        break;
                    }
                }

                const candles = allFetchedData.map((d: any) => ({
                    time: d[0] / 1000,
                    open: parseFloat(d[1]),
                    high: parseFloat(d[2]),
                    low: parseFloat(d[3]),
                    close: parseFloat(d[4]),
                    volume: parseFloat(d[5]),
                }));

                setAllCandles(candles as unknown as CandlestickData[]);
                // Start with first 1000 candles for context
                setReplayIndex(1000);
                if (candles.length > 1000) {
                    const initialCandle = candles[999] as unknown as CandlestickData;
                    setCurrentPrice(initialCandle.close);
                    setCurrentCandle(initialCandle);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };
        fetchData();
    }, []);

    // Initialize CandleGenerator when we have historical data
    useEffect(() => {
        if (allCandles.length > 0 && allCandles.length >= replayIndex && !candleGeneratorRef.current) {
            const lastCandle = allCandles[replayIndex - 1];
            const historicalCandles = allCandles.slice(0, replayIndex);
            
            const volatility = CandleGenerator.calculateVolatility(historicalCandles);
            const trend = CandleGenerator.detectTrend(historicalCandles);
            
            candleGeneratorRef.current = new CandleGenerator({
                startPrice: lastCandle.close,
                volatility: Math.max(volatility, 0.01), // Minimum volatility
                trend: trend,
                // Removed baseVolume because it's not a valid property of CandleGeneratorOptions
            });
        }
    }, [allCandles, replayIndex]);

    // Update current candle when replay index changes (historical data)
    useEffect(() => {
        if (allCandles.length > 0 && replayIndex > 0 && replayIndex <= allCandles.length && !isInFuture) {
            const candle = allCandles[replayIndex - 1];
            setCurrentCandle(candle);
        }
    }, [replayIndex, allCandles, isInFuture]);

    // Market Events integration with CandleGenerator
    useEffect(() => {
        if (candleGeneratorRef.current && activeEvent) {
            const impact = createMarketEventImpact(
                activeEvent.type,
                'medium' // Could be dynamic based on event
            );
            candleGeneratorRef.current.setMarketEvent(impact);
        } else if (candleGeneratorRef.current && !activeEvent) {
            candleGeneratorRef.current.setMarketEvent(null);
        }
    }, [activeEvent]);

    // Helper function to process candle and update positions
    const processCandle = (candle: CandlestickData) => {
        setPositions(currentPositions => {
            const remainingPositions: Position[] = [];
            let realizedPnlToAdd = 0;

            currentPositions.forEach(pos => {
                let closed = false;
                let closePrice = 0;

                if (pos.type === 'Long') {
                    if (pos.stopLoss && candle.low <= pos.stopLoss) {
                        closed = true;
                        closePrice = pos.stopLoss;
                    } else if (pos.takeProfit && candle.high >= pos.takeProfit) {
                        closed = true;
                        closePrice = pos.takeProfit;
                    }
                } else {
                    if (pos.stopLoss && candle.high >= pos.stopLoss) {
                        closed = true;
                        closePrice = pos.stopLoss;
                    } else if (pos.takeProfit && candle.low <= pos.takeProfit) {
                        closed = true;
                        closePrice = pos.takeProfit;
                    }
                }

                if (closed) {
                    const priceDiff = closePrice - pos.entryPrice;
                    const pnlRaw = pos.type === 'Long' ? priceDiff : -priceDiff;
                    const pnl = (pnlRaw * pos.size * pos.leverage) - pos.commission;
                    realizedPnlToAdd += pnl;
                } else {
                    const priceDiff = candle.close - pos.entryPrice;
                    const pnlRaw = pos.type === 'Long' ? priceDiff : -priceDiff;
                    const pnl = (pnlRaw * pos.size * pos.leverage) - pos.commission;
                    const pnlPercent = (pnlRaw / pos.entryPrice) * 100;

                    remainingPositions.push({
                        ...pos,
                        markPrice: candle.close,
                        pnl,
                        pnlPercent,
                    });
                }
            });

            // Update stats
            if (realizedPnlToAdd !== 0) {
                setTournamentStats(prev => ({
                    ...prev,
                    realized: prev.realized + realizedPnlToAdd,
                    totalBalance: prev.totalBalance + realizedPnlToAdd,
                    totalTrades: prev.totalTrades + 1,
                }));
            }

            // Update unrealized PnL
            const totalUnrealized = remainingPositions.reduce((sum, pos) => sum + pos.pnl, 0);
            setTournamentStats(prev => ({
                ...prev,
                unrealized: totalUnrealized,
            }));

            return remainingPositions;
        });
    };

    // Replay Logic - Historical data
    useEffect(() => {
        if (!isPlaying || !gameStarted || gameOver || isInFuture) return;

        const interval = setInterval(() => {
            setReplayIndex((prev) => {
                const nextIndex = prev + 1;
                
                // Check if we've reached the end of historical data
                if (nextIndex >= allCandles.length) {
                    // Switch to future mode
                    setIsInFuture(true);
                    
                    // Generate first future candle
                    if (candleGeneratorRef.current) {
                        const firstFutureCandle = candleGeneratorRef.current.generateCandle();
                        setFutureCandles([firstFutureCandle]);
                        setCurrentPrice(firstFutureCandle.close);
                        setCurrentCandle(firstFutureCandle);
                        processCandle(firstFutureCandle);
                    }
                    
                    return prev; // Don't increment replayIndex in future mode
                }
                
                // Still in historical mode
                const nextCandle = allCandles[nextIndex];
                setCurrentPrice(nextCandle.close);
                setCurrentCandle(nextCandle);
                processCandle(nextCandle);
                
                return nextIndex;
            });
        }, playbackSpeed);

        return () => clearInterval(interval);
    }, [isPlaying, gameStarted, gameOver, playbackSpeed, allCandles.length, isInFuture]);

    // Future candle generation
    useEffect(() => {
        if (!isPlaying || !gameStarted || gameOver || !isInFuture || !candleGeneratorRef.current) return;

        const futureInterval = setInterval(() => {
            if (candleGeneratorRef.current) {
                const newCandle = candleGeneratorRef.current.generateCandle();
                setFutureCandles(prev => [...prev, newCandle]);
                setCurrentPrice(newCandle.close);
                setCurrentCandle(newCandle);
                processCandle(newCandle);
            }
        }, playbackSpeed);

        return () => clearInterval(futureInterval);
    }, [isPlaying, gameStarted, gameOver, playbackSpeed, isInFuture]);

    // Game Timer
    useEffect(() => {
        if (!gameStarted || gameOver) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    setIsPlaying(false);
                    setGameOver(true);
                    setIsModalOpen(true);
                    saveScore();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [gameStarted, gameOver]);

    // Update position prices continuously
    useEffect(() => {
        if (positions.length > 0 && currentPrice > 0) {
            setPositions(currentPositions => currentPositions.map(pos => {
                const priceDiff = currentPrice - pos.entryPrice;
                const pnlRaw = pos.type === 'Long' ? priceDiff : -priceDiff;
                const pnl = (pnlRaw * pos.size * pos.leverage) - pos.commission;
                const pnlPercent = (pnlRaw / pos.entryPrice) * 100;

                return {
                    ...pos,
                    markPrice: currentPrice,
                    pnl,
                    pnlPercent,
                };
            }));

            // Update unrealized PnL
            const totalUnrealized = positions.reduce((sum, pos) => {
                const priceDiff = currentPrice - pos.entryPrice;
                const pnlRaw = pos.type === 'Long' ? priceDiff : -priceDiff;
                const pnl = (pnlRaw * pos.size * pos.leverage) - pos.commission;
                return sum + pnl;
            }, 0);

            setTournamentStats(prev => ({
                ...prev,
                unrealized: totalUnrealized,
            }));

            // Check max drawdown
            const totalPnl = tournamentStats.realized + totalUnrealized;
            const peakBalance = tournamentStats.totalBalance;
            const currentBalance = practiceSettings.initialBalance + totalPnl;
            const drawdown = peakBalance - currentBalance;

            if (drawdown > tournamentStats.maxDrawdown) {
                setTournamentStats(prev => ({
                    ...prev,
                    maxDrawdown: drawdown,
                }));

                // Check liquidation
                if (isMaxDrawdownEnabled && maxDrawdownLimit !== null && drawdown >= maxDrawdownLimit) {
                    setIsLiquidated(true);
                    setGameOver(true);
                    setIsModalOpen(true);
                    setIsPlaying(false);
                    saveScore();
                }
            }
        }
    }, [currentPrice, positions.length, tournamentStats.realized]);

    // Execute Trade
    const executeTrade = (type: 'Long' | 'Short') => {
        if (!gameStarted || gameOver || exchangeOutage) return;
        if (positions.length >= maxPositions) {
            alert(`⚠️ Maximum ${maxPositions} positions allowed!`);
            return;
        }

        const positionValue = currentPrice * quantity;
        const commission = positionValue * (tradingFeePercent / 100) * slippageMultiplier;

        const takeProfitNum = isTpSlEnabled && takeProfit ? parseFloat(takeProfit) : undefined;
        const stopLossNum = isTpSlEnabled && stopLoss ? parseFloat(stopLoss) : undefined;

        const newPosition: Position = {
            id: Math.random().toString(36).substr(2, 9),
            symbol: 'BTC/USDT',
            type,
            leverage,
            size: quantity,
            entryPrice: currentPrice * slippageMultiplier,
            markPrice: currentPrice,
            pnl: 0,
            pnlPercent: 0,
            takeProfit: takeProfitNum,
            stopLoss: stopLossNum,
            commission,
        };

        setPositions(prev => [newPosition, ...prev]);

        // Update balance (deduct commission)
        setTournamentStats(prev => ({
            ...prev,
            totalBalance: prev.totalBalance - commission,
            totalFees: prev.totalFees + commission,
        }));
    };

    // Close Position
    const closePosition = (id: string) => {
        if (exchangeOutage) {
            alert('🚫 Trading disabled during exchange outage!');
            return;
        }

        const pos = positions.find(p => p.id === id);
        if (pos) {
            const exitCommission = pos.markPrice * pos.size * (tradingFeePercent / 100);
            const finalPnl = pos.pnl - exitCommission;

            setTournamentStats(prev => ({
                ...prev,
                realized: prev.realized + finalPnl,
                totalBalance: prev.totalBalance + finalPnl - exitCommission,
                totalFees: prev.totalFees + exitCommission,
                totalTrades: prev.totalTrades + 1,
                unrealized: prev.unrealized - pos.pnl,
            }));

            setPositions(prev => prev.filter(p => p.id !== id));
        }
    };

    // Start Practice
    const handleStartPractice = (settings: PracticeSettings) => {
        setTimeLeft(settings.timeLimit * 60);
        setTournamentStats(prev => ({
            ...prev,
            totalBalance: settings.initialBalance,
        }));
        
        if (settings.maxDrawdownPercent === null) {
            setIsMaxDrawdownEnabled(false);
            setMaxDrawdownLimit(0);
        } else {
            setIsMaxDrawdownEnabled(true);
            setMaxDrawdownLimit(settings.initialBalance * (settings.maxDrawdownPercent / 100));
        }

        setGameStarted(true);
        setGameOver(false);
        setIsLiquidated(false);
        setIsPlaying(true);
        setShowPracticeSettings(false);
        resetMarketEvents();
    };

    // Toggle Indicator
    const toggleIndicator = (id: string) => {
        setIndicators(prev => prev.map(ind => 
            ind.id === id ? { ...ind, enabled: !ind.enabled } : ind
        ));
    };

    // Reset Replay
    const resetReplay = () => {
        setReplayIndex(1000);
        setIsPlaying(false);
        setGameStarted(false);
        setGameOver(false);
        setIsLiquidated(false);
        setIsModalOpen(false);
        setPositions([]);
        setFutureCandles([]);
        setIsInFuture(false);
        candleGeneratorRef.current = null;
        setTournamentStats({
            totalBalance: practiceSettings.initialBalance,
            realized: 0,
            unrealized: 0,
            rank: 4,
            maxDrawdown: 0,
            totalFees: 0,
            winRate: 0,
            totalTrades: 0,
        });
        resetMarketEvents();
    };

    // Show practice settings on mount if practice mode
    useEffect(() => {
        if (matchType === 'practice' && !gameStarted) {
            setShowPracticeSettings(true);
        }
    }, [matchType, gameStarted]);

    return (
        <div className="h-screen w-screen bg-[#131722] flex flex-col overflow-hidden">
            {/* Practice Settings Modal */}
            <PracticeSettingsModal
                isOpen={showPracticeSettings}
                onClose={() => setShowPracticeSettings(false)}
                onStart={handleStartPractice}
                initialSettings={practiceSettings}
            />

            {/* Main Content - TradingView Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* GAME OVER / LIQUIDATION MODAL */}
                <AnimatePresence>
                    {isModalOpen && (gameOver || isLiquidated) && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
                            onClick={() => setIsModalOpen(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.9, y: 20 }}
                                className="bg-[#131722] border border-[#2A2E39] rounded-2xl p-8 max-w-md w-full mx-4"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="text-center mb-6">
                                    {isLiquidated ? (
                                        <Skull className="w-16 h-16 text-[#EF5350] mx-auto mb-4" />
                                    ) : (
                                        <Trophy className="w-16 h-16 text-[#FFD700] mx-auto mb-4" />
                                    )}
                                    <h2 className="text-2xl font-bold text-white mb-2">
                                        {isLiquidated ? '💀 LIQUIDATED!' : 'Game Over'}
                                    </h2>
                                    <p className="text-[#787B86]">
                                        {isLiquidated 
                                            ? `You hit the ${practiceSettings.maxDrawdownPercent}% max drawdown limit!` 
                                            : 'Time\'s up! Here\'s your final score:'}
                                    </p>
                                </div>

                                <div className="space-y-3 mb-6">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Final Balance:</span>
                                        <span className="text-white font-bold">{formatCurrency(tournamentStats.totalBalance)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Total P&L:</span>
                                        <span className={`font-bold ${(tournamentStats.realized + tournamentStats.unrealized) >= 0 ? 'text-[#26A69A]' : 'text-[#EF5350]'}`}>
                                            {(tournamentStats.realized + tournamentStats.unrealized) >= 0 ? '+' : ''}
                                            {formatCurrency(tournamentStats.realized + tournamentStats.unrealized)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Total Trades:</span>
                                        <span className="text-white font-bold">{tournamentStats.totalTrades}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Max Drawdown:</span>
                                        <span className="text-[#EF5350] font-bold">{formatCurrency(tournamentStats.maxDrawdown)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Final Rank:</span>
                                        <span className="text-yellow-500 font-bold">#{players.find(p => p.isYou)?.rank || 1}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={resetReplay}
                                    className="w-full bg-gradient-to-r from-[#6A3DF4] to-[#8B5CF6] hover:from-[#5A2DE4] hover:to-[#7B4CE6] text-white py-3 rounded-lg font-bold transition-all"
                                >
                                    Play Again
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Center - Chart & Bottom Panel */}
                <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                    {/* Chart Panel */}
                    <div className="flex-1 min-h-0 relative">
                        {!isInFuture ? (
                            <TradingViewAdvancedChart
                                symbol={practiceSettings.symbol}
                                interval={selectedTimeframe}
                                activeEvent={activeEvent}
                                positions={positions}
                            />
                        ) : (
                            <FutureChart
                                historicalCandles={allCandles.slice(0, replayIndex)}
                                futureCandles={futureCandles}
                                currentPrice={currentPrice}
                                positions={positions}
                                activeEvent={activeEvent}
                                activeIndicators={indicators.filter(ind => ind.enabled).map(ind => ind.id)}
                            />
                        )}
                    </div>

                    {/* Bottom Panel - Positions, Orders, History */}
                    <div className="h-48 bg-[#131722] border-t border-[#2A2E39] flex flex-col shrink-0">
                        <div className="flex items-center border-b border-[#2A2E39] px-4">
                            {[
                                { key: 'positions', label: 'Positions' },
                                { key: 'orders', label: 'Orders' },
                                { key: 'history', label: 'History' },
                            ].map((tab) => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`px-4 py-2 text-[12px] font-medium transition-colors ${
                                        activeTab === tab.key
                                            ? 'text-[#2962FF] border-b-2 border-[#2962FF]'
                                            : 'text-[#787B86] hover:text-[#D1D4DC]'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex-1 overflow-auto">
                            {activeTab === 'positions' && (
                                <PositionsTable
                                    positions={positions}
                                    exchangeOutage={exchangeOutage}
                                    onClosePosition={closePosition}
                                />
                            )}
                            {activeTab === 'orders' && <OrdersTable orders={[]} />}
                            {activeTab === 'history' && <HistoryTable history={[]} />}
                        </div>
                    </div>
                </div>

                {/* Right Side - Trading Panel */}
                <TradingPanel
                    tournamentStats={tournamentStats}
                    practiceSettings={practiceSettings}
                    exchangeOutage={exchangeOutage}
                    quantity={quantity}
                    leverage={leverage}
                    isLimitOrder={isLimitOrder}
                    limitPrice={limitPrice}
                    isTpSlEnabled={isTpSlEnabled}
                    takeProfit={takeProfit}
                    stopLoss={stopLoss}
                    gameStarted={gameStarted}
                    gameOver={gameOver}
                    onQuantityChange={setQuantity}
                    onLeverageChange={setLeverage}
                    onLimitOrderChange={setIsLimitOrder}
                    onLimitPriceChange={setLimitPrice}
                    onTpSlChange={setIsTpSlEnabled}
                    onTakeProfitChange={setTakeProfit}
                    onStopLossChange={setStopLoss}
                    onExecuteTrade={executeTrade}
                />
            </div>

            {/* Indicators Panel */}
            <IndicatorsPanel
                isOpen={showIndicators}
                onClose={() => setShowIndicators(false)}
                indicators={indicators}
                onIndicatorToggle={toggleIndicator}
            />
        </div>
    );
}
