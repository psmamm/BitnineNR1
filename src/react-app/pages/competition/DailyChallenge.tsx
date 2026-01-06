import { useState } from 'react';
import { useNavigate } from 'react-router';
import DashboardLayout from '@/react-app/components/DashboardLayout';
import { useDailyChallenge } from '@/react-app/hooks/useDailyChallenge';
import { useELO } from '@/react-app/hooks/useELO';
import { motion } from 'framer-motion';
import { Trophy, Clock, Users, TrendingUp, ChevronLeft, ChevronRight, Play, Crown, Medal, Award } from 'lucide-react';
import { getDivisionColor } from '@/react-app/hooks/useELO';

export default function DailyChallengePage() {
    const navigate = useNavigate();
    const { challenge, participants, loading, joined, joinChallenge, timeRemaining } = useDailyChallenge();
    const { eloData } = useELO();
    const [selectedDate, setSelectedDate] = useState(new Date());

    const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    };

    const top3 = participants.slice(0, 3);
    const rest = participants.slice(3);

    const handleJoin = async () => {
        try {
            await joinChallenge();
            navigate('/competition/play?type=daily-challenge');
        } catch (error) {
            console.error('Failed to join challenge:', error);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="min-h-screen bg-[#0D0F18] flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-[#6A3DF4]/30 border-t-[#6A3DF4] rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-gray-400">Loading daily challenge...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-[#0D0F18] p-8">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="bg-[#6A3DF4]/20 p-3 rounded-xl">
                                <Trophy className="w-8 h-8 text-[#6A3DF4]" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-bold mb-2">Daily Challenge</h1>
                                <div className="flex items-center gap-3">
                                    <span className="px-3 py-1 bg-[#6A3DF4]/20 text-[#6A3DF4] rounded-lg text-sm font-medium">
                                        24 Hour Challenge
                                    </span>
                                    <span className="px-3 py-1 bg-[#6A3DF4]/20 text-[#6A3DF4] rounded-lg text-sm font-medium flex items-center gap-2">
                                        <Users className="w-4 h-4" />
                                        {challenge?.participantCount || 0} participants
                                    </span>
                                </div>
                            </div>
                        </div>
                        {!joined && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleJoin}
                                className="bg-gradient-to-r from-[#6A3DF4] to-[#8B5CF6] hover:from-[#5A2DE4] hover:to-[#7B4CE6] text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
                            >
                                <Play className="w-5 h-5" />
                                Start Challenge
                            </motion.button>
                        )}
                    </div>

                    {/* Date & Timer Section */}
                    <div className="bg-[#1E2232] border border-white/10 rounded-2xl p-8 mb-8">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 86400000))}
                                    className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5 text-gray-400" />
                                </button>
                                <h2 className="text-2xl font-bold">{formatDate(selectedDate)}</h2>
                                <button
                                    onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 86400000))}
                                    className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                                >
                                    <ChevronRight className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>
                            <div className="flex items-center gap-3">
                                <Clock className="w-6 h-6 text-[#6A3DF4]" />
                                <div className="text-4xl font-bold text-[#6A3DF4] font-mono">
                                    {formatTime(timeRemaining)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Top 3 Podium */}
                    {top3.length > 0 && (
                        <div className="grid grid-cols-3 gap-4 mb-8">
                            {/* 2nd Place */}
                            {top3[1] && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="bg-[#1E2232] border border-white/10 rounded-2xl p-6 text-center"
                                >
                                    <div className="flex justify-center mb-4">
                                        <div className="bg-gray-400/20 p-4 rounded-full">
                                            <Medal className="w-8 h-8 text-gray-400" />
                                        </div>
                                    </div>
                                    <div className="w-16 h-16 bg-gray-700 rounded-full mx-auto mb-3 flex items-center justify-center text-xl">
                                        {top3[1].username.charAt(0).toUpperCase()}
                                    </div>
                                    <h3 className="font-bold mb-1">{top3[1].username}</h3>
                                    {top3[1].elo && (
                                        <div className="text-xs text-gray-400 mb-2">ELO: {top3[1].elo}</div>
                                    )}
                                    <div className="text-2xl font-bold text-green-400 mb-1">
                                        +${top3[1].pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>
                                    <div className="text-sm text-gray-400">
                                        {top3[1].total_trades} trades • {(top3[1].win_rate * 100).toFixed(1)}% WR
                                    </div>
                                    <div className="mt-4 text-3xl">🥈</div>
                                </motion.div>
                            )}

                            {/* 1st Place */}
                            {top3[0] && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="bg-gradient-to-br from-[#6A3DF4]/20 to-[#8B5CF6]/20 border-2 border-[#6A3DF4]/50 rounded-2xl p-6 text-center transform scale-105"
                                >
                                    <div className="flex justify-center mb-4">
                                        <div className="bg-yellow-500/20 p-4 rounded-full">
                                            <Crown className="w-8 h-8 text-yellow-500" />
                                        </div>
                                    </div>
                                    <div className="w-20 h-20 bg-gradient-to-br from-[#6A3DF4] to-[#8B5CF6] rounded-full mx-auto mb-3 flex items-center justify-center text-2xl font-bold">
                                        {top3[0].username.charAt(0).toUpperCase()}
                                    </div>
                                    <h3 className="font-bold mb-1 text-lg">{top3[0].username}</h3>
                                    {top3[0].elo && (
                                        <div className="text-xs text-gray-400 mb-2">ELO: {top3[0].elo}</div>
                                    )}
                                    <div className="text-3xl font-bold text-green-400 mb-1">
                                        +${top3[0].pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>
                                    <div className="text-sm text-gray-400">
                                        {top3[0].total_trades} trades • {(top3[0].win_rate * 100).toFixed(1)}% WR
                                    </div>
                                    <div className="mt-4 text-4xl">🥇</div>
                                </motion.div>
                            )}

                            {/* 3rd Place */}
                            {top3[2] && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="bg-[#1E2232] border border-white/10 rounded-2xl p-6 text-center"
                                >
                                    <div className="flex justify-center mb-4">
                                        <div className="bg-orange-600/20 p-4 rounded-full">
                                            <Award className="w-8 h-8 text-orange-600" />
                                        </div>
                                    </div>
                                    <div className="w-16 h-16 bg-orange-600/20 rounded-full mx-auto mb-3 flex items-center justify-center text-xl">
                                        {top3[2].username.charAt(0).toUpperCase()}
                                    </div>
                                    <h3 className="font-bold mb-1">{top3[2].username}</h3>
                                    {top3[2].elo && (
                                        <div className="text-xs text-gray-400 mb-2">ELO: {top3[2].elo}</div>
                                    )}
                                    <div className="text-2xl font-bold text-green-400 mb-1">
                                        +${top3[2].pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>
                                    <div className="text-sm text-gray-400">
                                        {top3[2].total_trades} trades • {(top3[2].win_rate * 100).toFixed(1)}% WR
                                    </div>
                                    <div className="mt-4 text-3xl">🥉</div>
                                </motion.div>
                            )}
                        </div>
                    )}

                    {/* Leaderboard Table */}
                    <div className="bg-[#1E2232] border border-white/10 rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <TrendingUp className="w-6 h-6 text-[#6A3DF4]" />
                                <h2 className="text-2xl font-bold">Daily Challenge Leaderboard</h2>
                            </div>
                            <span className="text-sm text-gray-400">Live Rankings & Trade Analysis</span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-[#0D0F18] border-b border-white/10">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">RANK</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">TRADER</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">ELO</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">P&L</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">TRADES</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">WIN RATE</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">DETAILS</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {participants.map((participant, idx) => {
                                        const rank = idx + 1;
                                        const isTop3 = rank <= 3;
                                        
                                        return (
                                            <motion.tr
                                                key={participant.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                                className="hover:bg-white/5 transition-colors"
                                            >
                                                <td className="px-6 py-4">
                                                    {isTop3 ? (
                                                        rank === 1 ? <Crown className="w-5 h-5 text-yellow-500" /> :
                                                        rank === 2 ? <Medal className="w-5 h-5 text-gray-400" /> :
                                                        <Award className="w-5 h-5 text-orange-600" />
                                                    ) : (
                                                        <span className="text-gray-400 font-medium">#{rank}</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-[#6A3DF4]/20 rounded-full flex items-center justify-center">
                                                            {participant.username.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="font-medium">{participant.username}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-gray-400">{participant.elo || '—'}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`font-bold ${participant.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {participant.pnl >= 0 ? '+' : ''}${participant.pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-gray-300">{participant.total_trades}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-gray-300">{(participant.win_rate * 100).toFixed(1)}%</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button className="text-gray-400 hover:text-white transition-colors">
                                                        <TrendingDown className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

