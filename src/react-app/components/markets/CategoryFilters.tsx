import { Flame } from 'lucide-react';
import { useState } from 'react';

export type CategoryType = 'favorites' | 'cryptos' | 'spot' | 'futures' | 'alpha' | 'new' | 'zones';

export type SubFilterType = 
  | 'all'
  | 'bnb-chain'
  | 'solana'
  | 'rwa'
  | 'meme'
  | 'payments'
  | 'ai'
  | 'layer1-layer2'
  | 'metaverse'
  | 'seed'
  | 'launchpool'
  | 'megadrop'
  | 'gaming'
  | 'defi';

interface CategoryFiltersProps {
  activeCategory: CategoryType;
  activeSubFilter: SubFilterType;
  onCategoryChange: (category: CategoryType) => void;
  onSubFilterChange: (filter: SubFilterType) => void;
  searchElement?: React.ReactNode;
}

const categories: { id: CategoryType; label: string; badge?: string }[] = [
  { id: 'favorites', label: 'Favorites' },
  { id: 'cryptos', label: 'Cryptos' },
  { id: 'spot', label: 'Spot' },
  { id: 'futures', label: 'Futures' },
  { id: 'alpha', label: 'Alpha', badge: 'New' },
  { id: 'new', label: 'New' },
  { id: 'zones', label: 'Zones' },
];

const subFilters: { id: SubFilterType; label: string; icon?: React.ReactNode }[] = [
  { id: 'all', label: 'All' },
  { id: 'bnb-chain', label: 'BNB Chain' },
  { id: 'solana', label: 'Solana', icon: <Flame className="w-3 h-3" /> },
  { id: 'rwa', label: 'RWA' },
  { id: 'meme', label: 'Meme' },
  { id: 'payments', label: 'Payments' },
  { id: 'ai', label: 'AI' },
  { id: 'layer1-layer2', label: 'Layer 1 / Layer 2' },
  { id: 'metaverse', label: 'Metaverse' },
  { id: 'seed', label: 'Seed' },
  { id: 'launchpool', label: 'Launchpool', icon: <Flame className="w-3 h-3" /> },
  { id: 'megadrop', label: 'Megadrop', icon: <Flame className="w-3 h-3" /> },
  { id: 'gaming', label: 'Gaming' },
  { id: 'defi', label: 'DeFi' },
];

export default function CategoryFilters({
  activeCategory,
  activeSubFilter,
  onCategoryChange,
  onSubFilterChange,
  searchElement,
}: CategoryFiltersProps) {
  return (
    <div className="space-y-3 mb-4">
      {/* Category Tabs - Direct on main background, no container */}
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex items-center space-x-6 pb-2 min-w-max">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={`relative px-2 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategory === category.id
                  ? 'text-white font-semibold'
                  : 'text-[#7F8C8D] hover:text-[#AAB0C0]'
              }`}
            >
              <span className="flex items-center">
                {category.label}
                {category.badge && (
                  <span className="ml-2 px-1.5 py-0.5 text-xs bg-[#6A3DF4] text-white rounded">
                    {category.badge}
                  </span>
                )}
              </span>
              {activeCategory === category.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6A3DF4]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-Filter Chips - Direct on main background, no container */}
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex items-center space-x-2 pb-2 min-w-max">
          {searchElement && (
            <div className="flex-shrink-0">
              {searchElement}
            </div>
          )}
          {subFilters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => onSubFilterChange(filter.id)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeSubFilter === filter.id
                  ? 'bg-[#6A3DF4]/20 text-[#6A3DF4] border border-[#6A3DF4]/30'
                  : 'bg-[#0D0F18]/50 text-[#7F8C8D] hover:text-[#AAB0C0] hover:bg-[#0D0F18]/70 border border-white/10'
              }`}
            >
              {filter.icon && <span className="text-[#E74C3C]">{filter.icon}</span>}
              <span>{filter.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
