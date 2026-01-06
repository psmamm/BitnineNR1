import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play } from 'lucide-react';
import { PracticeSettings } from '@/react-app/hooks/useCompetitionGame';

interface PracticeSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStart: (settings: PracticeSettings) => void;
    initialSettings: PracticeSettings;
}

export function PracticeSettingsModal({ isOpen, onClose, onStart, initialSettings }: PracticeSettingsModalProps) {
    const [settings, setSettings] = useState<PracticeSettings>(initialSettings);

    const Dropdown = ({ value, onChange, options, label }: { 
        value: string | number | null; 
        onChange: (value: string | number | null) => void; 
        options: Array<{ value: string | number | null; label: string }>; 
        label: string 
    }) => {
        const [isOpen, setIsOpen] = useState(false);
        const dropdownRef = useRef<HTMLDivElement>(null);
        const menuRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
            if (!isOpen) return;
            
            const handleClickOutside = (event: MouseEvent) => {
                const target = event.target as Node;
                if (
                    dropdownRef.current && 
                    !dropdownRef.current.contains(target) &&
                    menuRef.current &&
                    !menuRef.current.contains(target)
                ) {
                    setIsOpen(false);
                }
            };
            
            document.addEventListener('mousedown', handleClickOutside, true);
            
            return () => {
                document.removeEventListener('mousedown', handleClickOutside, true);
            };
        }, [isOpen]);

        const selectedOption = options.find(opt => {
            if (opt.value === null && value === null) return true;
            if (opt.value === null || value === null) return false;
            return String(opt.value) === String(value);
        });

        const handleOptionSelect = (optionValue: string | number | null, e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            onChange(optionValue);
            setIsOpen(false);
        };

        return (
            <div className="relative" ref={dropdownRef}>
                <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
                <button
                    type="button"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsOpen(prev => !prev);
                    }}
                    className="w-full bg-[#0D0F18] border border-white/10 rounded-lg px-4 py-3 text-left flex items-center justify-between hover:border-[#6A3DF4]/50 transition-colors cursor-pointer"
                >
                    <span className="text-white">{selectedOption?.label || (value === null ? 'No limit' : String(value))}</span>
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
                {isOpen && (
                    <div 
                        ref={menuRef}
                        className="absolute z-[9999] w-full mt-1 bg-[#1E2232] border border-white/10 rounded-lg shadow-xl max-h-60 overflow-auto"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        {options.map((option) => {
                            const isSelected = option.value === null ? value === null : String(option.value) === String(value);
                            return (
                                <button
                                    key={option.value === null ? 'null' : String(option.value)}
                                    type="button"
                                    onMouseDown={(e) => handleOptionSelect(option.value, e)}
                                    className={`w-full px-4 py-2 text-left transition-colors first:rounded-t-lg last:rounded-b-lg cursor-pointer ${
                                        isSelected 
                                            ? 'bg-[#6A3DF4]/30 text-[#6A3DF4] font-medium' 
                                            : 'text-white hover:bg-[#6A3DF4]/20'
                                    }`}
                                >
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
                onMouseDown={(e) => {
                    if (e.target === e.currentTarget) {
                        onClose();
                    }
                }}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="bg-[#1E2232] border border-white/10 rounded-2xl p-8 w-full max-w-md relative z-[70]"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-white">Practice Settings</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="space-y-4 mb-6">
                        <Dropdown
                            label="Symbol"
                            value={settings.symbol}
                            onChange={(value) => setSettings(prev => ({ ...prev, symbol: value as string }))}
                            options={[
                                { value: 'BTCUSDT', label: 'BTCUSDT' },
                                { value: 'ETHUSDT', label: 'ETHUSDT' },
                                { value: 'BNBUSDT', label: 'BNBUSDT' },
                                { value: 'SOLUSDT', label: 'SOLUSDT' },
                                { value: 'XRPUSDT', label: 'XRPUSDT' },
                                { value: 'ADAUSDT', label: 'ADAUSDT' },
                                { value: 'DOGEUSDT', label: 'DOGEUSDT' },
                                { value: 'DOTUSDT', label: 'DOTUSDT' },
                                { value: 'MATICUSDT', label: 'MATICUSDT' },
                                { value: 'AVAXUSDT', label: 'AVAXUSDT' },
                            ]}
                        />
                        <Dropdown
                            label="Time Limit"
                            value={settings.timeLimit}
                            onChange={(value) => setSettings(prev => ({ ...prev, timeLimit: value as number }))}
                            options={[
                                { value: 1, label: '1 minute' },
                                { value: 3, label: '3 minutes' },
                                { value: 5, label: '5 minutes' },
                                { value: 10, label: '10 minutes' },
                                { value: 15, label: '15 minutes' },
                                { value: 30, label: '30 minutes' },
                                { value: 60, label: '1 hour' },
                                { value: 120, label: '2 hours' },
                                { value: 240, label: '4 hours' },
                                { value: 480, label: '8 hours' },
                            ]}
                        />
                        <Dropdown
                            label="Initial Balance"
                            value={settings.initialBalance}
                            onChange={(value) => setSettings(prev => ({ ...prev, initialBalance: value as number }))}
                            options={[
                                { value: 10000, label: '$10,000' },
                                { value: 25000, label: '$25,000' },
                                { value: 50000, label: '$50,000' },
                                { value: 100000, label: '$100,000' },
                            ]}
                        />
                        <Dropdown
                            label="Max Drawdown %"
                            value={settings.maxDrawdownPercent}
                            onChange={(value) => setSettings(prev => ({ ...prev, maxDrawdownPercent: value as number | null }))}
                            options={[
                                { value: null, label: 'No limit' },
                                { value: 5, label: '5%' },
                                { value: 10, label: '10%' },
                                { value: 15, label: '15%' },
                                { value: 20, label: '20%' },
                                { value: 25, label: '25%' },
                            ]}
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => onStart(settings)}
                            className="flex-1 bg-[#6A3DF4] hover:bg-[#8B5CF6] text-white font-medium py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
                        >
                            <Play className="w-5 h-5" />
                            Start Practice
                        </button>
                        <button
                            onClick={onClose}
                            className="px-6 py-3 bg-[#0D0F18] hover:bg-[#0D0F18]/80 text-white font-medium rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

