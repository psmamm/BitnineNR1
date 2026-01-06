import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, TrendingUp, TrendingDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { buildApiUrl } from '../../hooks/useApi';
import { useTheme } from '../../contexts/ThemeContext';
import { getCardBg, getCardBorder, getTextColor } from '../../utils/themeUtils';
import VoiceRecorder from '../ui/VoiceRecorder';

interface QuickAddTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void; // Callback to refetch user data after successful trade
}

interface ToastState {
  show: boolean;
  message: string;
}

export default function QuickAddTradeModal({ isOpen, onClose, onSuccess }: QuickAddTradeModalProps) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>({ show: false, message: '' });

  const [formData, setFormData] = useState({
    symbol: '',
    direction: 'LONG' as 'LONG' | 'SHORT',
    entry_price: '',
    exit_price: '',
    size: '',
    voice_transcription: '',
  });
  const [voiceNoteUrl, setVoiceNoteUrl] = useState<string | null>(null);

  // Show toast notification
  const showToast = (message: string) => {
    setToast({ show: true, message });
    setTimeout(() => {
      setToast({ show: false, message: '' });
    }, 3000);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      symbol: '',
      direction: 'LONG',
      entry_price: '',
      exit_price: '',
      size: '',
      voice_transcription: '',
    });
    setVoiceNoteUrl(null);
    setError(null);
  };

  // Handle voice transcription complete
  const handleTranscriptionComplete = (text: string, audioUrl: string) => {
    setFormData(prev => ({
      ...prev,
      voice_transcription: prev.voice_transcription ? `${prev.voice_transcription}\n${text}` : text,
    }));
    setVoiceNoteUrl(audioUrl);
    showToast('Voice note transcribed! 🎤');
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate form
      if (!formData.symbol || !formData.entry_price || !formData.size) {
        throw new Error('Symbol, Entry Price, and Size are required');
      }

      const entryPrice = parseFloat(formData.entry_price);
      const exitPrice = formData.exit_price ? parseFloat(formData.exit_price) : null;
      const size = parseFloat(formData.size);

      if (isNaN(entryPrice) || entryPrice <= 0) {
        throw new Error('Entry price must be a positive number');
      }

      if (exitPrice !== null && (isNaN(exitPrice) || exitPrice <= 0)) {
        throw new Error('Exit price must be a positive number');
      }

      if (isNaN(size) || size <= 0) {
        throw new Error('Size must be a positive number');
      }

      // Get Firebase ID token
      if (!user) {
        throw new Error('User not authenticated');
      }

      const idToken = await user.getIdToken();

      // Prepare trade data
      const tradeData: any = {
        symbol: formData.symbol.toUpperCase(),
        direction: formData.direction,
        entry_price: entryPrice,
        size: size,
        entry_timestamp: Math.floor(Date.now() / 1000), // Current Unix timestamp
      };

      // Add exit data if provided
      if (exitPrice !== null) {
        tradeData.exit_price = exitPrice;
        tradeData.exit_timestamp = Math.floor(Date.now() / 1000);
      }

      // Add voice journaling data if provided
      if (formData.voice_transcription) {
        tradeData.voice_transcription = formData.voice_transcription;
      }
      if (voiceNoteUrl) {
        tradeData.voice_note_url = voiceNoteUrl;
      }

      // Send POST request
      const response = await fetch(buildApiUrl('/api/trades'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`, // Firebase token in header
        },
        credentials: 'include', // Also send cookies
        body: JSON.stringify(tradeData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.details || `Failed to save trade: ${response.status}`;
        console.error('Trade save error:', errorData);
        throw new Error(errorMessage);
      }

      const result = await response.json();

      // Success! Show toast and close modal
      showToast('Trade saved! 🚀 +10 Reputation earned');
      
      // Reset form
      resetForm();
      
      // Close modal immediately
      onClose();

      // Trigger onSuccess callback to refetch data
      if (onSuccess) {
        onSuccess();
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save trade');
    } finally {
      setLoading(false);
    }
  };

  // Handle close
  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !loading) {
                handleClose();
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onMouseDown={(e) => e.stopPropagation()}
              className={`${getCardBg(theme)} border ${getCardBorder(theme)} rounded-2xl p-6 w-full max-w-md relative z-[101]`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-2xl font-bold ${getTextColor(theme, 'primary')}`}>
                  Quick Add Trade
                </h2>
                <button
                  onClick={handleClose}
                  disabled={loading}
                  className={`${getTextColor(theme, 'muted')} hover:${getTextColor(theme, 'primary')} transition-colors disabled:opacity-50`}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Symbol */}
                <div>
                  <label className={`block text-sm font-medium ${getTextColor(theme, 'secondary')} mb-2`}>
                    Symbol
                  </label>
                  <input
                    type="text"
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                    placeholder="BTCUSDT"
                    required
                    disabled={loading}
                    className={`w-full px-4 py-3 ${getCardBg(theme)} border ${getCardBorder(theme)} rounded-lg ${getTextColor(theme, 'primary')} placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#6A3DF4] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed`}
                  />
                </div>

                {/* Direction */}
                <div>
                  <label className={`block text-sm font-medium ${getTextColor(theme, 'secondary')} mb-2`}>
                    Direction
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, direction: 'LONG' })}
                      disabled={loading}
                      className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg border transition-all ${
                        formData.direction === 'LONG'
                          ? 'bg-[#2ECC71]/20 border-[#2ECC71] text-[#2ECC71]'
                          : `${getCardBg(theme)} ${getCardBorder(theme)} ${getTextColor(theme, 'secondary')} hover:bg-white/5`
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <TrendingUp className="w-5 h-5" />
                      <span className="font-medium">LONG</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, direction: 'SHORT' })}
                      disabled={loading}
                      className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg border transition-all ${
                        formData.direction === 'SHORT'
                          ? 'bg-[#E74C3C]/20 border-[#E74C3C] text-[#E74C3C]'
                          : `${getCardBg(theme)} ${getCardBorder(theme)} ${getTextColor(theme, 'secondary')} hover:bg-white/5`
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <TrendingDown className="w-5 h-5" />
                      <span className="font-medium">SHORT</span>
                    </button>
                  </div>
                </div>

                {/* Entry Price */}
                <div>
                  <label className={`block text-sm font-medium ${getTextColor(theme, 'secondary')} mb-2`}>
                    Entry Price
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.entry_price}
                    onChange={(e) => setFormData({ ...formData, entry_price: e.target.value })}
                    placeholder="50000.00"
                    required
                    disabled={loading}
                    className={`w-full px-4 py-3 ${getCardBg(theme)} border ${getCardBorder(theme)} rounded-lg ${getTextColor(theme, 'primary')} placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#6A3DF4] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed`}
                  />
                </div>

                {/* Exit Price (Optional) */}
                <div>
                  <label className={`block text-sm font-medium ${getTextColor(theme, 'secondary')} mb-2`}>
                    Exit Price <span className="text-gray-500">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.exit_price}
                    onChange={(e) => setFormData({ ...formData, exit_price: e.target.value })}
                    placeholder="51000.00"
                    disabled={loading}
                    className={`w-full px-4 py-3 ${getCardBg(theme)} border ${getCardBorder(theme)} rounded-lg ${getTextColor(theme, 'primary')} placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#6A3DF4] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed`}
                  />
                </div>

                {/* Size */}
                <div>
                  <label className={`block text-sm font-medium ${getTextColor(theme, 'secondary')} mb-2`}>
                    Position Size ($)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    placeholder="1000.00"
                    required
                    disabled={loading}
                    className={`w-full px-4 py-3 ${getCardBg(theme)} border ${getCardBorder(theme)} rounded-lg ${getTextColor(theme, 'primary')} placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#6A3DF4] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed`}
                  />
                </div>

                {/* Notes / AI Journal */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={`block text-sm font-medium ${getTextColor(theme, 'secondary')}`}>
                      Trade Notes & Psychology
                    </label>
                    <VoiceRecorder
                      onTranscriptionComplete={handleTranscriptionComplete}
                      className="ml-2"
                    />
                  </div>
                  <textarea
                    value={formData.voice_transcription}
                    onChange={(e) => setFormData({ ...formData, voice_transcription: e.target.value })}
                    placeholder="Record voice note or type..."
                    disabled={loading}
                    rows={4}
                    className={`w-full px-4 py-3 ${getCardBg(theme)} border ${getCardBorder(theme)} rounded-lg ${getTextColor(theme, 'primary')} placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#6A3DF4] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none`}
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-3 bg-[#E74C3C]/10 border border-[#E74C3C]/30 rounded-lg">
                    <p className="text-[#E74C3C] text-sm">{error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-[#6A3DF4] hover:bg-[#5A2DE4] text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      <span>Log Trade</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className="fixed bottom-8 left-1/2 z-[200] transform -translate-x-1/2"
          >
            <div className="bg-[#2ECC71] text-white px-6 py-4 rounded-lg shadow-2xl flex items-center space-x-3">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="font-semibold">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

