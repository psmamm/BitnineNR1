import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import DashboardLayout from '@/react-app/components/DashboardLayout';
import { useAuth } from '@/react-app/contexts/AuthContext';
import { useELO } from '@/react-app/hooks/useELO';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, TrendingDown, ArrowRight, Wrench, Crown } from 'lucide-react';
import { getDivisionColor } from '@/react-app/hooks/useELO';

export default function MatchCompletePage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const matchId = searchParams.get('matchId');
    const { user } = useAuth();
    const { eloData, refetch } = useELO();
    const [matchData, setMatchData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (matchId) {
            fetchMatchData();
        }
        // Refetch ELO to get updated values
        refetch();
    }, [matchId, refetch]);

    const fetchMatchData = async () => {
        try {
            const response = await fetch(`/api/competition/matches/${matchId}`, {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                setMatchData(data.match);
            }
        } catch (error) {
            console.error('Failed to fetch match data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="min-h-screen bg-[#0D0F18] flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-[#6A3DF4]/30 border-t-[#6A3DF4] rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-gray-400">Loading match results...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!matchData) {
        return (
            <DashboardLayout>
                <div className="min-h-screen bg-[#0D0F18] flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-gray-400 mb-4">Match not found</p>
                        <button
                            onClick={() => navigate('/competition')}
                            className="text-[#6A3DF4] hover:text-[#8B5CF6]"
                        >
                            Back to Competition
                        </button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const userId = user?.google_user_data?.sub || (user as any)?.firebase_user_id;
    const isPlayer1 = matchData.player1_id === userId;
    const yourResults = isPlayer1 ? {
        pnl: matchData.player1_pnl,
        balance: matchData.player1_balance,
        trades: matchData.player1_trades,
        winRate: matchData.player1_win_rate,
        eloChange: matchData.player1_elo_change
    } : {
        pnl: matchData.player2_pnl,
        balance: matchData.player2_balance,
        trades: matchData.player2_trades,
        winRate: matchData.player2_win_rate,
        eloChange: matchData.player2_elo_change
    };

    const opponentResults = isPlayer1 ? {
        pnl: matchData.player2_pnl,
        balance: matchData.player2_balance,
        trades: matchData.player2_trades,
        winRate: matchData.player2_win_rate,
        eloChange: matchData.player2_elo_change
    } : {
        pnl: matchData.player1_pnl,
        balance: matchData.player1_balance,
        trades: matchData.player1_trades,
        winRate: matchData.player1_win_rate,
        eloChange: matchData.player1_elo_change
    };

    const youWon = matchData.winner_id === userId;
    const divisionColor = eloData ? getDivisionColor(eloData.division) : '#6A3DF4';

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-[#0D0F18] p-8">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-4xl font-bold mb-8 text-center">Match Complete</h1>

                    {/* Results Cards */}
                    <div className="grid md:grid-cols-2 gap-6 mb-8">
                        {/* Your Results */}
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`bg-[#1E2232] border-2 rounded-2xl p-6 ${
                                youWon ? 'border-green-500/50' : 'border-red-500/50'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-16 h-16 bg-[#6A3DF4]/20 rounded-full flex items-center justify-center text-2xl">
                                    {user?.displayName?.charAt(0) || user?.email?.charAt(0) || '👤'}
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-gray-500 mb-1">ELO</div>
                                    <div className="flex items-center gap-2">
                                        <span 
                                            className="text-2xl font-bold"
                                            style={{ color: divisionColor }}
                                        >
                                            {eloData?.elo || 500}
                                        </span>
                                        {yourResults.eloChange !== 0 && (
                                            <span className={`text-sm ${yourResults.eloChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {yourResults.eloChange > 0 ? '+' : ''}{yourResults.eloChange}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <h3 className="text-xl font-bold mb-4">Your Results</h3>

                            <div className="space-y-3">
                                <div>
                                    <div className="text-xs text-gray-500 mb-1">P&L</div>
                                    <div className={`text-2xl font-bold ${yourResults.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {yourResults.pnl >= 0 ? '+' : ''}${yourResults.pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>
                                    <div className={`text-sm ${yourResults.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {((yourResults.pnl / 100000) * 100).toFixed(2)}%
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/5">
                                    <div>
                                        <div className="text-xs text-gray-500 mb-1">Trades</div>
                                        <div className="text-lg font-semibold">{yourResults.trades}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500 mb-1">Win Rate</div>
                                        <div className="text-lg font-semibold">{(yourResults.winRate * 100).toFixed(1)}%</div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Opponent Results */}
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-[#1E2232] border-2 border-white/10 rounded-2xl p-6"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center text-2xl">
                                    👤
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-gray-500 mb-1">ELO</div>
                                    <div className="text-2xl font-bold text-gray-400">
                                        {opponentResults.eloChange !== 0 ? (
                                            <span className={opponentResults.eloChange > 0 ? 'text-green-400' : 'text-red-400'}>
                                                {opponentResults.eloChange > 0 ? '+' : ''}{opponentResults.eloChange}
                                            </span>
                                        ) : (
                                            '—'
                                        )}
                                    </div>
                                </div>
                            </div>

                            <h3 className="text-xl font-bold mb-4">Opponent's Results</h3>

                            <div className="space-y-3">
                                <div>
                                    <div className="text-xs text-gray-500 mb-1">P&L</div>
                                    <div className={`text-2xl font-bold ${opponentResults.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {opponentResults.pnl >= 0 ? '+' : ''}${opponentResults.pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>
                                    <div className={`text-sm ${opponentResults.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {((opponentResults.pnl / 100000) * 100).toFixed(2)}%
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/5">
                                    <div>
                                        <div className="text-xs text-gray-500 mb-1">Trades</div>
                                        <div className="text-lg font-semibold">{opponentResults.trades}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500 mb-1">Win Rate</div>
                                        <div className="text-lg font-semibold">{(opponentResults.winRate * 100).toFixed(1)}%</div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4 justify-center mb-8">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate('/competition')}
                            className="bg-gradient-to-r from-[#6A3DF4] to-[#8B5CF6] hover:from-[#5A2DE4] hover:to-[#7B4CE6] text-white px-8 py-4 rounded-xl font-bold transition-all flex items-center gap-2"
                        >
                            <Trophy className="w-5 h-5" />
                            New Ranked Match
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate('/competition/play?type=practice')}
                            className="bg-[#1E2232] border border-white/10 hover:border-[#6A3DF4]/50 text-white px-8 py-4 rounded-xl font-bold transition-all flex items-center gap-2"
                        >
                            <Wrench className="w-5 h-5" />
                            New Practice Match
                        </motion.button>
                    </div>

                    {/* Trade Analytics Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-[#1E2232] border border-white/10 rounded-2xl p-6"
                    >
                        <h3 className="text-xl font-bold mb-4">Trade Analytics</h3>
                        <p className="text-gray-400 text-sm">Detailed trade analysis coming soon...</p>
                    </motion.div>
                </div>
            </div>
        </DashboardLayout>
    );
}

