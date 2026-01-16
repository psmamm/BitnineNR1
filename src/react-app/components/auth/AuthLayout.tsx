import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AuthLayoutProps {
    children: ReactNode;
}

export const AuthLayout = ({ children }: AuthLayoutProps) => {
    return (
        <div className="min-h-screen bg-[#1B1B1D] flex flex-col items-center justify-center p-4 relative overflow-hidden font-inter">
            {/* Background Gradient Blobs - more subtle like dashboard */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#03AAC7]/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#03AAC7]/5 rounded-full blur-[120px]" />
            </div>

            {/* Header / Logo */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 z-10 text-center"
            >
                <Link to="/" className="flex items-center space-x-3 justify-center mb-4 group">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#03AAC7] shadow-lg shadow-[#03AAC7]/20 group-hover:shadow-[#03AAC7]/30 transition-shadow">
                        <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-2xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                        Tradecircle
                    </span>
                </Link>
            </motion.div>

            {/* Content */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="z-10 w-full flex justify-center"
            >
                {children}
            </motion.div>
        </div>
    );
};










