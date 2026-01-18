import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bot, Zap, Target, Shield, TrendingUp, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';

interface CreateBotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateBot: (botData: BotFormData) => Promise<void>;
}

export interface BotFormData {
  name: string;
  strategy: string;
  symbol: string;
  maxPositionSize: number;
  stopLoss: number;
  takeProfit: number;
  riskPerTrade: number;
}

const STRATEGIES = [
  { id: 'grid', name: 'Grid Trading', description: 'Place orders at preset price intervals' },
  { id: 'dca', name: 'DCA Bot', description: 'Dollar cost averaging over time' },
  { id: 'momentum', name: 'Momentum', description: 'Follow strong price movements' },
  { id: 'meanrev', name: 'Mean Reversion', description: 'Trade price reversals to mean' },
  { id: 'breakout', name: 'Breakout', description: 'Trade when price breaks key levels' },
];

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'LINKUSDT'];

export function CreateBotModal({ isOpen, onClose, onCreateBot }: CreateBotModalProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<BotFormData>({
    name: '',
    strategy: '',
    symbol: 'BTCUSDT',
    maxPositionSize: 100,
    stopLoss: 2,
    takeProfit: 4,
    riskPerTrade: 1,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Bot name is required';
    if (!formData.strategy) newErrors.strategy = 'Select a strategy';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    if (formData.maxPositionSize <= 0) newErrors.maxPositionSize = 'Position size must be positive';
    if (formData.stopLoss <= 0 || formData.stopLoss > 50) newErrors.stopLoss = 'Stop loss must be 0-50%';
    if (formData.takeProfit <= 0 || formData.takeProfit > 100) newErrors.takeProfit = 'Take profit must be 0-100%';
    if (formData.riskPerTrade <= 0 || formData.riskPerTrade > 10) newErrors.riskPerTrade = 'Risk per trade must be 0-10%';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;

    setLoading(true);
    try {
      await onCreateBot(formData);
      onClose();
      // Reset form
      setFormData({
        name: '',
        strategy: '',
        symbol: 'BTCUSDT',
        maxPositionSize: 100,
        stopLoss: 2,
        takeProfit: 4,
        riskPerTrade: 1,
      });
      setStep(1);
    } catch (error) {
      console.error('Failed to create bot:', error);
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to create bot' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setErrors({});
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-zinc-900 rounded-2xl border border-zinc-800 w-full max-w-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FCD535]/10 rounded-xl flex items-center justify-center">
                  <Bot className="w-5 h-5 text-[#FCD535]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Create Trading Bot</h2>
                  <p className="text-sm text-zinc-400">Step {step} of 2</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="px-6 pt-4">
              <div className="flex gap-2">
                <div className={`flex-1 h-1 rounded-full ${step >= 1 ? 'bg-[#FCD535]' : 'bg-zinc-700'}`} />
                <div className={`flex-1 h-1 rounded-full ${step >= 2 ? 'bg-[#FCD535]' : 'bg-zinc-700'}`} />
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {errors.submit && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm">{errors.submit}</p>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-6">
                  {/* Bot Name */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-[#FCD535]" />
                        Bot Name
                      </div>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., BTC Grid Bot"
                      className={`w-full px-4 py-3 bg-zinc-800 border ${errors.name ? 'border-red-500' : 'border-zinc-700'} rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-[#FCD535] transition-colors`}
                    />
                    {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
                  </div>

                  {/* Strategy Selection */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-[#FCD535]" />
                        Trading Strategy
                      </div>
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {STRATEGIES.map((strategy) => (
                        <button
                          key={strategy.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, strategy: strategy.id })}
                          className={`flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
                            formData.strategy === strategy.id
                              ? 'bg-[#FCD535]/10 border-[#FCD535] text-white'
                              : 'bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:border-zinc-600'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                            formData.strategy === strategy.id ? 'border-[#FCD535]' : 'border-zinc-600'
                          }`}>
                            {formData.strategy === strategy.id && (
                              <div className="w-2 h-2 rounded-full bg-[#FCD535]" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{strategy.name}</div>
                            <div className="text-xs text-zinc-500">{strategy.description}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                    {errors.strategy && <p className="text-red-400 text-xs mt-1">{errors.strategy}</p>}
                  </div>

                  {/* Symbol */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-[#FCD535]" />
                        Trading Pair
                      </div>
                    </label>
                    <select
                      value={formData.symbol}
                      onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-[#FCD535] transition-colors"
                    >
                      {SYMBOLS.map((symbol) => (
                        <option key={symbol} value={symbol}>{symbol}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  {/* Risk Management */}
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                    <div className="flex items-center gap-2 text-amber-400 mb-2">
                      <Shield className="w-4 h-4" />
                      <span className="font-medium">Risk Management</span>
                    </div>
                    <p className="text-zinc-400 text-sm">Configure your bot's risk parameters to protect your capital.</p>
                  </div>

                  {/* Max Position Size */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Max Position Size (USD)
                    </label>
                    <input
                      type="number"
                      value={formData.maxPositionSize}
                      onChange={(e) => setFormData({ ...formData, maxPositionSize: Number(e.target.value) })}
                      className={`w-full px-4 py-3 bg-zinc-800 border ${errors.maxPositionSize ? 'border-red-500' : 'border-zinc-700'} rounded-xl text-white focus:outline-none focus:border-[#FCD535] transition-colors`}
                    />
                    {errors.maxPositionSize && <p className="text-red-400 text-xs mt-1">{errors.maxPositionSize}</p>}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {/* Stop Loss */}
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Stop Loss (%)
                      </label>
                      <input
                        type="number"
                        value={formData.stopLoss}
                        onChange={(e) => setFormData({ ...formData, stopLoss: Number(e.target.value) })}
                        className={`w-full px-4 py-3 bg-zinc-800 border ${errors.stopLoss ? 'border-red-500' : 'border-zinc-700'} rounded-xl text-white focus:outline-none focus:border-[#FCD535] transition-colors`}
                      />
                      {errors.stopLoss && <p className="text-red-400 text-xs mt-1">{errors.stopLoss}</p>}
                    </div>

                    {/* Take Profit */}
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Take Profit (%)
                      </label>
                      <input
                        type="number"
                        value={formData.takeProfit}
                        onChange={(e) => setFormData({ ...formData, takeProfit: Number(e.target.value) })}
                        className={`w-full px-4 py-3 bg-zinc-800 border ${errors.takeProfit ? 'border-red-500' : 'border-zinc-700'} rounded-xl text-white focus:outline-none focus:border-[#FCD535] transition-colors`}
                      />
                      {errors.takeProfit && <p className="text-red-400 text-xs mt-1">{errors.takeProfit}</p>}
                    </div>

                    {/* Risk Per Trade */}
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Risk/Trade (%)
                      </label>
                      <input
                        type="number"
                        value={formData.riskPerTrade}
                        onChange={(e) => setFormData({ ...formData, riskPerTrade: Number(e.target.value) })}
                        className={`w-full px-4 py-3 bg-zinc-800 border ${errors.riskPerTrade ? 'border-red-500' : 'border-zinc-700'} rounded-xl text-white focus:outline-none focus:border-[#FCD535] transition-colors`}
                      />
                      {errors.riskPerTrade && <p className="text-red-400 text-xs mt-1">{errors.riskPerTrade}</p>}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl">
                    <div className="flex items-center gap-2 text-white mb-3">
                      <TrendingUp className="w-4 h-4 text-[#FCD535]" />
                      <span className="font-medium">Bot Summary</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Name:</span>
                        <span className="text-white">{formData.name || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Strategy:</span>
                        <span className="text-white">{STRATEGIES.find(s => s.id === formData.strategy)?.name || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Symbol:</span>
                        <span className="text-white">{formData.symbol}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Max Size:</span>
                        <span className="text-white">${formData.maxPositionSize}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-zinc-800">
              {step === 1 ? (
                <>
                  <Button variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button onClick={handleNext} className="bg-[#FCD535] hover:bg-[#00A89C]">
                    Next Step
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={handleBack}>
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="bg-[#FCD535] hover:bg-[#00A89C]"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Bot className="w-4 h-4 mr-2" />
                        Create Bot
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
