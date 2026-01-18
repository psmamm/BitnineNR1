import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import DashboardLayout from '@/react-app/components/DashboardLayout';
import { useMatchmaking } from '@/react-app/hooks/useMatchmaking';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gamepad2, Zap, RotateCcw } from 'lucide-react';
import { buildApiUrl } from '@/react-app/hooks/useApi';

export default function MatchmakingPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const matchType = searchParams.get('type') || 'ranked';
    const { status, cancelQueue, refetchStatus } = useMatchmaking();
    const [elapsed, setElapsed] = useState(0);
    const [matchFound, setMatchFound] = useState(false);
    const wasInQueueRef = useRef(false);
    const cancelledRef = useRef(false);

    useEffect(() => {
        if (!status?.inQueue) {
            // Check if we got a match
            refetchStatus();
        }
    }, [status, refetchStatus]);

    useEffect(() => {
        if (status?.inQueue) {
            wasInQueueRef.current = true;
            cancelledRef.current = false;
            setElapsed(status.elapsed || 0);
            const interval = setInterval(() => {
                setElapsed(prev => prev + 1);
            }, 1000);

            return () => clearInterval(interval);
        } else if (wasInQueueRef.current && !status?.inQueue && !cancelledRef.current) {
            // User was in queue but is no longer - check if match was found
            const checkForMatch = async () => {
                try {
                    // Check if user has an active match by querying matches endpoint
                    const response = await fetch(buildApiUrl('/api/competition/matches'), {
                        credentials: 'include'
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        // If user has an active match, navigate to it
                        if (data.matches && Array.isArray(data.matches) && data.matches.length > 0) {
                            interface Match {
                                id: number;
                                status: string;
                            }
                            const activeMatch = data.matches.find((m: Match) => m.status === 'active');
                            if (activeMatch) {
                                setMatchFound(true);
                                setTimeout(() => {
                                    navigate(`/competition/matches/${activeMatch.id}`);
                                }, 2000);
                                return;
                            }
                        }
                    }
                    
                    // If no active match found, assume match was found and navigate to competition
                    // The competition page will show active matches if any exist
                    setMatchFound(true);
                    setTimeout(() => {
                        navigate('/competition');
                    }, 2000);
                } catch (error) {
                    console.error('Error checking for match:', error);
                    // On error, still navigate to competition page
                    setMatchFound(true);
                    setTimeout(() => {
                        navigate('/competition');
                    }, 2000);
                }
            };
            checkForMatch();
        }
    }, [status, navigate]);

    const handleCancel = async () => {
        cancelledRef.current = true;
        await cancelQueue();
        navigate('/competition');
    };

    const formatTime = (seconds: number) => {
        return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
    };

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-[#1B1B1D] flex items-center justify-center p-8">
                <div className="max-w-md w-full">
                    <AnimatePresence mode="wait">
                        {matchFound ? (
                            <motion.div
                                key="match-found"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-[#1B1B1D] border border-[#2B2F36] rounded-2xl p-8 text-center"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.2, type: "spring" }}
                                    className="bg-[#FCD535]/20 p-6 rounded-full w-fit mx-auto mb-6"
                                >
                                    <Gamepad2 className="w-12 h-12 text-[#FCD535]" />
                                </motion.div>
                                <h2 className="text-3xl font-bold mb-2 text-[#FCD535]">Match Found!</h2>
                                <p className="text-gray-400 mb-6">Loading match, please wait...</p>
                                <div className="flex justify-center">
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    >
                                        <Zap className="w-6 h-6 text-[#FCD535]" />
                                    </motion.div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="matchmaking"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-[#1B1B1D] border border-[#2B2F36] rounded-2xl p-8"
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-2xl font-bold">Matchmaking</h2>
                                    <button
                                        onClick={handleCancel}
                                        className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5 text-gray-400" />
                                    </button>
                                </div>

                                <div className="bg-[#F43F5E]/10 border border-[#F43F5E]/20 rounded-xl p-6 mb-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <X className="w-5 h-5 text-[#F43F5E]" />
                                            <span className="text-[#F43F5E] font-semibold">Cancel Matchmaking</span>
                                        </div>
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                        >
                                            <RotateCcw className="w-5 h-5 text-[#F43F5E]" />
                                        </motion.div>
                                    </div>
                                    <div className="text-sm text-gray-300">
                                        <div className="mb-2">
                                            Searching... {formatTime(elapsed)} elapsed
                                        </div>
                                        <div className="text-gray-500">
                                            (est. {status?.estimated || 35}s)
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-400">Match Type:</span>
                                        <span className="text-white font-medium capitalize">{matchType}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-400">Symbol:</span>
                                        <span className="text-white font-medium">{status?.symbol || 'BTCUSDT'}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleCancel}
                                    className="w-full mt-6 bg-[#F43F5E]/20 hover:bg-[#F43F5E]/30 border border-[#F43F5E]/40 text-[#F43F5E] py-3 rounded-xl font-medium transition-all"
                                >
                                    Cancel
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </DashboardLayout>
    );
}










