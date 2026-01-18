/**
 * CSV Import Modal
 *
 * Modal for importing trades from CSV files from various brokers.
 * Supports auto-detection, preview, and batch import.
 */

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Upload, FileText, Check, AlertCircle, ChevronRight,
  Loader2, FileUp, Info
} from 'lucide-react';
import { useTheme } from '@/react-app/contexts/ThemeContext';
import { getCardBg, getCardBorder, getTextColor, getHoverBg } from '@/react-app/utils/themeUtils';
import { buildApiUrl } from '@/react-app/hooks/useApi';

// ============================================================================
// Types
// ============================================================================

interface BrokerInfo {
  id: string;
  name: string;
  assetClasses: string[];
}

interface ParsedTrade {
  symbol: string;
  side: string;
  quantity: number;
  entryPrice: number;
  exitPrice?: number;
  entryDate: string;
  exitDate?: string;
  assetClass: string;
  realizedPnl?: number;
}

interface PreviewResult {
  brokerId: string;
  success: boolean;
  preview: ParsedTrade[];
  totalTrades: number;
  totalRows: number;
  parsedRows: number;
  skippedRows: number;
  warnings: string[];
  errors: string[];
}

interface ImportResult {
  success: boolean;
  brokerId: string;
  imported: number;
  skipped: number;
  total: number;
  warnings: string[];
  errors: string[];
}

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: ImportResult) => void;
}

// ============================================================================
// Component
// ============================================================================

export default function CSVImportModal({
  isOpen,
  onClose,
  onSuccess
}: CSVImportModalProps) {
  const { theme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'success'>('upload');
  const [brokers, setBrokers] = useState<BrokerInfo[]>([]);
  const [selectedBroker, setSelectedBroker] = useState<string | null>(null);
  const [selectedAssetType, setSelectedAssetType] = useState<string>('stocks');
  const [csvContent, setCsvContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Fetch supported brokers on mount
  const fetchBrokers = useCallback(async () => {
    try {
      const response = await fetch(buildApiUrl('/api/trades/import/brokers'), {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.brokers) {
        setBrokers(data.brokers);
      }
    } catch (err) {
      console.error('Failed to fetch brokers:', err);
    }
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    if (!file) return;

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setError('Please select a CSV or TXT file');
      return;
    }

    setLoading(true);
    setError(null);
    setFileName(file.name);

    try {
      const content = await file.text();
      setCsvContent(content);

      // Detect broker
      const detectResponse = await fetch(buildApiUrl('/api/trades/import/detect'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ csvContent: content })
      });

      const detectData = await detectResponse.json();
      if (detectData.brokerId) {
        setSelectedBroker(detectData.brokerId);
      }

      // Get preview
      const previewResponse = await fetch(buildApiUrl('/api/trades/import/preview'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ csvContent: content, brokerId: detectData.brokerId })
      });

      const previewData = await previewResponse.json();

      if (previewData.error) {
        setError(previewData.error);
      } else {
        setPreview(previewData);
        setStep('preview');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle drag and drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [handleFileSelect]);

  // Handle import
  const handleImport = useCallback(async () => {
    if (!csvContent || !selectedBroker) return;

    setStep('importing');
    setError(null);

    try {
      const response = await fetch(buildApiUrl('/api/trades/import'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          csvContent,
          brokerId: selectedBroker,
          defaultAssetType: selectedAssetType
        })
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setStep('preview');
        return;
      }

      setImportResult(data);
      setStep('success');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
      setStep('preview');
    }
  }, [csvContent, selectedBroker, selectedAssetType]);

  // Handle close
  const handleClose = useCallback(() => {
    if (importResult) {
      onSuccess(importResult);
    }
    setStep('upload');
    setPreview(null);
    setImportResult(null);
    setCsvContent('');
    setFileName('');
    setSelectedBroker(null);
    setError(null);
    onClose();
  }, [importResult, onSuccess, onClose]);

  // Initialize brokers on open
  if (isOpen && brokers.length === 0) {
    fetchBrokers();
  }

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={`relative w-full max-w-2xl ${getCardBg(theme)} rounded-2xl border ${getCardBorder(theme)} shadow-2xl overflow-hidden`}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#2B2F36]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FCD535]/10 rounded-xl flex items-center justify-center">
                <FileUp className="w-5 h-5 text-[#FCD535]" />
              </div>
              <div>
                <h2 className={`text-xl font-semibold ${getTextColor(theme, 'primary')}`}>
                  {step === 'upload' ? 'Import Trades' :
                   step === 'preview' ? 'Preview Import' :
                   step === 'importing' ? 'Importing...' :
                   'Import Complete'}
                </h2>
                <p className={`text-sm ${getTextColor(theme, 'muted')}`}>
                  {step === 'upload' ? 'Upload your broker CSV file' :
                   step === 'preview' ? `${preview?.totalTrades || 0} trades found` :
                   step === 'importing' ? 'Please wait...' :
                   `${importResult?.imported || 0} trades imported`}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className={`p-2 rounded-lg ${getHoverBg(theme)} transition-colors`}
            >
              <X className={`w-5 h-5 ${getTextColor(theme, 'secondary')}`} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {/* Step 1: Upload */}
            {step === 'upload' && (
              <div className="space-y-6">
                {/* Drop Zone */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                    dragActive
                      ? 'border-[#FCD535] bg-[#FCD535]/10'
                      : `${getCardBorder(theme)} ${getHoverBg(theme)}`
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                    className="hidden"
                  />

                  {loading ? (
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="w-12 h-12 text-[#FCD535] animate-spin" />
                      <p className={getTextColor(theme, 'secondary')}>Processing file...</p>
                    </div>
                  ) : (
                    <>
                      <Upload className={`w-12 h-12 mx-auto mb-4 ${getTextColor(theme, 'muted')}`} />
                      <p className={`text-lg font-medium mb-2 ${getTextColor(theme, 'primary')}`}>
                        Drop your CSV file here
                      </p>
                      <p className={`text-sm ${getTextColor(theme, 'muted')}`}>
                        or click to browse
                      </p>
                    </>
                  )}
                </div>

                {/* Supported Brokers */}
                <div>
                  <h3 className={`text-sm font-medium mb-3 ${getTextColor(theme, 'secondary')}`}>
                    Supported Brokers
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {brokers.map(broker => (
                      <div
                        key={broker.id}
                        className={`flex items-center gap-2 p-2 ${getCardBg(theme)} rounded-lg border ${getCardBorder(theme)}`}
                      >
                        <FileText className="w-4 h-4 text-[#FCD535]" />
                        <span className={`text-sm ${getTextColor(theme, 'secondary')}`}>
                          {broker.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-4 bg-[#F43F5E]/10 border border-[#F43F5E]/20 rounded-xl"
                  >
                    <AlertCircle className="w-5 h-5 text-[#F43F5E]" />
                    <span className="text-[#F43F5E] text-sm">{error}</span>
                  </motion.div>
                )}
              </div>
            )}

            {/* Step 2: Preview */}
            {step === 'preview' && preview && (
              <div className="space-y-6">
                {/* File Info */}
                <div className={`flex items-center justify-between p-4 ${getCardBg(theme)} rounded-xl border ${getCardBorder(theme)}`}>
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-[#FCD535]" />
                    <div>
                      <p className={`font-medium ${getTextColor(theme, 'primary')}`}>{fileName}</p>
                      <p className={`text-sm ${getTextColor(theme, 'muted')}`}>
                        Detected: {brokers.find(b => b.id === preview.brokerId)?.name || preview.brokerId}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${getTextColor(theme, 'primary')}`}>
                      {preview.totalTrades} trades
                    </p>
                    <p className={`text-sm ${getTextColor(theme, 'muted')}`}>
                      {preview.skippedRows} skipped
                    </p>
                  </div>
                </div>

                {/* Asset Type Selection */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${getTextColor(theme, 'secondary')}`}>
                    Default Asset Type
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['stocks', 'crypto', 'forex', 'futures', 'options'].map(type => (
                      <button
                        key={type}
                        onClick={() => setSelectedAssetType(type)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedAssetType === type
                            ? 'bg-[#FCD535] text-white'
                            : `${getCardBg(theme)} ${getTextColor(theme, 'secondary')} hover:text-white`
                        }`}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={`border-b ${getCardBorder(theme)}`}>
                        <th className={`text-left py-2 ${getTextColor(theme, 'muted')}`}>Symbol</th>
                        <th className={`text-left py-2 ${getTextColor(theme, 'muted')}`}>Side</th>
                        <th className={`text-right py-2 ${getTextColor(theme, 'muted')}`}>Qty</th>
                        <th className={`text-right py-2 ${getTextColor(theme, 'muted')}`}>Entry</th>
                        <th className={`text-right py-2 ${getTextColor(theme, 'muted')}`}>Exit</th>
                        <th className={`text-right py-2 ${getTextColor(theme, 'muted')}`}>P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.preview.map((trade, index) => (
                        <tr key={index} className={`border-b ${getCardBorder(theme)}`}>
                          <td className={`py-2 ${getTextColor(theme, 'primary')}`}>{trade.symbol}</td>
                          <td className={`py-2 ${trade.side === 'buy' || trade.side === 'long' ? 'text-[#FCD535]' : 'text-[#F43F5E]'}`}>
                            {trade.side.toUpperCase()}
                          </td>
                          <td className={`py-2 text-right ${getTextColor(theme, 'secondary')}`}>
                            {trade.quantity.toFixed(4)}
                          </td>
                          <td className={`py-2 text-right ${getTextColor(theme, 'secondary')}`}>
                            ${trade.entryPrice.toFixed(2)}
                          </td>
                          <td className={`py-2 text-right ${getTextColor(theme, 'secondary')}`}>
                            {trade.exitPrice ? `$${trade.exitPrice.toFixed(2)}` : '-'}
                          </td>
                          <td className={`py-2 text-right ${
                            trade.realizedPnl
                              ? trade.realizedPnl >= 0 ? 'text-[#FCD535]' : 'text-[#F43F5E]'
                              : getTextColor(theme, 'muted')
                          }`}>
                            {trade.realizedPnl ? `$${trade.realizedPnl.toFixed(2)}` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.totalTrades > 10 && (
                    <p className={`text-center py-2 text-sm ${getTextColor(theme, 'muted')}`}>
                      ... and {preview.totalTrades - 10} more trades
                    </p>
                  )}
                </div>

                {/* Warnings */}
                {preview.warnings.length > 0 && (
                  <div className="flex items-start gap-3 p-4 bg-[#F39C12]/10 rounded-xl">
                    <Info className="w-5 h-5 text-[#F39C12] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className={`text-sm font-medium text-[#F39C12] mb-1`}>Warnings</p>
                      <ul className="text-sm text-[#F39C12]/80 list-disc list-inside">
                        {preview.warnings.slice(0, 5).map((warning, i) => (
                          <li key={i}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-4 bg-[#F43F5E]/10 border border-[#F43F5E]/20 rounded-xl"
                  >
                    <AlertCircle className="w-5 h-5 text-[#F43F5E]" />
                    <span className="text-[#F43F5E] text-sm">{error}</span>
                  </motion.div>
                )}
              </div>
            )}

            {/* Step 3: Importing */}
            {step === 'importing' && (
              <div className="py-12 text-center">
                <Loader2 className="w-16 h-16 mx-auto mb-6 text-[#FCD535] animate-spin" />
                <h3 className={`text-xl font-semibold mb-2 ${getTextColor(theme, 'primary')}`}>
                  Importing Trades...
                </h3>
                <p className={getTextColor(theme, 'muted')}>
                  This may take a moment for large files.
                </p>
              </div>
            )}

            {/* Step 4: Success */}
            {step === 'success' && importResult && (
              <div className="py-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-20 h-20 mx-auto mb-6 bg-[#FCD535]/20 rounded-full flex items-center justify-center"
                >
                  <Check className="w-10 h-10 text-[#FCD535]" />
                </motion.div>
                <h3 className={`text-xl font-semibold mb-2 ${getTextColor(theme, 'primary')}`}>
                  Import Complete!
                </h3>
                <div className={`text-lg ${getTextColor(theme, 'secondary')} mb-6`}>
                  <p>{importResult.imported} trades imported successfully</p>
                  {importResult.skipped > 0 && (
                    <p className="text-sm">{importResult.skipped} duplicates skipped</p>
                  )}
                </div>

                {importResult.warnings.length > 0 && (
                  <div className={`text-left p-4 ${getCardBg(theme)} rounded-xl border ${getCardBorder(theme)}`}>
                    <p className={`text-sm font-medium mb-2 ${getTextColor(theme, 'secondary')}`}>
                      Warnings:
                    </p>
                    <ul className={`text-sm ${getTextColor(theme, 'muted')} list-disc list-inside`}>
                      {importResult.warnings.slice(0, 5).map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {step !== 'importing' && (
            <div className="flex items-center justify-between p-6 border-t border-[#2B2F36]">
              {step === 'preview' ? (
                <>
                  <button
                    onClick={() => { setStep('upload'); setPreview(null); setCsvContent(''); }}
                    className={`px-4 py-2 ${getTextColor(theme, 'secondary')} hover:text-white transition-colors`}
                  >
                    Back
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={!preview?.totalTrades}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#FCD535] hover:bg-[#5A2DE4] text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Import {preview?.totalTrades || 0} Trades
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              ) : step === 'success' ? (
                <div className="w-full">
                  <button
                    onClick={handleClose}
                    className="w-full px-6 py-2.5 bg-[#FCD535] hover:bg-[#5A2DE4] text-white font-medium rounded-xl transition-colors"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="w-full text-center">
                  <p className={`text-sm ${getTextColor(theme, 'muted')}`}>
                    Supported formats: CSV, TXT
                  </p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}







