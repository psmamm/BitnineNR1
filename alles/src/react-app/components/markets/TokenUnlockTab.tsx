import { motion } from 'framer-motion';
import { Calendar, TrendingDown, Clock } from 'lucide-react';

interface TokenUnlock {
  symbol: string;
  name: string;
  unlockDate: string;
  unlockAmount: number;
  totalSupply: number;
  impact: 'low' | 'medium' | 'high';
}

// Mock data for token unlocks
const mockUnlocks: TokenUnlock[] = [
  {
    symbol: 'APT',
    name: 'Aptos',
    unlockDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    unlockAmount: 10000000,
    totalSupply: 1000000000,
    impact: 'medium',
  },
  {
    symbol: 'SUI',
    name: 'Sui',
    unlockDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    unlockAmount: 5000000,
    totalSupply: 10000000000,
    impact: 'low',
  },
  {
    symbol: 'ARB',
    name: 'Arbitrum',
    unlockDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    unlockAmount: 50000000,
    totalSupply: 10000000000,
    impact: 'high',
  },
];

export default function TokenUnlockTab() {
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'low':
        return 'text-[#2ECC71] bg-[#2ECC71]/10';
      case 'medium':
        return 'text-[#F39C12] bg-[#F39C12]/10';
      case 'high':
        return 'text-[#E74C3C] bg-[#E74C3C]/10';
      default:
        return 'text-[#7F8C8D] bg-[#7F8C8D]/10';
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatNumber = (num: number): string => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toLocaleString();
  };

  const getDaysUntil = (dateString: string): number => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-[#1E2232] rounded-2xl p-6 border border-white/5">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-[#6A3DF4]/10 rounded-xl flex items-center justify-center">
            <Calendar className="w-6 h-6 text-[#6A3DF4]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Token Unlock Schedule</h2>
            <p className="text-sm text-[#7F8C8D]">Upcoming token unlocks and their potential market impact</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0D0F18]/30 border-b border-white/10">
              <tr className="text-sm font-medium text-[#7F8C8D]">
                <th className="text-left py-4 px-4">Token</th>
                <th className="text-left py-4 px-4">Unlock Date</th>
                <th className="text-right py-4 px-4">Unlock Amount</th>
                <th className="text-right py-4 px-4">% of Supply</th>
                <th className="text-center py-4 px-4">Impact</th>
                <th className="text-center py-4 px-4">Days Until</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {mockUnlocks.map((unlock, index) => (
                <motion.tr
                  key={unlock.symbol}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="hover:bg-[#0D0F18]/30 transition-colors"
                >
                  <td className="py-4 px-4">
                    <div>
                      <div className="font-semibold text-white">{unlock.symbol}</div>
                      <div className="text-xs text-[#7F8C8D]">{unlock.name}</div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-[#7F8C8D]" />
                      <span className="text-white text-sm">{formatDate(unlock.unlockDate)}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="text-white font-medium">{formatNumber(unlock.unlockAmount)}</span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="text-[#AAB0C0]">
                      {((unlock.unlockAmount / unlock.totalSupply) * 100).toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getImpactColor(unlock.impact)}`}>
                      {unlock.impact.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <Clock className="w-4 h-4 text-[#7F8C8D]" />
                      <span className="text-white text-sm">{getDaysUntil(unlock.unlockDate)} days</span>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 p-4 bg-[#0D0F18]/30 rounded-xl border border-white/10">
          <p className="text-sm text-[#7F8C8D]">
            Token unlock schedules can significantly impact token prices. High-impact unlocks may cause increased
            selling pressure. Monitor these events closely.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
