import { useState, useEffect } from 'react';
import DashboardLayout from '@/react-app/components/DashboardLayout';
import { useELO } from '@/react-app/hooks/useELO';
import { useAuth } from '@/react-app/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Trophy, Crown, Medal, Award, TrendingUp } from 'lucide-react';
import { buildApiUrl } from '@/react-app/hooks/useApi';
import { getDivisionColor } from '@/react-app/hooks/useELO';

interface LeaderboardEntry {
    username: string;
    elo: number;
    division: string;
    total_matches: number;
    wins: number;
    losses: number;
    pnl?: number; // Add optional PnL field
    photoURL?: string; // Add optional photoURL
}

export default function LeaderboardPage() {
    const { user } = useAuth();
    const { eloData } = useELO();
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'elo' | 'pnl'>('elo');

    useEffect(() => {
        fetchLeaderboard();
    }, [activeTab]);

    const fetchLeaderboard = async () => {
        try {
            setLoading(true);
            if (activeTab === 'elo') {
                const response = await fetch(buildApiUrl('/api/competition/elo/leaderboard?limit=100'), {
                    credentials: 'include'
                });
                if (response.ok) {
                    const data = await response.json();
                    setLeaderboard(data.players || []);
                }
            } else {
                const response = await fetch(buildApiUrl('/api/competition/leaderboard?mode=speed&limit=100'), {
                    credentials: 'include'
                });
                if (response.ok) {
                    const data = await response.json();
                    // Transform scores to leaderboard format
                    const transformed = (data.scores || []).map((score: any) => ({
                        username: score.username,
                        elo: 0,
                        division: 'N/A',
                        total_matches: score.total_trades || 0,
                        wins: 0,
                        losses: 0,
                        pnl: score.pnl || 0,
                        photoURL: score.photoURL // Ensure photoURL is passed if available
                    }));
                    setLeaderboard(transformed);
                }
            }
        } catch (error) {
            console.error('Failed to fetch leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-[#0D0F18] p-8">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-8">
                        <div className="bg-[#6A3DF4]/20 p-3 rounded-xl">
                            <Trophy className="w-8 h-8 text-[#6A3DF4]" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold mb-2">Leaderboard</h1>
                            <p className="text-gray-400">Top traders and their rankings</p>
                        </div>
                    </div>

                    {/* My Stats Card - NEW */}
                    {activeTab === 'elo' && eloData && (
                        <div className="bg-[#0D0F18] border border-white/10 rounded-xl p-4 mb-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-[#6A3DF4]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                            <div className="flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 bg-[#6A3DF4] rounded-full flex items-center justify-center shadow-lg shadow-[#6A3DF4]/20 text-white text-2xl font-bold overflow-hidden">
                                        {user?.photoURL?.startsWith('http') || user?.photoURL?.startsWith('data:') ? (
                                            <img src={user.photoURL} alt="Me" className="w-full h-full object-cover" />
                                        ) : (
                                            user?.photoURL || user?.displayName?.charAt(0).toUpperCase() || 'U'
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-sm mb-1">Your Current Rank</p>
                                        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                                            {eloData.elo} ELO
                                            <span
                                                className="text-sm px-3 py-1 rounded-full border border-white/10"
                                                style={{
                                                    backgroundColor: `${getDivisionColor(eloData.division)}20`,
                                                    color: getDivisionColor(eloData.division)
                                                }}
                                            >
                                                {eloData.division}
                                            </span>
                                        </h2>
                                    </div>
                                </div>

                                <div className="flex gap-8 text-right">
                                    <div>
                                        <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Record</p>
                                        <p className="text-xl font-semibold text-white">{eloData.wins}W - {eloData.losses}L</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Win Rate</p>
                                        <p className="text-xl font-semibold text-[#2ECC71]">
                                            {(eloData.wins + eloData.losses) > 0
                                                ? Math.round((eloData.wins / (eloData.wins + eloData.losses)) * 100)
                                                : 0}%
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="flex gap-4 mb-8 border-b border-white/10">
                        <button
                            onClick={() => setActiveTab('elo')}
                            className={`px-6 py-3 border-b-2 transition-colors ${activeTab === 'elo'
                                    ? 'border-[#6A3DF4] text-white'
                                    : 'border-transparent text-gray-400 hover:text-white'
                                }`}
                        >
                            <Trophy className="w-5 h-5 inline mr-2" />
                            ELO Rankings
                        </button>
                        <button
                            onClick={() => setActiveTab('pnl')}
                            className={`px-6 py-3 border-b-2 transition-colors ${activeTab === 'pnl'
                                    ? 'border-[#6A3DF4] text-white'
                                    : 'border-transparent text-gray-400 hover:text-white'
                                }`}
                        >
                            <TrendingUp className="w-5 h-5 inline mr-2" />
                            Best P&L
                        </button>
                    </div>

                    {/* Leaderboard Table */}
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="w-12 h-12 border-4 border-[#6A3DF4]/30 border-t-[#6A3DF4] rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-gray-400">Loading leaderboard...</p>
                        </div>
                    ) : (
                        <div className="bg-[#0D0F18] border border-white/10 rounded-xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-[#0D0F18] border-b border-white/10">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">RANK</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">TRADER</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">ELO</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">DIVISION</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">RECORD</th>
                                            {activeTab === 'pnl' && (
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">P&L</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {leaderboard.map((entry, idx) => {
                                            const rank = idx + 1;
                                            const isYou = entry.username === user?.displayName || entry.username === user?.email?.split('@')[0];
                                            const rankColor = rank === 1 ? 'text-yellow-500' :
                                                rank === 2 ? 'text-gray-400' :
                                                    rank === 3 ? 'text-orange-600' : 'text-blue-500';
                                            const divisionColor = getDivisionColor(entry.division);

                                            return (
                                                <motion.tr
                                                    key={idx}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    className={`hover:bg-white/5 transition-colors ${isYou ? 'bg-[#6A3DF4]/10' : ''}`}
                                                >
                                                    <td className="px-6 py-4">
                                                        {rank <= 3 ? (
                                                            rank === 1 ? <Crown className="w-5 h-5 text-yellow-500" /> :
                                                                rank === 2 ? <Medal className="w-5 h-5 text-gray-400" /> :
                                                                    <Award className="w-5 h-5 text-orange-600" />
                                                        ) : (
                                                            <span className={`font-bold ${rankColor}`}>#{rank}</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-[#6A3DF4]/20 rounded-full flex items-center justify-center overflow-hidden">
                                                                {(() => {
                                                                    const photoURL = isYou ? user?.photoURL : (entry as any).photoURL;
                                                                    const displayName = isYou ? (user?.displayName || entry.username) : entry.username;

                                                                    if (photoURL?.startsWith('http') || photoURL?.startsWith('data:')) {
                                                                        return <img src={photoURL} alt={displayName} className="w-full h-full object-cover" />;
                                                                    }
                                                                    return (
                                                                        <span className="text-lg font-semibold text-white">
                                                                            {photoURL || displayName?.charAt(0).toUpperCase()}
                                                                        </span>
                                                                    );
                                                                })()}
                                                            </div>
                                                            <div>
                                                                <div className="font-medium flex items-center gap-2">
                                                                    {isYou ? (user?.displayName || entry.username) : entry.username}
                                                                    {isYou && (
                                                                        <span className="text-xs bg-[#6A3DF4] text-white px-2 py-0.5 rounded">YOU</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span
                                                            className="font-bold"
                                                            style={{ color: activeTab === 'elo' ? divisionColor : '#6A3DF4' }}
                                                        >
                                                            {activeTab === 'elo' ? entry.elo : '—'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span
                                                            className="text-sm px-2 py-1 rounded"
                                                            style={{
                                                                backgroundColor: `${divisionColor}20`,
                                                                color: divisionColor
                                                            }}
                                                        >
                                                            {entry.division}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-gray-300">
                                                            {entry.wins}W / {entry.losses}L
                                                        </span>
                                                    </td>
                                                    {activeTab === 'pnl' && (
                                                        <td className="px-6 py-4">
                                                            <span className={`font-bold ${(entry as any).pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                                {(entry as any).pnl >= 0 ? '+' : ''}${((entry as any).pnl || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                            </span>
                                                        </td>
                                                    )}
                                                </motion.tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
