import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X, TrendingUp, TrendingDown, Target, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Helper to get days in month
function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay();
}

interface CalendarViewProps {
    dailyStats: any[];
    selectedDate?: string | null;
    onSelectDate?: (date: string | null) => void;
}

export function CalendarView({ dailyStats, selectedDate: externalSelected, onSelectDate }: CalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(externalSelected || null);
    const [popupDate, setPopupDate] = useState<string | null>(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const statsMap = useMemo(() => {
        const map: Record<string, any> = {};
        dailyStats.forEach(stat => {
            const dateKey = stat.date.split('T')[0];
            map[dateKey] = stat;
        });
        return map;
    }, [dailyStats]);

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    // Sunday start (0 = Sunday)
    const startDay = firstDay;

    // Generate calendar grid with weeks
    const weeks: ({ day: number; dateStr: string; data: any; isCurrentMonth: boolean } | null)[][] = [];
    let currentWeek: ({ day: number; dateStr: string; data: any; isCurrentMonth: boolean } | null)[] = [];

    // Previous month filler
    const prevMonthDays = getDaysInMonth(year, month - 1);
    for (let i = 0; i < startDay; i++) {
        const day = prevMonthDays - startDay + i + 1;
        const prevMonth = month === 0 ? 11 : month - 1;
        const prevYear = month === 0 ? year - 1 : year;
        const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        currentWeek.push({ day, dateStr, data: statsMap[dateStr], isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        currentWeek.push({ day: i, dateStr, data: statsMap[dateStr], isCurrentMonth: true });

        if (currentWeek.length === 7) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
    }

    // Next month filler
    let nextDay = 1;
    while (currentWeek.length < 7 && currentWeek.length > 0) {
        const nextMonth = month === 11 ? 0 : month + 1;
        const nextYear = month === 11 ? year + 1 : year;
        const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`;
        currentWeek.push({ day: nextDay, dateStr, data: statsMap[dateStr], isCurrentMonth: false });
        nextDay++;
    }
    if (currentWeek.length > 0) {
        weeks.push(currentWeek);
    }

    // Ensure we have at least 5 weeks for consistent layout
    while (weeks.length < 5) {
        const week: ({ day: number; dateStr: string; data: any; isCurrentMonth: boolean } | null)[] = [];
        for (let i = 0; i < 7; i++) {
            const nextMonth = month === 11 ? 0 : month + 1;
            const nextYear = month === 11 ? year + 1 : year;
            const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`;
            week.push({ day: nextDay, dateStr, data: statsMap[dateStr], isCurrentMonth: false });
            nextDay++;
        }
        weeks.push(week);
    }

    const prevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    // Monthly stats
    const monthStats = useMemo(() => {
        let totalPnl = 0;
        let trades = 0;
        let wins = 0;
        let losses = 0;
        weeks.forEach(week => {
            week.forEach(d => {
                if (d && d.isCurrentMonth && d.data) {
                    totalPnl += (d.data.daily_pnl || 0);
                    trades += (d.data.trade_count || 0);
                    wins += (d.data.wins || 0);
                    losses += (d.data.losses || 0);
                }
            });
        });
        const winRate = trades > 0 ? (wins / (wins + losses)) * 100 : 0;
        return { totalPnl, trades, winRate };
    }, [weeks]);

    // Weekly stats
    const weeklyStats = useMemo(() => {
        return weeks.map((week, idx) => {
            let pnl = 0;
            let trades = 0;
            week.forEach(d => {
                if (d && d.data) {
                    pnl += d.data.daily_pnl || 0;
                    trades += d.data.trade_count || 0;
                }
            });
            return { label: `Week ${idx + 1}`, pnl, trades };
        });
    }, [weeks]);

    const handleSelect = (dateStr: string, hasData: boolean) => {
        setSelectedDate(dateStr);
        onSelectDate?.(dateStr);
        if (hasData) {
            setPopupDate(dateStr);
        }
    };

    const closePopup = () => {
        setPopupDate(null);
    };

    // Get popup data
    const popupData = popupDate ? statsMap[popupDate] : null;

    return (
        <div className="w-full relative">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={prevMonth}
                        className="p-2 hover:bg-white/5 rounded-lg text-[#7F8C8D] hover:text-white transition-all border border-white/10"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <h2 className="text-xl font-bold text-white min-w-[180px] text-center">
                        {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h2>
                    <button
                        onClick={nextMonth}
                        className="p-2 hover:bg-white/5 rounded-lg text-[#7F8C8D] hover:text-white transition-all border border-white/10"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setCurrentDate(new Date())}
                        className="px-3 py-1.5 text-xs font-medium text-[#667eea] bg-[#667eea]/10 rounded-lg border border-[#667eea]/30 hover:bg-[#667eea]/20 transition-all"
                    >
                        Today
                    </button>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-3 py-2 rounded-lg bg-[#0D0F18] border border-white/10 text-sm">
                        <span className="text-[#7F8C8D] mr-2">Monthly P&L:</span>
                        <span className={`font-bold ${monthStats.totalPnl >= 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]'}`}>
                            {monthStats.totalPnl >= 0 ? '+' : ''}${monthStats.totalPnl.toFixed(2)}
                        </span>
                    </div>
                    <div className="px-3 py-2 rounded-lg bg-[#0D0F18] border border-white/10 text-sm">
                        <span className="text-[#7F8C8D] mr-2">Trades:</span>
                        <span className="text-white font-bold">{monthStats.trades}</span>
                    </div>
                    <div className="px-3 py-2 rounded-lg bg-[#0D0F18] border border-white/10 text-sm">
                        <span className="text-[#7F8C8D] mr-2">Win Rate:</span>
                        <span className={`font-bold ${monthStats.winRate >= 50 ? 'text-[#2ECC71]' : 'text-[#E74C3C]'}`}>
                            {monthStats.winRate.toFixed(1)}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Calendar Table */}
            <div className="border border-white/10 rounded-xl overflow-hidden shadow-lg">
                {/* Header Row */}
                <div className="grid grid-cols-8 bg-gradient-to-r from-[#667eea]/20 to-[#764ba2]/20 border-b border-white/10">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Total'].map((day, idx) => (
                        <div
                            key={day}
                            className={`py-3 px-2 text-center text-xs font-semibold text-white/80 uppercase tracking-wider ${idx < 7 ? 'border-r border-white/10' : ''}`}
                        >
                            {day}
                        </div>
                    ))}
                </div>

                {/* Week Rows */}
                {weeks.map((week, weekIdx) => (
                    <div key={weekIdx} className="grid grid-cols-8 border-b border-white/5 last:border-b-0">
                        {week.map((date, dayIdx) => {
                            if (!date) return <div key={`empty-${dayIdx}`} className="border-r border-white/5 p-2" />;

                            const pnl = date.data?.daily_pnl || 0;
                            const trades = date.data?.trade_count || 0;
                            const hasData = !!date.data && trades > 0;
                            const isSelected = selectedDate === date.dateStr;
                            const isToday = date.dateStr === new Date().toISOString().split('T')[0];

                            return (
                                <div
                                    key={date.dateStr}
                                    onClick={() => handleSelect(date.dateStr, hasData)}
                                    className={`
                                        border-r border-white/5 p-2 min-h-[75px] cursor-pointer transition-all relative group
                                        ${date.isCurrentMonth ? 'bg-[#0D0F18]' : 'bg-[#0D0F18]/40'}
                                        ${isSelected ? 'ring-2 ring-[#667eea] ring-inset' : ''}
                                        ${hasData && pnl > 0 ? 'hover:bg-[#2ECC71]/10' : hasData && pnl < 0 ? 'hover:bg-[#E74C3C]/10' : 'hover:bg-white/5'}
                                    `}
                                >
                                    {/* Day number */}
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`text-sm font-medium ${isToday
                                                ? 'bg-[#667eea] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs'
                                                : date.isCurrentMonth ? 'text-white' : 'text-[#4A5568]'
                                            }`}>
                                            {date.day}
                                        </span>
                                        {hasData && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/70">
                                                {trades}
                                            </span>
                                        )}
                                    </div>

                                    {/* P&L */}
                                    <div className={`text-sm font-bold ${pnl > 0 ? 'text-[#2ECC71]' : pnl < 0 ? 'text-[#E74C3C]' : 'text-[#4A5568]'
                                        }`}>
                                        {pnl !== 0 ? (pnl > 0 ? '+' : '') + '$' + pnl.toFixed(0) : '$0'}
                                    </div>

                                    {/* Trade count */}
                                    <div className="text-[10px] text-[#7F8C8D]">
                                        {trades} trade{trades !== 1 ? 's' : ''}
                                    </div>

                                    {/* Hover indicator for clickable dates */}
                                    {hasData && (
                                        <div className="absolute inset-0 border-2 border-[#667eea]/0 group-hover:border-[#667eea]/50 rounded transition-all pointer-events-none" />
                                    )}
                                </div>
                            );
                        })}

                        {/* Weekly Total */}
                        <div className="p-2 min-h-[75px] bg-[#1E2232] border-l border-white/10">
                            <div className="text-[10px] text-[#7F8C8D] font-medium uppercase tracking-wider">Week {weekIdx + 1}</div>
                            <div className={`text-base font-bold mt-1 ${weeklyStats[weekIdx].pnl >= 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]'}`}>
                                {weeklyStats[weekIdx].pnl >= 0 ? '+' : ''}${weeklyStats[weekIdx].pnl.toFixed(0)}
                            </div>
                            <div className="text-[10px] text-[#7F8C8D]">
                                {weeklyStats[weekIdx].trades} trades
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Popup Modal for Date Details */}
            <AnimatePresence>
                {popupDate && popupData && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closePopup}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                        />

                        {/* Popup */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
                        >
                            <div className="bg-[#1E2232] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                                {/* Popup Header */}
                                <div className="bg-gradient-to-r from-[#667eea] to-[#764ba2] p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-xl font-bold text-white">
                                                {new Date(popupDate).toLocaleDateString('en-US', {
                                                    weekday: 'long',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </h3>
                                            <p className="text-white/70 text-sm mt-1">Daily Trading Summary</p>
                                        </div>
                                        <button
                                            onClick={closePopup}
                                            className="p-2 hover:bg-white/20 rounded-lg transition-all"
                                        >
                                            <X className="w-5 h-5 text-white" />
                                        </button>
                                    </div>
                                </div>

                                {/* Popup Content */}
                                <div className="p-6">
                                    {/* Main P&L */}
                                    <div className="text-center mb-6">
                                        <div className="text-sm text-[#7F8C8D] mb-1">Net P&L</div>
                                        <div className={`text-4xl font-bold ${popupData.daily_pnl >= 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]'}`}>
                                            {popupData.daily_pnl >= 0 ? '+' : ''}${popupData.daily_pnl.toFixed(2)}
                                        </div>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="bg-[#0D0F18] rounded-xl p-4 border border-white/5">
                                            <div className="flex items-center gap-2 mb-2">
                                                <BarChart3 className="w-4 h-4 text-[#667eea]" />
                                                <span className="text-xs text-[#7F8C8D]">Total Trades</span>
                                            </div>
                                            <div className="text-2xl font-bold text-white">{popupData.trade_count}</div>
                                        </div>

                                        <div className="bg-[#0D0F18] rounded-xl p-4 border border-white/5">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Target className="w-4 h-4 text-[#667eea]" />
                                                <span className="text-xs text-[#7F8C8D]">Win Rate</span>
                                            </div>
                                            <div className={`text-2xl font-bold ${popupData.trade_count > 0 && (popupData.wins / popupData.trade_count) >= 0.5
                                                    ? 'text-[#2ECC71]'
                                                    : 'text-[#E74C3C]'
                                                }`}>
                                                {popupData.trade_count > 0
                                                    ? Math.round((popupData.wins / popupData.trade_count) * 100)
                                                    : 0}%
                                            </div>
                                        </div>

                                        <div className="bg-[#0D0F18] rounded-xl p-4 border border-white/5">
                                            <div className="flex items-center gap-2 mb-2">
                                                <TrendingUp className="w-4 h-4 text-[#2ECC71]" />
                                                <span className="text-xs text-[#7F8C8D]">Winning Trades</span>
                                            </div>
                                            <div className="text-2xl font-bold text-[#2ECC71]">{popupData.wins || 0}</div>
                                        </div>

                                        <div className="bg-[#0D0F18] rounded-xl p-4 border border-white/5">
                                            <div className="flex items-center gap-2 mb-2">
                                                <TrendingDown className="w-4 h-4 text-[#E74C3C]" />
                                                <span className="text-xs text-[#7F8C8D]">Losing Trades</span>
                                            </div>
                                            <div className="text-2xl font-bold text-[#E74C3C]">{popupData.losses || 0}</div>
                                        </div>
                                    </div>

                                    {/* Day Performance Indicator */}
                                    <div className={`p-4 rounded-xl ${popupData.daily_pnl >= 0 ? 'bg-[#2ECC71]/10 border border-[#2ECC71]/30' : 'bg-[#E74C3C]/10 border border-[#E74C3C]/30'}`}>
                                        <div className="flex items-center gap-3">
                                            {popupData.daily_pnl >= 0
                                                ? <TrendingUp className="w-6 h-6 text-[#2ECC71]" />
                                                : <TrendingDown className="w-6 h-6 text-[#E74C3C]" />
                                            }
                                            <div>
                                                <div className={`font-semibold ${popupData.daily_pnl >= 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]'}`}>
                                                    {popupData.daily_pnl >= 0 ? 'Profitable Day' : 'Loss Day'}
                                                </div>
                                                <div className="text-xs text-[#7F8C8D]">
                                                    {popupData.wins || 0} wins, {popupData.losses || 0} losses
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

export const useDailyStats = () => {
    return {};
}
