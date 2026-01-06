import { motion } from 'framer-motion';
import { Brain, TrendingUp, AlertTriangle, Users } from 'lucide-react';

interface AIReport {
  symbol: string;
  name: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number;
  summary: string;
  updatedAt: string;
}

// Mock data for AI reports
const mockReports: AIReport[] = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    sentiment: 'bullish',
    riskLevel: 'low',
    confidence: 85,
    summary: 'Strong technical indicators suggest continued upward momentum. High trading volume supports bullish trend.',
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    sentiment: 'bullish',
    riskLevel: 'medium',
    confidence: 78,
    summary: 'Positive market conditions with moderate risk. Network activity remains strong.',
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    sentiment: 'neutral',
    riskLevel: 'medium',
    confidence: 65,
    summary: 'Mixed signals detected. Monitor closely for trend confirmation.',
    updatedAt: new Date().toISOString(),
  },
];

export default function AISelectTab() {
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish':
        return 'text-[#2ECC71] bg-[#2ECC71]/10 border-[#2ECC71]/20';
      case 'bearish':
        return 'text-[#E74C3C] bg-[#E74C3C]/10 border-[#E74C3C]/20';
      default:
        return 'text-[#7F8C8D] bg-[#7F8C8D]/10 border-[#7F8C8D]/20';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'text-[#2ECC71]';
      case 'medium':
        return 'text-[#F39C12]';
      case 'high':
        return 'text-[#E74C3C]';
      default:
        return 'text-[#7F8C8D]';
    }
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
            <Brain className="w-6 h-6 text-[#6A3DF4]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">AI Select</h2>
            <p className="text-sm text-[#7F8C8D]">AI-generated token insights and market analysis</p>
          </div>
        </div>

        <div className="space-y-4">
          {mockReports.map((report, index) => (
            <motion.div
              key={report.symbol}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-[#0D0F18]/50 rounded-xl p-5 border border-white/10 hover:border-[#6A3DF4]/30 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-bold text-white">{report.symbol}</h3>
                    <span className="text-sm text-[#7F8C8D]">{report.name}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${getSentimentColor(report.sentiment)}`}>
                      {report.sentiment.toUpperCase()}
                    </span>
                    <span className={`text-xs font-medium ${getRiskColor(report.riskLevel)}`}>
                      Risk: {report.riskLevel.toUpperCase()}
                    </span>
                    <span className="text-xs text-[#7F8C8D]">
                      Confidence: {report.confidence}%
                    </span>
                  </div>
                </div>
                <div className="text-xs text-[#7F8C8D]">
                  Updated {new Date(report.updatedAt).toLocaleTimeString()}
                </div>
              </div>

              <p className="text-sm text-[#AAB0C0] leading-relaxed">{report.summary}</p>

              <div className="mt-4 pt-4 border-t border-white/10 flex items-center space-x-4 text-xs text-[#7F8C8D]">
                <div className="flex items-center space-x-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>Market Conditions</span>
                </div>
                <div className="flex items-center space-x-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Risk Assessment</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="w-3 h-3" />
                  <span>Community Sentiment</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-[#0D0F18]/30 rounded-xl border border-white/10">
          <p className="text-sm text-[#7F8C8D]">
            AI reports are updated hourly. This feature uses advanced machine learning models to analyze market data,
            technical indicators, and community sentiment.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
