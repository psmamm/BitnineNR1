import { useState } from 'react';
import { useNavigate } from 'react-router';
import DashboardLayout from '@/react-app/components/DashboardLayout';
import { useTournaments, useTournament } from '@/react-app/hooks/useTournaments';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Plus, Play, Clock, CheckCircle, Users, Calendar, ArrowRight, X } from 'lucide-react';
import { useAuth } from '@/react-app/contexts/AuthContext';

export default function TournamentsPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'active' | 'ready' | 'completed'>('active');
    
    const { tournaments: activeTournaments, loading: activeLoading, refetch: refetchActive } = useTournaments('active');
    const { tournaments: readyTournaments, loading: readyLoading, refetch: refetchReady } = useTournaments('ready');
    const { tournaments: completedTournaments, loading: completedLoading, refetch: refetchCompleted } = useTournaments('completed');
    const { createTournament } = useTournament(null);

    const [createForm, setCreateForm] = useState({
        name: '',
        symbol: 'BTCUSDT',
        description: '',
        timeLimit: 60,
        maxDrawdown: '',
        maxParticipants: 1000
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

    const TournamentCard = ({ tournament }: { tournament: any }) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => navigate(`/competition/tournaments/${tournament.id}`)}
            className="bg-[#1E2232] border border-white/10 rounded-xl p-6 cursor-pointer hover:border-[#6A3DF4]/50 transition-all"
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-2xl font-bold text-[#6A3DF4]">{tournament.symbol}</h3>
                        {tournament.status === 'completed' && (
                            <span className="px-2 py-1 bg-gray-700/50 text-gray-400 text-xs rounded-lg">Completed</span>
                        )}
                    </div>
                    <p className="text-gray-400 text-sm mb-4">{tournament.description || tournament.name}</p>
                </div>
            </div>

            <div className="space-y-2 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{tournament.participantCount || 0} participants</span>
                </div>
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>Time Limit: {tournament.time_limit}m</span>
                </div>
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>created {formatTimeAgo(tournament.created_at)}</span>
                </div>
            </div>

            <button className="mt-4 w-full bg-[#0D0F18] hover:bg-[#0D0F18]/80 border border-white/10 text-white py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2">
                View Results
                <ArrowRight className="w-4 h-4" />
            </button>
        </motion.div>
    );

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
                                    {activeTournaments.length + readyTournaments.length + completedTournaments.length} tournaments
                                </p>
                            </div>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowCreateModal(true)}
                            className="bg-gradient-to-r from-[#6A3DF4] to-[#8B5CF6] hover:from-[#5A2DE4] hover:to-[#7B4CE6] text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            Create Tournament
                        </motion.button>
                    </div>

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
                                    <div className="bg-[#1E2232] border border-white/10 rounded-xl p-12 text-center">
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
                                    <div className="bg-[#1E2232] border border-white/10 rounded-xl p-12 text-center">
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
                                    <div className="bg-[#1E2232] border border-white/10 rounded-xl p-12 text-center">
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
                                    className="bg-[#1E2232] border border-white/10 rounded-2xl p-8 max-w-md w-full"
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
                                                        maxParticipants: createForm.maxParticipants
                                                    });
                                                    
                                                    setShowCreateModal(false);
                                                    setCreateForm({
                                                        name: '',
                                                        symbol: 'BTCUSDT',
                                                        description: '',
                                                        timeLimit: 60,
                                                        maxDrawdown: '',
                                                        maxParticipants: 1000
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

