import { motion } from 'framer-motion';

interface OnlinePlayersBadgeProps {
    count: number;
}

export default function OnlinePlayersBadge({ count }: OnlinePlayersBadgeProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#1E2232] border border-white/10 rounded-xl px-6 py-3 flex items-center gap-3"
        >
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-gray-300">
                {count} players online
            </span>
        </motion.div>
    );
}

