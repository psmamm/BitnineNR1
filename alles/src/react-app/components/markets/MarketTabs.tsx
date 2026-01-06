import { motion } from 'framer-motion';

export type MarketTab = 'overview' | 'trading-data' | 'ai-select' | 'token-unlock';

interface MarketTabsProps {
  activeTab: MarketTab;
  onTabChange: (tab: MarketTab) => void;
}

export default function MarketTabs({ activeTab, onTabChange }: MarketTabsProps) {
  const tabs: { id: MarketTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'trading-data', label: 'Trading Data' },
    { id: 'ai-select', label: 'AI Select' },
    { id: 'token-unlock', label: 'Token Unlock' },
  ];

  return (
    <div className="border-b border-white/10 pb-2">
      <div className="flex items-center">
        {/* Tabs */}
        <div className="flex items-center space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative px-2 py-2 text-sm font-medium transition-colors"
            >
              <span className={activeTab === tab.id ? 'text-white' : 'text-[#7F8C8D] hover:text-[#AAB0C0]'}>
                {tab.label}
              </span>
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6A3DF4]"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
