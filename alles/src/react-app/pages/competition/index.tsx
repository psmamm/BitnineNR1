import { useState } from 'react';
import { useNavigate } from 'react-router';
import DashboardLayout from '@/react-app/components/DashboardLayout';
import { useMatchmaking } from '@/react-app/hooks/useMatchmaking';
import { useELO } from '@/react-app/hooks/useELO';
import { useFriends } from '@/react-app/hooks/useFriends';
import { motion } from 'framer-motion';
import { Trophy, Users, Check, Medal, User, ArrowRight, Link as LinkIcon, UserPlus, Zap, Crown } from 'lucide-react';
import { useAuth } from '@/react-app/contexts/AuthContext';
import { getDivisionColor } from '@/react-app/hooks/useELO';

export default function CompetitionPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { onlineCount, joinQueue } = useMatchmaking();
    const { eloData } = useELO();
    const { friends, loading: friendsLoading } = useFriends();
    const [copied, setCopied] = useState(false);
    const [matchmaking, setMatchmaking] = useState(false);

    const handleRankedMatch = async () => {
        if (!user) {
            alert('Please log in to join ranked matches');
            return;
        }

        try {
            setMatchmaking(true);
            const result = await joinQueue('ranked', 'BTCUSDT');

            if (result.matchFound && result.matchId) {
                navigate(`/competition/play?matchId=${result.matchId}&type=ranked`);
            } else {
                navigate('/competition/matchmaking?type=ranked');
            }
        } catch (error: any) {
            console.error('Failed to join ranked match:', error);
            setMatchmaking(false);
            const errorMessage = error?.message || 'Failed to join ranked match. Please try again.';
            alert(errorMessage);
        }
    };

    const handlePracticeMode = () => {
        navigate('/competition/play?type=practice');
    };

    const handleCopyInviteLink = () => {
        const userId = user?.uid || 'anonymous';
        const inviteLink = `${window.location.origin}/competition?ref=${userId}`;
        navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const divisionColor = eloData ? getDivisionColor(eloData.division) : '#6A3DF4';

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-[#0D0F18] text-white p-8">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-[#6A3DF4] to-[#8B5CF6] bg-clip-text text-transparent">
                            Choose Game Mode
                        </h1>
                        <p className="text-gray-400 text-lg">Compete against traders worldwide or practice your skills</p>
                    </div>

                    {/* Online Players Badge */}
                    <div className="flex justify-center mb-8">
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-[#1E2232] border border-white/10 rounded-xl px-6 py-3 flex items-center gap-3"
                        >
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-sm font-medium text-gray-300">
                                {onlineCount} players online
                            </span>
                        </motion.div>
                    </div>

                    {/* Game Mode Cards */}
                    <div className="grid md:grid-cols-2 gap-6 mb-8">
                        {/* Ranked Match Card */}
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-[#1E2232] border-2 border-white/10 rounded-2xl p-8 hover:border-[#6A3DF4]/50 transition-all cursor-pointer group"
                            onClick={handleRankedMatch}
                        >
                            <div className="flex items-start justify-between mb-6">
                                <div className="bg-[#6A3DF4]/20 p-4 rounded-xl">
                                    <Medal className="w-8 h-8 text-[#6A3DF4]" />
                                </div>
                                <div className="flex items-center gap-2 text-sm text-green-400">
                                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                    <span>Online</span>
                                </div>
                            </div>

                            <h2 className="text-2xl font-bold mb-3">Ranked Match</h2>
                            {matchmaking ? (
                                <p className="text-[#6A3DF4] animate-pulse mb-6">Searching for opponent...</p>
                            ) : (
                                <p className="text-gray-400 mb-6">Compete for ranking points</p>
                            )}

                            {eloData && (
                                <div className="mb-6 p-4 bg-[#0D0F18] rounded-xl border border-white/5">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-xs text-gray-500 mb-1">Your ELO</div>
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="text-2xl font-bold"
                                                    style={{ color: divisionColor }}
                                                >
                                                    {eloData.elo}
                                                </span>
                                                <span
                                                    className="text-sm px-2 py-1 rounded"
                                                    style={{
                                                        backgroundColor: `${divisionColor}20`,
                                                        color: divisionColor
                                                    }}
                                                >
                                                    {eloData.division}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs text-gray-500 mb-1">Record</div>
                                            <div className="text-sm font-medium">
                                                {eloData.wins}W / {eloData.losses}L
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-400">{matchmaking ? 'Please wait...' : 'Win to gain ELO'}</span>
                                <ArrowRight className={`w-5 h-5 text-[#6A3DF4] transition-all ${matchmaking ? 'opacity-0' : 'group-hover:translate-x-1'}`} />
                            </div>
                        </motion.div>

                        {/* Practice Mode Card */}
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-[#1E2232] border-2 border-white/10 rounded-2xl p-8 hover:border-[#6A3DF4]/50 transition-all cursor-pointer group"
                            onClick={handlePracticeMode}
                        >
                            <div className="bg-[#6A3DF4]/20 p-4 rounded-xl w-fit mb-6">
                                <User className="w-8 h-8 text-[#6A3DF4]" />
                            </div>

                            <h2 className="text-2xl font-bold mb-3">Practice Mode</h2>
                            <p className="text-gray-400 mb-6">Play solo to improve your skills</p>

                            <div className="mb-6 p-4 bg-[#0D0F18] rounded-xl border border-white/5">
                                <div className="text-sm text-gray-400 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-green-400" />
                                        <span>No ELO changes</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-green-400" />
                                        <span>Unlimited practice</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-green-400" />
                                        <span>Learn at your pace</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-400">Perfect for beginners</span>
                                <ArrowRight className="w-5 h-5 text-[#6A3DF4] group-hover:translate-x-1 transition-transform" />
                            </div>
                        </motion.div>
                    </div>

                    {/* Copy Invite Link */}
                    <div className="flex justify-center mb-8">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleCopyInviteLink}
                            className="bg-[#1E2232] border border-white/10 hover:border-[#6A3DF4]/50 rounded-xl px-6 py-3 flex items-center gap-3 transition-all"
                        >
                            {copied ? (
                                <>
                                    <Check className="w-5 h-5 text-green-400" />
                                    <span className="text-sm font-medium text-green-400">Link Copied!</span>
                                </>
                            ) : (
                                <>
                                    <LinkIcon className="w-5 h-5 text-gray-400" />
                                    <span className="text-sm font-medium text-gray-300">Copy Invite Link</span>
                                </>
                            )}
                        </motion.button>
                    </div>

                    {/* Friends Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-[#1E2232] border border-white/10 rounded-2xl p-8"
                    >
                        {friendsLoading ? (
                            <div className="text-center py-8">
                                <div className="w-8 h-8 border-4 border-[#6A3DF4]/30 border-t-[#6A3DF4] rounded-full animate-spin mx-auto mb-3" />
                                <p className="text-gray-400 text-sm">Loading friends...</p>
                            </div>
                        ) : friends.length === 0 ? (
                            <div className="text-center">
                                <div className="bg-[#6A3DF4]/20 p-4 rounded-xl w-fit mx-auto mb-4">
                                    <Users className="w-8 h-8 text-[#6A3DF4]" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">No friends yet</h3>
                                <p className="text-gray-400 text-sm mb-4">Add friends to challenge them!</p>
                                <button
                                    onClick={handleCopyInviteLink}
                                    className="text-[#6A3DF4] hover:text-[#8B5CF6] text-sm font-medium transition-colors flex items-center gap-2 mx-auto"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    Invite Friends
                                </button>
                            </div>
                        ) : (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-bold">Friends</h3>
                                    <span className="text-sm text-gray-400">{friends.length} friends</span>
                                </div>
                                <div className="space-y-2">
                                    {friends.slice(0, 5).map((friend) => (
                                        <div
                                            key={friend.id}
                                            className="flex items-center justify-between p-3 bg-[#0D0F18] rounded-lg hover:bg-[#0D0F18]/80 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-[#6A3DF4]/20 rounded-full flex items-center justify-center">
                                                    {friend.username?.charAt(0).toUpperCase() || '👤'}
                                                </div>
                                                <span className="font-medium">{friend.username || 'Friend'}</span>
                                            </div>
                                            <button className="text-[#6A3DF4] hover:text-[#8B5CF6] text-sm font-medium transition-colors">
                                                Challenge
                                            </button>
                                        </div>
                                    ))}
                                    {friends.length > 5 && (
                                        <p className="text-center text-sm text-gray-400 mt-2">
                                            +{friends.length - 5} more friends
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </motion.div>

                    {/* Redesigned Navigation Links */}
                    <div className="flex flex-wrap justify-center gap-4 mt-12">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate('/competition/daily-challenge')}
                            className="flex items-center gap-3 px-6 py-4 bg-[#1E2232] border border-white/10 hover:border-[#6A3DF4]/50 rounded-2xl group transition-all min-w-[200px]"
                        >
                            <div className="p-2 bg-yellow-500/10 rounded-lg group-hover:bg-yellow-500/20 transition-colors">
                                <Zap className="w-5 h-5 text-yellow-500" />
                            </div>
                            <div className="text-left">
                                <span className="block text-white font-semibold text-sm">Daily Challenge</span>
                                <span className="block text-[#7F8C8D] text-xs mt-0.5">Earn quick rewards</span>
                            </div>
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate('/competition/tournaments')}
                            className="flex items-center gap-3 px-6 py-4 bg-[#1E2232] border border-white/10 hover:border-[#6A3DF4]/50 rounded-2xl group transition-all min-w-[200px]"
                        >
                            <div className="p-2 bg-[#6A3DF4]/10 rounded-lg group-hover:bg-[#6A3DF4]/20 transition-colors">
                                <Trophy className="w-5 h-5 text-[#6A3DF4]" />
                            </div>
                            <div className="text-left">
                                <span className="block text-white font-semibold text-sm">Tournaments</span>
                                <span className="block text-[#7F8C8D] text-xs mt-0.5">Compete for prizes</span>
                            </div>
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate('/competition/leaderboard')}
                            className="flex items-center gap-3 px-6 py-4 bg-[#1E2232] border border-white/10 hover:border-[#6A3DF4]/50 rounded-2xl group transition-all min-w-[200px]"
                        >
                            <div className="p-2 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                                <Crown className="w-5 h-5 text-purple-500" />
                            </div>
                            <div className="text-left">
                                <span className="block text-white font-semibold text-sm">Leaderboard</span>
                                <span className="block text-[#7F8C8D] text-xs mt-0.5">Global rankings</span>
                            </div>
                        </motion.button>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
