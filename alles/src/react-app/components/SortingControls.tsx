import { motion } from "framer-motion";
import { ArrowUp, ArrowDown, Calendar, DollarSign, TrendingUp, Target } from "lucide-react";

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

interface SortingControlsProps {
  options: SortOptions;
  onSortChange: (options: SortOptions) => void;
}

export default function SortingControls({ options, onSortChange }: SortingControlsProps) {
  const sortFields = [
    { 
      key: 'entry_date', 
      label: 'Date', 
      icon: Calendar,
      description: 'Sort by entry date' 
    },
    { 
      key: 'symbol', 
      label: 'Symbol', 
      icon: Target,
      description: 'Sort alphabetically by symbol' 
    },
    { 
      key: 'pnl', 
      label: 'P&L', 
      icon: DollarSign,
      description: 'Sort by profit/loss' 
    },
    { 
      key: 'quantity', 
      label: 'Quantity', 
      icon: TrendingUp,
      description: 'Sort by position size' 
    }
  ];

  const handleFieldChange = (field: string) => {
    if (options.field === field) {
      // Toggle direction if same field
      onSortChange({
        field,
        direction: options.direction === 'asc' ? 'desc' : 'asc'
      });
    } else {
      // New field, default to desc
      onSortChange({
        field,
        direction: 'desc'
      });
    }
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-4 border border-gray-700/50">
      <h4 className="text-lg font-semibold text-white mb-4">Sort By</h4>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {sortFields.map((field) => {
          const isActive = options.field === field.key;
          const Icon = field.icon;
          const DirectionIcon = options.direction === 'asc' ? ArrowUp : ArrowDown;
          
          return (
            <motion.button
              key={field.key}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleFieldChange(field.key)}
              className={`relative p-3 rounded-xl border transition-all text-left ${
                isActive 
                  ? 'bg-purple-600/20 border-purple-500/50 text-white' 
                  : 'bg-gray-700/30 border-gray-600/30 text-gray-300 hover:border-gray-500/50 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <Icon className={`w-4 h-4 ${isActive ? 'text-purple-400' : 'text-gray-400'}`} />
                {isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-purple-400"
                  >
                    <DirectionIcon className="w-4 h-4" />
                  </motion.div>
                )}
              </div>
              <div className="font-medium text-sm">{field.label}</div>
              <div className="text-xs text-gray-400 mt-1">{field.description}</div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
