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

interface DailyStat {
    date: string;
    trade_count: number;
    daily_pnl: number;
    wins: number;
    losses: number;
}

interface CalendarDay {
    day: number;
    dateStr: string;
    data: DailyStat | undefined;
    isCurrentMonth: boolean;
}

interface CalendarViewProps {
    dailyStats: DailyStat[];
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
        const map: Record<string, DailyStat> = {};
        dailyStats.forEach(stat => {
            const dateKey = stat.date.split('T')[0];
            map[dateKey] = stat;
        });
        return map;
    }, [dailyStats]);

    // Generate calendar grid with weeks - wrapped in useMemo for performance
    const weeks = useMemo(() => {
        const weeksArray: (CalendarDay | null)[][] = [];
        let currentWeek: (CalendarDay | null)[] = [];
        const daysInMonthCalc = getDaysInMonth(year, month);
        const firstDayCalc = getFirstDayOfMonth(year, month);
        const startDayCalc = firstDayCalc;

        // Previous month filler
        const prevMonthDays = getDaysInMonth(year, month - 1);
        for (let i = 0; i < startDayCalc; i++) {
            const day = prevMonthDays - startDayCalc + i + 1;
            const prevMonth = month === 0 ? 11 : month - 1;
            const prevYear = month === 0 ? year - 1 : year;
            const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            currentWeek.push({ day, dateStr, data: statsMap[dateStr], isCurrentMonth: false });
        }

        // Current month days
        for (let i = 1; i <= daysInMonthCalc; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            currentWeek.push({ day: i, dateStr, data: statsMap[dateStr], isCurrentMonth: true });

            if (currentWeek.length === 7) {
                weeksArray.push(currentWeek);
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
            weeksArray.push(currentWeek);
        }

        // Ensure we have at least 5 weeks for consistent layout
        while (weeksArray.length < 5) {
            const week: (CalendarDay | null)[] = [];
            for (let i = 0; i < 7; i++) {
                const nextMonth = month === 11 ? 0 : month + 1;
                const nextYear = month === 11 ? year + 1 : year;
                const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`;
                week.push({ day: nextDay, dateStr, data: statsMap[dateStr], isCurrentMonth: false });
                nextDay++;
            }
            weeksArray.push(week);
        }

        return weeksArray;
    }, [year, month, statsMap]);

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
            <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6"
            >
                <div className="flex items-center gap-3">
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={prevMonth}
                        className="p-2.5 hover:bg-[#FCD535]/20 rounded-xl text-[#7F8C8D] hover:text-white transition-all border border-[#2B2F36] hover:border-[#FCD535]/50 bg-[#1B1B1D]"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </motion.button>
                    <motion.h2 
                        key={`${year}-${month}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-2xl sm:text-3xl font-bold text-white min-w-[200px] text-center bg-gradient-to-r from-white to-white/80 bg-clip-text"
                    >
                        {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </motion.h2>
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={nextMonth}
                        className="p-2.5 hover:bg-[#FCD535]/20 rounded-xl text-[#7F8C8D] hover:text-white transition-all border border-[#2B2F36] hover:border-[#FCD535]/50 bg-[#1B1B1D]"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setCurrentDate(new Date())}
                        className="px-4 py-2 text-sm font-semibold text-white bg-[#FCD535] rounded-xl border border-[#FCD535]/30 hover:from-[#7B8EF0] hover:to-[#FFE066] transition-all shadow-lg shadow-[#FCD535]/20"
                    >
                        Today
                    </motion.button>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <motion.div 
                        whileHover={{ scale: 1.05 }}
                        className="px-4 py-2.5 rounded-xl bg-[#1B1B1D] border border-[#2B2F36] hover:border-[#FCD535]/30 text-sm shadow-lg transition-all"
                    >
                        <span className="text-[#7F8C8D] mr-2">Monthly P&L:</span>
                        <span className={`font-bold text-base ${monthStats.totalPnl >= 0 ? 'text-[#FCD535]' : 'text-[#F43F5E]'}`}>
                            {monthStats.totalPnl >= 0 ? '+' : ''}${monthStats.totalPnl.toFixed(2)}
                        </span>
                    </motion.div>
                    <motion.div 
                        whileHover={{ scale: 1.05 }}
                        className="px-4 py-2.5 rounded-xl bg-[#1B1B1D] border border-[#2B2F36] hover:border-[#FCD535]/30 text-sm shadow-lg transition-all"
                    >
                        <span className="text-[#7F8C8D] mr-2">Trades:</span>
                        <span className="text-white font-bold text-base">{monthStats.trades}</span>
                    </motion.div>
                    <motion.div 
                        whileHover={{ scale: 1.05 }}
                        className="px-4 py-2.5 rounded-xl bg-[#1B1B1D] border border-[#2B2F36] hover:border-[#FCD535]/30 text-sm shadow-lg transition-all"
                    >
                        <span className="text-[#7F8C8D] mr-2">Win Rate:</span>
                        <span className={`font-bold text-base ${monthStats.winRate >= 50 ? 'text-[#FCD535]' : 'text-[#F43F5E]'}`}>
                            {monthStats.winRate.toFixed(1)}%
                        </span>
                    </motion.div>
                </div>
            </motion.div>

            {/* Calendar Table */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="border border-[#2B2F36] rounded-2xl overflow-hidden shadow-2xl bg-[#1B1B1D]"
            >
                {/* Header Row */}
                <div className="grid grid-cols-8 bg-[#FCD535]/20 border-b border-white/20 backdrop-blur-sm">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Total'].map((day, idx) => (
                        <motion.div
                            key={day}
                            whileHover={{ backgroundColor: 'rgba(102, 126, 234, 0.2)' }}
                            className={`py-4 px-3 text-center text-xs font-bold text-white uppercase tracking-widest ${idx < 7 ? 'border-r border-white/20' : ''}`}
                        >
                            {day}
                        </motion.div>
                    ))}
                </div>

                {/* Week Rows */}
                {weeks.map((week, weekIdx) => (
                    <motion.div 
                        key={weekIdx} 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: weekIdx * 0.05 }}
                        className="grid grid-cols-8 border-b border-[#2B2F36] last:border-b-0 hover:bg-white/2 transition-colors"
                    >
                        {week.map((date, dayIdx) => {
                            if (!date) return <div key={`empty-${dayIdx}`} className="border-r border-white/5 p-2 bg-[#1B1B1D]/30" />;

                            const pnl = date.data?.daily_pnl || 0;
                            const trades = date.data?.trade_count || 0;
                            const hasData = !!date.data && trades > 0;
                            const isSelected = selectedDate === date.dateStr;
                            const isToday = date.dateStr === new Date().toISOString().split('T')[0];

                            return (
                                <motion.div
                                    key={date.dateStr}
                                    whileHover={{ scale: 1.02, zIndex: 10 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleSelect(date.dateStr, hasData)}
                                    className={`
                                        border-r border-white/5 p-3 min-h-[90px] cursor-pointer transition-all relative group
                                        ${date.isCurrentMonth ? 'bg-[#1B1B1D]' : 'bg-[#1B1B1D]/30'}
                                        ${isSelected ? 'ring-2 ring-[#FCD535] ring-inset bg-[#FCD535]/10' : ''}
                                        ${hasData && pnl > 0 ? 'hover:bg-[#FCD535]/15 hover:border-[#FCD535]/30' : hasData && pnl < 0 ? 'hover:bg-[#F43F5E]/15 hover:border-[#F43F5E]/30' : 'hover:bg-white/5 hover:border-white/20'}
                                    `}
                                >
                                    {/* Day number */}
                                    <div className="flex items-center justify-between mb-2">
                                        <motion.span 
                                            whileHover={{ scale: 1.1 }}
                                            className={`text-sm font-semibold transition-all ${isToday
                                                    ? 'bg-[#FCD535] text-white w-7 h-7 rounded-full flex items-center justify-center text-xs shadow-lg shadow-[#FCD535]/30'
                                                    : date.isCurrentMonth ? 'text-white' : 'text-[#4A5568]'
                                                }`}
                                        >
                                            {date.day}
                                        </motion.span>
                                        {hasData && (
                                            <motion.span 
                                                whileHover={{ scale: 1.1 }}
                                                className="text-[10px] px-2 py-1 rounded-full bg-gradient-to-r from-[#FCD535]/20 to-[#FCD535]/20 border border-[#FCD535]/30 text-white font-medium"
                                            >
                                                {trades}
                                            </motion.span>
                                        )}
                                    </div>

                                    {/* P&L */}
                                    <motion.div 
                                        className={`text-base font-bold mb-1 ${pnl > 0 ? 'text-[#FCD535]' : pnl < 0 ? 'text-[#F43F5E]' : 'text-[#4A5568]'
                                            }`}
                                    >
                                        {pnl !== 0 ? (pnl > 0 ? '+' : '') + '$' + pnl.toFixed(0) : '$0'}
                                    </motion.div>

                                    {/* Trade count */}
                                    <div className="text-[10px] text-[#7F8C8D] font-medium">
                                        {trades} trade{trades !== 1 ? 's' : ''}
                                    </div>

                                    {/* Hover glow effect */}
                                    {hasData && (
                                        <motion.div 
                                            className="absolute inset-0 border-2 border-[#FCD535]/0 group-hover:border-[#FCD535]/60 rounded-lg transition-all pointer-events-none"
                                            whileHover={{ boxShadow: '0 0 20px rgba(102, 126, 234, 0.3)' }}
                                        />
                                    )}

                                    {/* Background gradient for profitable/losing days */}
                                    {hasData && (
                                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg ${
                                            pnl > 0 ? 'bg-gradient-to-br from-[#FCD535]/5 to-transparent' : 'bg-gradient-to-br from-[#F43F5E]/5 to-transparent'
                                        }`} />
                                    )}
                                </motion.div>
                            );
                        })}

                        {/* Weekly Total */}
                        <motion.div 
                            whileHover={{ scale: 1.02, backgroundColor: 'rgba(102, 126, 234, 0.1)' }}
                            className="p-3 min-h-[90px] bg-[#1B1B1D] border-l border-white/20 relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-[#FCD535]/5 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
                            <div className="relative z-10">
                                <div className="text-[10px] text-[#7F8C8D] font-bold uppercase tracking-widest mb-2">Week {weekIdx + 1}</div>
                                <div className={`text-lg font-bold mb-1 ${weeklyStats[weekIdx].pnl >= 0 ? 'text-[#FCD535]' : 'text-[#F43F5E]'}`}>
                                    {weeklyStats[weekIdx].pnl >= 0 ? '+' : ''}${weeklyStats[weekIdx].pnl.toFixed(0)}
                                </div>
                                <div className="text-[10px] text-[#7F8C8D] font-medium">
                                    {weeklyStats[weekIdx].trades} trades
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                ))}
            </motion.div>

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
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        >
                        {/* Popup */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative z-50 w-full max-w-md"
                        >
                            <div className="bg-[#1B1B1D] rounded-2xl border border-white/20 overflow-hidden shadow-2xl">
                                {/* Popup Header */}
                                <div className="bg-[#FCD535] p-6 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                                    <div className="relative z-10 flex items-center justify-between">
                                        <div>
                                            <h3 className="text-2xl font-bold text-white mb-1">
                                                {new Date(popupDate).toLocaleDateString('en-US', {
                                                    weekday: 'long',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </h3>
                                            <p className="text-white/80 text-sm font-medium">Daily Trading Summary</p>
                                        </div>
                                        <motion.button
                                            whileHover={{ scale: 1.1, rotate: 90 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={closePopup}
                                            className="p-2 hover:bg-white/20 rounded-xl transition-all backdrop-blur-sm"
                                        >
                                            <X className="w-5 h-5 text-white" />
                                        </motion.button>
                                    </div>
                                </div>

                                {/* Popup Content */}
                                <div className="p-6">
                                    {/* Main P&L */}
                                    <motion.div 
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ delay: 0.1 }}
                                        className="text-center mb-8"
                                    >
                                        <div className="text-sm text-[#7F8C8D] mb-2 font-medium uppercase tracking-wider">Net P&L</div>
                                        <motion.div 
                                            className={`text-5xl font-black ${popupData.daily_pnl >= 0 ? 'text-[#FCD535]' : 'text-[#F43F5E]'}`}
                                            initial={{ y: -10, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.2 }}
                                        >
                                            {popupData.daily_pnl >= 0 ? '+' : ''}${popupData.daily_pnl.toFixed(2)}
                                        </motion.div>
                                    </motion.div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <motion.div 
                                            whileHover={{ scale: 1.05, y: -2 }}
                                            className="bg-[#1B1B1D] rounded-xl p-5 border border-[#2B2F36] hover:border-[#FCD535]/50 transition-all shadow-lg"
                                        >
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="p-2 bg-[#FCD535]/20 rounded-lg">
                                                    <BarChart3 className="w-5 h-5 text-[#FCD535]" />
                                                </div>
                                                <span className="text-xs text-[#7F8C8D] font-medium uppercase tracking-wider">Total Trades</span>
                                            </div>
                                            <div className="text-3xl font-bold text-white">{popupData.trade_count}</div>
                                        </motion.div>

                                        <motion.div 
                                            whileHover={{ scale: 1.05, y: -2 }}
                                            className="bg-[#1B1B1D] rounded-xl p-5 border border-[#2B2F36] hover:border-[#FCD535]/50 transition-all shadow-lg"
                                        >
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="p-2 bg-[#FCD535]/20 rounded-lg">
                                                    <Target className="w-5 h-5 text-[#FCD535]" />
                                                </div>
                                                <span className="text-xs text-[#7F8C8D] font-medium uppercase tracking-wider">Win Rate</span>
                                            </div>
                                            <div className={`text-3xl font-bold ${popupData.trade_count > 0 && (popupData.wins / popupData.trade_count) >= 0.5
                                                    ? 'text-[#FCD535]'
                                                    : 'text-[#F43F5E]'
                                                }`}>
                                                {popupData.trade_count > 0
                                                    ? Math.round((popupData.wins / popupData.trade_count) * 100)
                                                    : 0}%
                                            </div>
                                        </motion.div>

                                        <motion.div 
                                            whileHover={{ scale: 1.05, y: -2 }}
                                            className="bg-[#1B1B1D] rounded-xl p-5 border border-[#2B2F36] hover:border-[#FCD535]/50 transition-all shadow-lg"
                                        >
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="p-2 bg-[#FCD535]/20 rounded-lg">
                                                    <TrendingUp className="w-5 h-5 text-[#FCD535]" />
                                                </div>
                                                <span className="text-xs text-[#7F8C8D] font-medium uppercase tracking-wider">Winning Trades</span>
                                            </div>
                                            <div className="text-3xl font-bold text-[#FCD535]">{popupData.wins || 0}</div>
                                        </motion.div>

                                        <motion.div 
                                            whileHover={{ scale: 1.05, y: -2 }}
                                            className="bg-[#1B1B1D] rounded-xl p-5 border border-[#2B2F36] hover:border-[#F43F5E]/50 transition-all shadow-lg"
                                        >
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="p-2 bg-[#F43F5E]/20 rounded-lg">
                                                    <TrendingDown className="w-5 h-5 text-[#F43F5E]" />
                                                </div>
                                                <span className="text-xs text-[#7F8C8D] font-medium uppercase tracking-wider">Losing Trades</span>
                                            </div>
                                            <div className="text-3xl font-bold text-[#F43F5E]">{popupData.losses || 0}</div>
                                        </motion.div>
                                    </div>

                                    {/* Day Performance Indicator */}
                                    <motion.div 
                                        whileHover={{ scale: 1.02 }}
                                        className={`p-5 rounded-xl border-2 ${popupData.daily_pnl >= 0 
                                            ? 'bg-gradient-to-br from-[#FCD535]/10 to-[#FCD535]/5 border-[#FCD535]/40' 
                                            : 'bg-gradient-to-br from-[#F43F5E]/10 to-[#F43F5E]/5 border-[#F43F5E]/40'
                                        }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <motion.div
                                                animate={{ rotate: popupData.daily_pnl >= 0 ? [0, -10, 10, -10, 0] : [0, 10, -10, 10, 0] }}
                                                transition={{ duration: 0.5 }}
                                            >
                                                {popupData.daily_pnl >= 0
                                                    ? <TrendingUp className="w-8 h-8 text-[#FCD535]" />
                                                    : <TrendingDown className="w-8 h-8 text-[#F43F5E]" />
                                                }
                                            </motion.div>
                                            <div>
                                                <div className={`text-lg font-bold ${popupData.daily_pnl >= 0 ? 'text-[#FCD535]' : 'text-[#F43F5E]'}`}>
                                                    {popupData.daily_pnl >= 0 ? 'Profitable Day' : 'Loss Day'}
                                                </div>
                                                <div className="text-sm text-[#7F8C8D] font-medium">
                                                    {popupData.wins || 0} wins, {popupData.losses || 0} losses
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>
                            </div>
                        </motion.div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}










