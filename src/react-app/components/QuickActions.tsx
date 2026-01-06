import { Plus, Download, TrendingUp, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { useDataExport } from '@/react-app/hooks/useDataExport';
import { useTrades } from '@/react-app/hooks/useTrades';
import { useState } from 'react';
import { TradeImportWizard } from '@/react-app/components/wizards/TradeImportWizard';
import { useTheme } from '../contexts/ThemeContext';
import { getCardBg, getCardBorder, getTextColor, getHoverBg } from '../utils/themeUtils';

export default function QuickActions() {
  const navigate = useNavigate();
  const { exportData, exporting } = useDataExport();
  const { trades } = useTrades(10);
  const [showWizard, setShowWizard] = useState(false);
  const { theme } = useTheme();

  const handleExport = async () => {
    try {
      await exportData({
        includeTrades: true,
        includeStrategies: true,
        includeSettings: false,
        format: 'csv'
      });
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const openTrades = trades.filter(t => !t.is_closed).length;
  const hasRecentTrades = trades.length > 0;

  const actions = [
    {
      title: 'Add Trade',
      description: 'Record a new trade',
      icon: Plus,
      onClick: () => setShowWizard(true),
      color: 'bg-gradient-to-r from-[#6A3DF4] to-[#8A5CFF] hover:from-[#7B47FF] hover:to-[#9B6AFF]',
      badge: null,
    },
    {
      title: 'View Journal',
      description: `${openTrades} open position${openTrades !== 1 ? 's' : ''}`,
      icon: BookOpen,
      onClick: () => navigate('/journal'),
      color: 'bg-gradient-to-r from-[#2ECC71] to-[#27AE60] hover:from-[#2ECC71] hover:to-[#229954]',
      badge: openTrades > 0 ? openTrades.toString() : null,
    },
    {
      title: 'Performance',
      description: 'Analyze your results',
      icon: TrendingUp,
      onClick: () => navigate('/reports'),
      color: 'bg-gradient-to-r from-[#3498DB] to-[#2980B9] hover:from-[#3498DB] hover:to-[#2471A3]',
      badge: hasRecentTrades ? 'NEW' : null,
    },
    {
      title: 'Export Data',
      description: exporting ? 'Exporting...' : 'Download CSV/JSON',
      icon: Download,
      onClick: handleExport,
      color: 'bg-gradient-to-r from-[#F39C12] to-[#E67E22] hover:from-[#F39C12] hover:to-[#D35400]',
      badge: null,
      disabled: exporting,
    },
  ];

  return (
    <>
      <div className={`${getCardBg(theme)} rounded-xl p-4 border ${getCardBorder(theme)} h-full`}>
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-[#6A3DF4]/10 rounded-xl flex items-center justify-center">
            <Plus className="w-5 h-5 text-[#6A3DF4]" />
          </div>
          <div>
            <h2 className={`text-xl font-semibold ${getTextColor(theme, 'primary')}`}>Quick Actions</h2>
            <p className={`${getTextColor(theme, 'muted')} text-sm`}>Common tasks</p>
          </div>
        </div>
        <div className="space-y-3">
          {actions.map((action, index) => (
            <motion.button
              key={action.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: action.disabled ? 1 : 1.02, x: action.disabled ? 0 : 4 }}
              whileTap={{ scale: action.disabled ? 1 : 0.98 }}
              onClick={action.disabled ? undefined : action.onClick}
              disabled={action.disabled}
              className={`w-full flex items-center space-x-4 p-4 ${getCardBg(theme)} ${getHoverBg(theme)} border ${getCardBorder(theme)} rounded-xl transition-all duration-200 group relative ${action.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
            >
              <div className={`${action.color} p-3 rounded-xl transition-all shadow-md group-hover:shadow-lg group-hover:shadow-[#6A3DF4]/20 relative`}>
                <action.icon className={`w-5 h-5 text-white ${action.disabled && action.title === 'Export Data' ? 'animate-pulse' : ''}`} />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center space-x-2">
                  <h3 className={`${getTextColor(theme, 'primary')} font-semibold`}>{action.title}</h3>
                  {action.badge && (
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${action.badge === 'NEW'
                        ? 'bg-[#E74C3C] text-white animate-pulse'
                        : 'bg-[#6A3DF4] text-white'
                      }`}>
                      {action.badge}
                    </span>
                  )}
                </div>
                <p className={`${getTextColor(theme, 'muted')} text-sm`}>{action.description}</p>
              </div>

              {/* Loading indicator for export */}
              {action.disabled && action.title === 'Export Data' && (
                <div className="absolute right-4">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showWizard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <div className="w-full max-w-4xl relative">
              <TradeImportWizard
                onClose={() => setShowWizard(false)}
                onComplete={(data) => {
                  setShowWizard(false);
                  // Here we would typically save to the database
                  navigate('/journal');
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
