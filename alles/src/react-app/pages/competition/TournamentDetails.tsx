import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import DashboardLayout from '@/react-app/components/DashboardLayout';
import { useTournament } from '@/react-app/hooks/useTournaments';
import { useAuth } from '@/react-app/contexts/AuthContext';
import { motion } from 'framer-motion';
import { 
    Trophy, ArrowLeft, Users, Clock, Calendar, User, DollarSign, 
    TrendingDown, Send, CheckCircle, MessageSquare, TrendingUp 
} from 'lucide-react';

export default function TournamentDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const tournamentId = id ? parseInt(id) : null;
    const { tournament, participants, chatMessages, joined, joinTournament, sendChatMessage, loading } = useTournament(tournamentId);
    const [chatInput, setChatInput] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages]);

    const handleSendMessage = async () => {
        if (!chatInput.trim()) return;
        
        try {
            await sendChatMessage(chatInput);
            setChatInput('');
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };

    const handleJoin = async () => {
        try {
            await joinTournament();
        } catch (error) {
            console.error('Failed to join tournament:', error);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="min-h-screen bg-[#0D0F18] flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-[#6A3DF4]/30 border-t-[#6A3DF4] rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-gray-400">Loading tournament...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!tournament) {
        return (
            <DashboardLayout>
                <div className="min-h-screen bg-[#0D0F18] flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-gray-400 mb-4">Tournament not found</p>
                        <button
                            onClick={() => navigate('/competition/tournaments')}
                            className="text-[#6A3DF4] hover:text-[#8B5CF6]"
                        >
                            Back to Tournaments
                        </button>
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
                    <div className="flex items-center gap-4 mb-8">
                        <button
                            onClick={() => navigate('/competition/tournaments')}
                            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-400" />
                        </button>
                        <div className="bg-[#6A3DF4]/20 p-3 rounded-xl">
                            <Trophy className="w-8 h-8 text-[#6A3DF4]" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-bold">{tournament.name || tournament.symbol}</h1>
                                {tournament.status === 'completed' && (
                                    <span className="px-3 py-1 bg-gray-700/50 text-gray-400 text-sm rounded-lg">Completed</span>
                                )}
                            </div>
                            <p className="text-gray-400 mt-1">{tournament.description || tournament.symbol}</p>
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Tournament Details Cards */}
                            <div className="bg-[#1E2232] border border-white/10 rounded-2xl p-6">
                                <h2 className="text-xl font-bold mb-4">Tournament Details</h2>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div className="bg-[#0D0F18] rounded-xl p-4 border border-white/5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <TrendingDown className="w-4 h-4 text-red-400" />
                                            <span className="text-xs text-gray-400">Drawdown</span>
                                        </div>
                                        <div className="text-lg font-bold">
                                            {tournament.max_drawdown ? `$${tournament.max_drawdown.toLocaleString()}` : 'No limit'}
                                        </div>
                                    </div>

                                    <div className="bg-[#0D0F18] rounded-xl p-4 border border-white/5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <TrendingUp className="w-4 h-4 text-blue-400" />
                                            <span className="text-xs text-gray-400">Symbol</span>
                                        </div>
                                        <div className="text-lg font-bold">{tournament.symbol}</div>
                                    </div>

                                    <div className="bg-[#0D0F18] rounded-xl p-4 border border-white/5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Users className="w-4 h-4 text-purple-400" />
                                            <span className="text-xs text-gray-400">Participants</span>
                                        </div>
                                        <div className="text-lg font-bold">
                                            {tournament.participantCount || 0} / {tournament.max_participants}
                                        </div>
                                        <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2">
                                            <div
                                                className="bg-[#6A3DF4] h-1.5 rounded-full"
                                                style={{ width: `${((tournament.participantCount || 0) / tournament.max_participants) * 100}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-[#0D0F18] rounded-xl p-4 border border-white/5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Clock className="w-4 h-4 text-yellow-400" />
                                            <span className="text-xs text-gray-400">Time Limit</span>
                                        </div>
                                        <div className="text-lg font-bold">{tournament.time_limit} minutes</div>
                                    </div>

                                    <div className="bg-[#0D0F18] rounded-xl p-4 border border-white/5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <User className="w-4 h-4 text-green-400" />
                                            <span className="text-xs text-gray-400">Creator</span>
                                        </div>
                                        <div className="text-lg font-bold">Creator</div>
                                    </div>

                                    <div className="bg-[#0D0F18] rounded-xl p-4 border border-white/5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <DollarSign className="w-4 h-4 text-green-400" />
                                            <span className="text-xs text-gray-400">Balance</span>
                                        </div>
                                        <div className="text-lg font-bold">$100,000</div>
                                    </div>
                                </div>
                            </div>

                            {/* Leaderboard */}
                            <div className="bg-[#1E2232] border border-white/10 rounded-2xl overflow-hidden">
                                <div className="p-6 border-b border-white/10">
                                    <h2 className="text-xl font-bold">Leaderboard</h2>
                                    <p className="text-sm text-gray-400 mt-1">{participants.length} traders</p>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-[#0D0F18] border-b border-white/10">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">#</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Trader</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Balance</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">P/L</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Trades</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {participants.map((participant, idx) => {
                                                const rank = idx + 1;
                                                const rankColor = rank === 1 ? 'text-yellow-500' : 
                                                                rank === 2 ? 'text-gray-400' : 
                                                                rank === 3 ? 'text-orange-600' : 'text-blue-500';

                                                return (
                                                    <motion.tr
                                                        key={participant.id}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: idx * 0.05 }}
                                                        className="hover:bg-white/5 transition-colors"
                                                    >
                                                        <td className="px-6 py-4">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${rankColor} bg-${rankColor.replace('text-', '')}/10`}>
                                                                {rank}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 bg-[#6A3DF4]/20 rounded-full flex items-center justify-center">
                                                                    {participant.username.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <div className="font-medium">{participant.username}</div>
                                                                    {participant.elo && (
                                                                        <div className="text-xs text-gray-400">{participant.elo}</div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="font-medium">
                                                                ${participant.final_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div>
                                                                <span className={`font-bold ${participant.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                                    {participant.pnl >= 0 ? '+' : ''}${participant.pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                </span>
                                                                <div className={`text-xs ${participant.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                                    {((participant.pnl / 100000) * 100).toFixed(2)}%
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="text-gray-300">
                                                                {participant.total_trades} trades ({Math.round(participant.win_rate * participant.total_trades)}W/{Math.round((1 - participant.win_rate) * participant.total_trades)}L)
                                                            </span>
                                                        </td>
                                                    </motion.tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Tournament Status */}
                            <div className="bg-[#1E2232] border border-white/10 rounded-2xl p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <CheckCircle className="w-5 h-5 text-gray-400" />
                                    <h3 className="font-bold">Tournament {tournament.status === 'completed' ? 'Ended' : 'Status'}</h3>
                                </div>
                                {tournament.status === 'completed' ? (
                                    <button className="w-full bg-gray-700/50 text-gray-400 py-3 rounded-lg font-medium">
                                        Tournament Ended
                                    </button>
                                ) : !joined ? (
                                    <button
                                        onClick={handleJoin}
                                        className="w-full bg-gradient-to-r from-[#6A3DF4] to-[#8B5CF6] hover:from-[#5A2DE4] hover:to-[#7B4CE6] text-white py-3 rounded-lg font-bold transition-all"
                                    >
                                        Join Tournament
                                    </button>
                                ) : (
                                    <button className="w-full bg-green-500/20 text-green-400 py-3 rounded-lg font-medium border border-green-500/30">
                                        Joined
                                    </button>
                                )}
                            </div>

                            {/* Tournament Chat */}
                            <div className="bg-[#1E2232] border border-white/10 rounded-2xl flex flex-col h-[600px]">
                                <div className="p-4 border-b border-white/10 flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5 text-[#6A3DF4]" />
                                    <h3 className="font-bold">Tournament Chat</h3>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                    {chatMessages.length === 0 ? (
                                        <div className="text-center text-gray-400 py-8">
                                            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                            <p>No messages yet</p>
                                        </div>
                                    ) : (
                                        chatMessages.map((message) => {
                                            const isOwn = message.user_id === (user?.google_user_data?.sub || (user as any)?.firebase_user_id);
                                            
                                            return (
                                                <div
                                                    key={message.id}
                                                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                                                >
                                                    <div className={`max-w-[80%] ${isOwn ? 'bg-[#6A3DF4]/20' : 'bg-[#0D0F18]'} rounded-lg p-3`}>
                                                        <div className="text-xs text-gray-400 mb-1">{message.username}</div>
                                                        <div className="text-sm">{message.message}</div>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            {new Date(message.created_at).toLocaleTimeString()}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                    <div ref={chatEndRef} />
                                </div>

                                <div className="p-4 border-t border-white/10">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={chatInput}
                                            onChange={(e) => setChatInput(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                            placeholder="Type your message..."
                                            className="flex-1 bg-[#0D0F18] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#6A3DF4]"
                                        />
                                        <button
                                            onClick={handleSendMessage}
                                            disabled={!chatInput.trim()}
                                            className="bg-[#6A3DF4] hover:bg-[#8B5CF6] disabled:bg-[#6A3DF4]/50 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-all"
                                        >
                                            <Send className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

