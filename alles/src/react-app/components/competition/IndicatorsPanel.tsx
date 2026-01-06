import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BarChart3 } from 'lucide-react';

export interface Indicator {
    id: string;
    name: string;
    category: 'trend' | 'momentum' | 'volatility' | 'volume';
    icon: ReactNode;
    enabled: boolean;
}

interface IndicatorsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    indicators: Indicator[];
    onIndicatorToggle: (id: string) => void;
}

export function IndicatorsPanel({
    isOpen,
    onClose,
    indicators,
    onIndicatorToggle,
}: IndicatorsPanelProps) {
    const categories = ['trend', 'momentum', 'volatility', 'volume'] as const;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-40"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: 300, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 300, opacity: 0 }}
                        className="fixed right-0 top-0 h-full w-80 bg-[#1E2232] border-l border-white/10 z-50 overflow-y-auto"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <div className="flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-[#667eea]" />
                                <h3 className="text-lg font-semibold text-white">Indicators</h3>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-[#7F8C8D]" />
                            </button>
                        </div>

                        {/* Indicators List */}
                        <div className="p-4 space-y-6">
                            {categories.map(category => {
                                const categoryIndicators = indicators.filter(i => i.category === category);
                                if (categoryIndicators.length === 0) return null;

                                return (
                                    <div key={category}>
                                        <h4 className="text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider mb-3">
                                            {category}
                                        </h4>
                                        <div className="space-y-2">
                                            {categoryIndicators.map(indicator => (
                                                <button
                                                    key={indicator.id}
                                                    onClick={() => onIndicatorToggle(indicator.id)}
                                                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${indicator.enabled
                                                            ? 'bg-[#667eea]/20 border border-[#667eea]/50'
                                                            : 'bg-[#0D0F18] border border-white/5 hover:border-white/20'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`${indicator.enabled ? 'text-[#667eea]' : 'text-[#7F8C8D]'}`}>
                                                            {indicator.icon}
                                                        </div>
                                                        <span className={`text-sm font-medium ${indicator.enabled ? 'text-white' : 'text-[#BDC3C7]'}`}>
                                                            {indicator.name}
                                                        </span>
                                                    </div>
                                                    <div className={`w-4 h-4 rounded-full border-2 ${indicator.enabled
                                                            ? 'bg-[#667eea] border-[#667eea]'
                                                            : 'border-[#7F8C8D]'
                                                        }`}>
                                                        {indicator.enabled && (
                                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-[#1E2232]">
                            <div className="text-xs text-[#7F8C8D] text-center">
                                {indicators.filter(i => i.enabled).length} indicators active
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
