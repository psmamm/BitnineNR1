import { useState } from 'react';
import { useNavigate } from 'react-router';
import DashboardLayout from '@/react-app/components/DashboardLayout';
import { useTournaments, useTournament } from '@/react-app/hooks/useTournaments';
import { buildApiUrl } from '@/react-app/hooks/useApi';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Plus, Play, Clock, CheckCircle, Users, Calendar, ArrowRight, X, Crown, TrendingUp } from 'lucide-react';
import { useAuth } from '@/react-app/contexts/AuthContext';

export default function TournamentsPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'active' | 'ready' | 'completed'>('ready'); // Default to 'ready' tournaments
    const [seeding, setSeeding] = useState(false);
    const [seedMessage, setSeedMessage] = useState<string | null>(null);
    
    const { tournaments: activeTournaments, loading: activeLoading, refetch: refetchActive } = useTournaments('active');
    const { tournaments: readyTournaments, loading: readyLoading, refetch: refetchReady } = useTournaments('ready');
    const { tournaments: completedTournaments, loading: completedLoading, refetch: refetchCompleted } = useTournaments('completed');
    const { createTournament } = useTournament(null);

    const handleSeedTournaments = async () => {
        if (!confirm('This will create example tournaments. Continue?')) {
            return;
        }

        try {
            setSeeding(true);
            setSeedMessage(null);
            
            const response = await fetch(buildApiUrl('/api/competition/tournaments/seed'), {
                method: 'POST',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to seed tournaments');
            }

            const data = await response.json();
            
            if (data.error) {
                setSeedMessage(`Error: ${data.error}${data.hint ? ` - ${data.hint}` : ''}`);
            } else if (data.errors > 0) {
                setSeedMessage(`${data.message} Check console for details.`);
                console.error('Tournament seeding errors:', data.errorDetails);
            } else {
                setSeedMessage(data.message || `Successfully created ${data.created} tournaments!`);
            }
            
            // Refresh all tournament lists
            refetchActive();
            refetchReady();
            refetchCompleted();

            // Clear message after 8 seconds (longer for error messages)
            setTimeout(() => setSeedMessage(null), 8000);
        } catch (error: any) {
            const errorMessage = error.message || 'Failed to seed tournaments';
            setSeedMessage(`Error: ${errorMessage}. Make sure migration 9.sql has been executed.`);
            setTimeout(() => setSeedMessage(null), 8000);
        } finally {
            setSeeding(false);
        }
    };

    const [createForm, setCreateForm] = useState({
        name: '',
        symbol: 'BTCUSDT',
        description: '',
        timeLimit: 60,
        maxDrawdown: '',
        maxParticipants: 8,
        entryFee: '',
        prizePool: '',
        tournamentTier: 'SUPER 8'
    });

    const handleCreateTournament = async () => {
        // This will be handled by the TournamentDetails component
        // For now, just navigate to a new tournament creation flow
        navigate('/competition/tournaments/new');
    };

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        
        if (diffHours < 1) return 'Just now';
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    };

    // Determine tournament tier badge
    const getTournamentTier = (tournament: any) => {
        if (tournament.tournament_tier) {
            return tournament.tournament_tier;
        }
        // Fallback based on max_participants
        if (tournament.max_participants === 8) return 'SUPER 8';
        if (tournament.max_participants === 16) return 'SWEET 16';
        return 'ROYAL 8';
    };

    const getTierBadgeStyle = (tier: string) => {
        switch (tier) {
            case 'SUPER 8':
                return {
                    bg: 'bg-green-500/20',
                    border: 'border-green-500/50',
                    text: 'text-green-400',
                    icon: Trophy
                };
            case 'SWEET 16':
                return {
                    bg: 'bg-purple-500/20',
                    border: 'border-purple-500/50',
                    text: 'text-purple-400',
                    icon: Crown
                };
            case 'ROYAL 8':
                return {
                    bg: 'bg-orange-500/20',
                    border: 'border-orange-500/50',
                    text: 'text-orange-400',
                    icon: Crown
                };
            default:
                return {
                    bg: 'bg-[#6A3DF4]/20',
                    border: 'border-[#6A3DF4]/50',
                    text: 'text-[#6A3DF4]',
                    icon: Trophy
                };
        }
    };

    const TournamentCard = ({ tournament }: { tournament: any }) => {
        const tier = getTournamentTier(tournament);
        const badgeStyle = getTierBadgeStyle(tier);
        const BadgeIcon = badgeStyle.icon;
        const entryFee = tournament.entry_fee || 0;
        const prizePool = tournament.prize_pool || 0;
        const participantCount = tournament.participantCount || 0;
        const [joining, setJoining] = useState(false);

        const handleEnterTournament = async (e: React.MouseEvent) => {
            e.stopPropagation();
            if (!user) {
                alert('Please log in to join tournaments');
                return;
            }

            try {
                setJoining(true);
                const response = await fetch(buildApiUrl(`/api/competition/tournaments/${tournament.id}/join`), {
                    method: 'POST',
                    credentials: 'include'
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to join tournament');
                }

                // After joining, navigate to tournament details
                navigate(`/competition/tournaments/${tournament.id}`);
            } catch (error: any) {
                alert(error.message || 'Failed to join tournament');
            } finally {
                setJoining(false);
            }
        };

        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.03, y: -5 }}
                className="bg-[#0D0F18] border border-white/10 rounded-xl overflow-hidden hover:bg-white/5 transition-all flex flex-col h-full"
            >
                {/* Badge Header */}
                <div className={`${badgeStyle.bg} ${badgeStyle.border} border-b px-4 py-3 flex items-center justify-center gap-2`}>
                    <BadgeIcon className={`w-5 h-5 ${badgeStyle.text}`} />
                    <span className={`${badgeStyle.text} font-bold text-sm uppercase tracking-wider`}>{tier}</span>
                </div>

                {/* Visual Element / Icon */}
                <div className="flex items-center justify-center py-8 px-4">
                    <div className="bg-[#0D0F18] rounded-xl p-6 border border-white/5">
                        <TrendingUp className="w-12 h-12 text-[#6A3DF4]" />
                    </div>
                </div>

                {/* Title */}
                <div className="px-6 pb-4">
                    <h3 className="text-2xl font-bold text-white text-center mb-2">
                        {tournament.name || tournament.symbol}
                    </h3>
                    {tournament.status === 'completed' && (
                        <div className="text-center mb-2">
                            <span className="px-3 py-1 bg-gray-700/50 text-gray-400 text-xs rounded-lg">Completed</span>
                        </div>
                    )}
                </div>

                {/* Details Section */}
                <div className="px-6 pb-6 space-y-3 flex-1">
                    <div className="text-sm text-gray-400 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-green-400">Leverage</span>
                            <span className="text-white font-medium">10x</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Number of Players</span>
                            <span className="text-white font-medium">{tournament.max_participants || 8}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Time to Complete</span>
                            <span className="text-white font-medium">{tournament.time_limit}m</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Winner Takes</span>
                            <span className="text-[#6A3DF4] font-bold">
                                ${prizePool > 0 ? prizePool.toFixed(2) : '0.00'} USDT
                            </span>
                        </div>
                    </div>
                </div>

                {/* Entry Button */}
                <div className="px-6 pb-4">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleEnterTournament}
                        disabled={joining || tournament.status === 'completed'}
                        className="w-full bg-[#6A3DF4] hover:bg-[#8A5CFF] disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold text-sm transition-all shadow-lg hover:shadow-[0_4px_20px_rgba(106,61,244,0.4)]"
                    >
                        {joining ? 'Joining...' : tournament.status === 'completed' ? 'Completed' : `Enter for $${entryFee > 0 ? entryFee.toFixed(2) : '0.00'} USDT`}
                    </motion.button>
                </div>

                {/* Players Online */}
                <div className="px-6 pb-4 text-center">
                    <span className="text-xs text-gray-500">
                        {participantCount} player{participantCount !== 1 ? 's' : ''} online
                    </span>
                </div>
            </motion.div>
        );
    };

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
                                <h1 className="text-4xl font-bold mb-2">Tournaments</h1>
                                <p className="text-gray-400">
                                    Join tournaments and compete for prizes
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Seed Tournaments Button (Admin/Dev) */}
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleSeedTournaments}
                                disabled={seeding}
                                className="bg-[#1E2232] border border-white/10 hover:border-[#6A3DF4]/50 text-gray-400 hover:text-white px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {seeding ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-[#6A3DF4]/30 border-t-[#6A3DF4] rounded-full animate-spin" />
                                        <span>Creating...</span>
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4" />
                                        <span>Seed Tournaments</span>
                                    </>
                                )}
                            </motion.button>
                        </div>
                    </div>

                    {/* Seed Message */}
                    {seedMessage && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={`mb-4 p-4 rounded-xl border ${
                                seedMessage.includes('Successfully') 
                                    ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                            }`}
                        >
                            {seedMessage}
                        </motion.div>
                    )}

                    {/* Tabs */}
                    <div className="flex gap-4 mb-8 border-b border-white/10">
                        {[
                            { id: 'active', label: 'Active Tournaments', icon: Play },
                            { id: 'ready', label: 'Ready to Start', icon: Clock },
                            { id: 'completed', label: 'Completed Tournaments', icon: CheckCircle }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-6 py-3 border-b-2 transition-colors flex items-center gap-2 ${
                                    activeTab === tab.id
                                        ? 'border-[#6A3DF4] text-white'
                                        : 'border-transparent text-gray-400 hover:text-white'
                                }`}
                            >
                                <tab.icon className="w-5 h-5" />
                                <span className="font-medium">{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Tournament Lists */}
                    <AnimatePresence mode="wait">
                        {activeTab === 'active' && (
                            <motion.div
                                key="active"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                {activeLoading ? (
                                    <div className="text-center py-12">
                                        <div className="w-8 h-8 border-4 border-[#6A3DF4]/30 border-t-[#6A3DF4] rounded-full animate-spin mx-auto mb-3" />
                                        <p className="text-gray-400">Loading tournaments...</p>
                                    </div>
                                ) : activeTournaments.length === 0 ? (
                                    <div className="bg-[#0D0F18] border border-white/10 rounded-xl p-4 text-center">
                                        <p className="text-gray-400">No active tournaments at the moment.</p>
                                    </div>
                                ) : (
                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {activeTournaments.map((tournament) => (
                                            <TournamentCard key={tournament.id} tournament={tournament} />
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {activeTab === 'ready' && (
                            <motion.div
                                key="ready"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                {readyLoading ? (
                                    <div className="text-center py-12">
                                        <div className="w-8 h-8 border-4 border-[#6A3DF4]/30 border-t-[#6A3DF4] rounded-full animate-spin mx-auto mb-3" />
                                        <p className="text-gray-400">Loading tournaments...</p>
                                    </div>
                                ) : readyTournaments.length === 0 ? (
                                    <div className="bg-[#0D0F18] border border-white/10 rounded-xl p-4 text-center">
                                        <p className="text-gray-400">No tournaments ready to start.</p>
                                    </div>
                                ) : (
                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {readyTournaments.map((tournament) => (
                                            <TournamentCard key={tournament.id} tournament={tournament} />
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {activeTab === 'completed' && (
                            <motion.div
                                key="completed"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                {completedLoading ? (
                                    <div className="text-center py-12">
                                        <div className="w-8 h-8 border-4 border-[#6A3DF4]/30 border-t-[#6A3DF4] rounded-full animate-spin mx-auto mb-3" />
                                        <p className="text-gray-400">Loading tournaments...</p>
                                    </div>
                                ) : completedTournaments.length === 0 ? (
                                    <div className="bg-[#0D0F18] border border-white/10 rounded-xl p-4 text-center">
                                        <p className="text-gray-400">No completed tournaments yet.</p>
                                    </div>
                                ) : (
                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {completedTournaments.map((tournament) => (
                                            <TournamentCard key={tournament.id} tournament={tournament} />
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Create Tournament Modal */}
                    <AnimatePresence>
                        {showCreateModal && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                                onClick={() => setShowCreateModal(false)}
                            >
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.9, opacity: 0 }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-[#0D0F18] border border-white/10 rounded-xl p-4 max-w-md w-full"
                                >
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-2xl font-bold">Create Tournament</h2>
                                        <button
                                            onClick={() => setShowCreateModal(false)}
                                            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                                        >
                                            <X className="w-5 h-5 text-gray-400" />
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                                Tournament Name
                                            </label>
                                            <input
                                                type="text"
                                                value={createForm.name}
                                                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                                                className="w-full bg-[#0D0F18] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#6A3DF4]"
                                                placeholder="e.g., BTC Championship"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                                Symbol
                                            </label>
                                            <input
                                                type="text"
                                                value={createForm.symbol}
                                                onChange={(e) => setCreateForm({ ...createForm, symbol: e.target.value.toUpperCase() })}
                                                className="w-full bg-[#0D0F18] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#6A3DF4]"
                                                placeholder="BTCUSDT"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                                Description
                                            </label>
                                            <textarea
                                                value={createForm.description}
                                                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                                                className="w-full bg-[#0D0F18] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#6A3DF4]"
                                                rows={3}
                                                placeholder="Tournament description..."
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                                    Time Limit (min)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={createForm.timeLimit}
                                                    onChange={(e) => setCreateForm({ ...createForm, timeLimit: parseInt(e.target.value) || 60 })}
                                                    className="w-full bg-[#0D0F18] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#6A3DF4]"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                                    Max Participants
                                                </label>
                                                <input
                                                    type="number"
                                                    value={createForm.maxParticipants}
                                                    onChange={(e) => setCreateForm({ ...createForm, maxParticipants: parseInt(e.target.value) || 1000 })}
                                                    className="w-full bg-[#0D0F18] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#6A3DF4]"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 mt-6">
                                        <button
                                            onClick={async () => {
                                                try {
                                                    const result = await createTournament({
                                                        name: createForm.name || createForm.symbol,
                                                        symbol: createForm.symbol,
                                                        description: createForm.description,
                                                        timeLimit: createForm.timeLimit,
                                                        maxDrawdown: createForm.maxDrawdown ? parseFloat(createForm.maxDrawdown) : undefined,
                                                        maxParticipants: createForm.maxParticipants,
                                                        entryFee: createForm.entryFee ? parseFloat(createForm.entryFee) : undefined,
                                                        prizePool: createForm.prizePool ? parseFloat(createForm.prizePool) : undefined,
                                                        tournamentTier: createForm.tournamentTier
                                                    });
                                                    
                                                    setShowCreateModal(false);
                                                    setCreateForm({
                                                        name: '',
                                                        symbol: 'BTCUSDT',
                                                        description: '',
                                                        timeLimit: 60,
                                                        maxDrawdown: '',
                                                        maxParticipants: 8,
                                                        entryFee: '',
                                                        prizePool: '',
                                                        tournamentTier: 'SUPER 8'
                                                    });
                                                    
                                                    // Refresh tournament lists
                                                    refetchActive();
                                                    refetchReady();
                                                    refetchCompleted();
                                                    
                                                    // Navigate to new tournament
                                                    if (result.tournamentId) {
                                                        navigate(`/competition/tournaments/${result.tournamentId}`);
                                                    }
                                                } catch (error) {
                                                    console.error('Failed to create tournament:', error);
                                                    alert('Failed to create tournament. Please try again.');
                                                }
                                            }}
                                            className="flex-1 bg-gradient-to-r from-[#6A3DF4] to-[#8B5CF6] hover:from-[#5A2DE4] hover:to-[#7B4CE6] text-white py-3 rounded-lg font-bold transition-all"
                                        >
                                            Create
                                        </button>
                                        <button
                                            onClick={() => setShowCreateModal(false)}
                                            className="px-6 py-3 bg-[#0D0F18] border border-white/10 text-white rounded-lg font-medium transition-all"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </DashboardLayout>
    );
}

