import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    UploadCloud,
    Scan,
    CheckCircle2,
    ArrowRight,
    TrendingUp,
    TrendingDown,
    BarChart2,
    Target,
    History,
    AlertTriangle,
    BrainCircuit,
    X,
    Hash,
    Loader2
} from 'lucide-react';
import { createWorker } from 'tesseract.js';
import { useCreateTrade } from '@/react-app/hooks/useTrades';

// --- Types ---

interface TradeData {
    symbol: string;
    entryPrice: number;
    exitPrice: number;
    side: 'long' | 'short';
    size: number;
}

interface TradeImportWizardProps {
    onComplete?: (data: any) => void;
    onClose?: () => void;
}

// --- OCR Text Parsing Functions ---

function parseSymbol(text: string): string {
    // Look for trading pairs like BTCUSDT, ETH/USD, BTC-USD, etc.
    const patterns = [
        /([A-Z]{2,10})(USDT|USD|EUR|BTC|ETH|GBP|JPY)/i,
        /([A-Z]{2,10})\/(USDT|USD|EUR|BTC|ETH|GBP|JPY)/i,
        /([A-Z]{2,10})-(USDT|USD|EUR|BTC|ETH|GBP|JPY)/i,
        /([A-Z]{2,10})\s+(USDT|USD|EUR|BTC|ETH|GBP|JPY)/i,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            return match[0].replace(/[\/\-\s]/g, '').toUpperCase();
        }
    }

    // Fallback: look for any 3-10 letter uppercase sequence
    const fallback = text.match(/[A-Z]{3,10}/);
    return fallback ? fallback[0] : '';
}

function parsePrices(text: string): { entry: number; exit: number } {
    // Find all numbers that could be prices (with or without $)
    const pricePattern = /\$?([\d,]+\.?\d*)/g;
    const matches = Array.from(text.matchAll(pricePattern));
    const prices = matches
        .map(m => parseFloat(m[1].replace(/,/g, '')))
        .filter(p => p > 0 && p < 1000000) // Reasonable price range
        .sort((a, b) => a - b);

    if (prices.length >= 2) {
        return {
            entry: prices[0],
            exit: prices[prices.length - 1]
        };
    } else if (prices.length === 1) {
        return {
            entry: prices[0],
            exit: prices[0]
        };
    }

    return { entry: 0, exit: 0 };
}

function parseSide(text: string): 'long' | 'short' {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('short') || lowerText.includes('sell')) {
        return 'short';
    }
    return 'long'; // Default to long
}

function parseSize(text: string): number {
    // Look for numbers that could be position size
    const sizePattern = /(?:size|qty|quantity|amount|units?)[\s:]*([\d,]+\.?\d*)/i;
    const match = text.match(sizePattern);
    if (match) {
        return parseFloat(match[1].replace(/,/g, ''));
    }

    // Look for standalone small numbers (likely size, not price)
    const numbers = text.match(/\b([\d,]+\.?\d*)\b/g);
    if (numbers) {
        const parsed = numbers.map(n => parseFloat(n.replace(/,/g, '')));
        // Size is usually smaller than prices
        const smallNumbers = parsed.filter(n => n > 0 && n < 1000);
        if (smallNumbers.length > 0) {
            return smallNumbers[0];
        }
    }

    return 0;
}

function extractTradeDataFromText(text: string): TradeData {
    const symbol = parseSymbol(text);
    const prices = parsePrices(text);
    const side = parseSide(text);
    const size = parseSize(text);

    return {
        symbol: symbol || '',
        entryPrice: prices.entry,
        exitPrice: prices.exit || prices.entry,
        side,
        size: size || 1
    };
}

// --- Components ---

export const TradeImportWizard: React.FC<TradeImportWizardProps> = ({ onComplete, onClose }) => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [isDragging, setIsDragging] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [ocrProgress, setOcrProgress] = useState(0);
    const [ocrStatus, setOcrStatus] = useState('');
    const [ocrError, setOcrError] = useState<string | null>(null);

    // Step 2 Data
    const [tradeData, setTradeData] = useState<TradeData>({
        symbol: '',
        entryPrice: 0,
        exitPrice: 0,
        side: 'long',
        size: 0
    });

    // Step 3 Data
    const [emotionScore, setEmotionScore] = useState(50); // 0-100
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const dragCounter = useRef(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const createTrade = useCreateTrade();

    // --- Actions ---

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current++;
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current === 0) {
            setIsDragging(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        dragCounter.current = 0;

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleFileUpload(files[0]);
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFileUpload(files[0]);
        }
    };

    const handleFileUpload = async (file: File) => {
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
            setOcrError('Please upload an image file (PNG, JPG, JPEG, WEBP)');
            return;
        }

        setOcrError(null);
        await performOCR(file);
    };

    const performOCR = async (file: File) => {
        console.log('🔍 Starting OCR for file:', file.name, file.type, `${(file.size / 1024).toFixed(2)} KB`);
        setIsScanning(true);
        setOcrProgress(0);
        setOcrStatus('Initializing OCR...');

        try {
            // Check if Tesseract is available
            if (typeof createWorker === 'undefined') {
                throw new Error('Tesseract.js is not loaded. Please refresh the page.');
            }

            // Tesseract.js v7 - using type assertion due to type definition mismatch
            const createWorkerWithLogger = createWorker as any;
            
            setOcrStatus('Loading OCR engine...');
            const worker = await createWorkerWithLogger({
                logger: (m: any) => {
                    console.log('📊 OCR Progress:', m);
                    if (m.status === 'recognizing text' && m.progress !== undefined) {
                        const progress = Math.round(m.progress * 100);
                        setOcrProgress(progress);
                        setOcrStatus(`Recognizing text... ${progress}%`);
                    } else if (m.status) {
                        setOcrStatus(m.status);
                    }
                }
            });

            setOcrStatus('Loading language model...');
            await (worker as any).loadLanguage('eng');
            
            console.log('⚙️ Initializing worker...');
            setOcrStatus('Initializing...');
            await (worker as any).initialize('eng');
            
            setOcrStatus('Recognizing text...');
            const { data } = await worker.recognize(file);
            console.log('✅ OCR Complete. Extracted text length:', data.text?.length);
            console.log('📝 Extracted text preview:', data.text?.substring(0, 200));

            await worker.terminate();

            if (!data.text || data.text.trim().length === 0) {
                throw new Error('No text could be extracted from the image. Please ensure the image contains readable text.');
            }

            setOcrStatus('Extracting trade data...');
            
            // Extract trade data from OCR text
            const extractedData = extractTradeDataFromText(data.text);
            
            // If no data was extracted, show a warning but still proceed
            if (!extractedData.symbol && extractedData.entryPrice === 0) {
                setOcrError('Could not automatically extract trade data. Please enter manually.');
            }
            
            setTradeData(extractedData);
            setIsScanning(false);
            setStep(2);
        } catch (error) {
            console.error('❌ OCR Error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            setOcrError(`Failed to process image: ${errorMessage}. You can enter data manually.`);
            setIsScanning(false);
            // Still proceed to step 2 with empty data for manual entry
            setTimeout(() => {
                setStep(2);
            }, 2000);
        }
    };

    const handleTagToggle = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter(t => t !== tag));
        } else {
            setSelectedTags([...selectedTags, tag]);
        }
    };

    const finishWizard = async () => {
        setIsSubmitting(true);

        try {
            // Map wizard data to API format
            const now = new Date().toISOString().split('T')[0];
            const emotionLabel = getEmotionLabel(emotionScore).text;
            
            const tradePayload = {
                symbol: tradeData.symbol,
                asset_type: 'crypto' as const,
                direction: tradeData.side,
                quantity: tradeData.size || 1,
                entry_price: tradeData.entryPrice,
                exit_price: tradeData.exitPrice > 0 ? tradeData.exitPrice : undefined,
                entry_date: now,
                exit_date: tradeData.exitPrice > 0 ? now : undefined,
                emotion: `${emotionLabel} (${emotionScore})`,
                mistakes: selectedTags.filter(t => ['revenge', 'chase', 'early', 'fomo'].includes(t)).join(', ') || undefined,
                tags: selectedTags.filter(t => ['perfect'].includes(t)).join(', ') || undefined,
                notes: `Emotion: ${emotionLabel}, Tags: ${selectedTags.join(', ')}`
            };

            await createTrade.mutate(tradePayload);

            if (onComplete) {
                onComplete(tradePayload);
            }
        } catch (error) {
            console.error('Failed to save trade:', error);
            setOcrError('Failed to save trade. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Render Helpers ---

    const getEmotionLabel = (score: number) => {
        if (score < 35) return { text: "Fear / Hesitation", color: "text-rose-500" };
        if (score > 65) return { text: "Greed / FOMO", color: "text-amber-500" };
        return { text: "Flow / Calm", color: "text-emerald-400" };
    };

    const getEmotionColor = (score: number) => {
        if (score < 35) return '#f43f5e'; // Rose 500
        if (score > 65) return '#f59e0b'; // Amber 500
        return '#34d399'; // Emerald 400
    };

    return (
        <div className="w-full max-w-4xl mx-auto bg-[#0f172a] text-slate-200 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 font-sans relative min-h-[600px] flex flex-col">

            {/* Header / Progress */}
            <div className="absolute top-0 left-0 w-full h-1 bg-slate-800 z-10">
                <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                    initial={{ width: "0%" }}
                    animate={{ width: `${(step / 3) * 100}%` }}
                    transition={{ duration: 0.5 }}
                />
            </div>

            {/* Close Button */}
            {onClose && (
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white transition-colors z-20 rounded-lg hover:bg-slate-800/50"
                >
                    <X className="w-6 h-6" />
                </button>
            )}

            <div className="flex-1 relative p-8 md:p-12 flex flex-col items-center justify-center">
                <AnimatePresence mode="wait">

                    {/* --- STEP 1: MAGIC DROP --- */}
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full h-full flex flex-col items-center justify-center"
                        >
                            <div
                                className={`relative group cursor-pointer w-full max-w-lg aspect-square rounded-full flex flex-col items-center justify-center transition-all duration-500
                                    ${isDragging ? 'bg-blue-500/10 scale-105 border-blue-400' : 'bg-slate-900 border-slate-700 hover:border-slate-500'}
                                    border-2 border-dashed
                                `}
                                onDragEnter={handleDragEnter}
                                onDragLeave={handleDragLeave}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={handleFileInput}
                                />

                                {/* Radar / Scanning Effect */}
                                {isScanning && (
                                    <div className="absolute inset-0 rounded-full overflow-hidden">
                                        <motion.div
                                            className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                            style={{ transformOrigin: "center" }}
                                        />
                                        <div className="absolute inset-4 rounded-full border border-blue-500/30 animate-ping" style={{ animationDuration: '3s' }}></div>
                                        <div className="absolute inset-8 rounded-full border border-blue-500/20 animate-ping" style={{ animationDuration: '4s', animationDelay: '0.5s' }}></div>
                                    </div>
                                )}

                                <div className="z-10 flex flex-col items-center space-y-6 text-center p-6">
                                    <motion.div
                                        animate={isScanning ? { scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] } : {}}
                                        transition={{ repeat: Infinity, duration: 1.5 }}
                                    >
                                        {isScanning ? (
                                            <Scan className="w-20 h-20 text-blue-400" />
                                        ) : (
                                            <UploadCloud className={`w-20 h-20 ${isDragging ? 'text-blue-400' : 'text-slate-500 group-hover:text-blue-400 transition-colors'}`} />
                                        )}
                                    </motion.div>

                                    <div className="space-y-2">
                                        <h2 className="text-3xl font-bold tracking-tight text-white">
                                            {isScanning ? (ocrStatus || "Analyzing Chart...") : "Drop your Chart here to analyze"}
                                        </h2>
                                        <p className="text-slate-400 text-lg">
                                            {isScanning ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    {ocrProgress > 0 ? `${ocrProgress}%` : ocrStatus}
                                                </span>
                                            ) : (
                                                "AI will auto-detect entry, exit & setup"
                                            )}
                                        </p>
                                    </div>

                                    {ocrError && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="mt-4 px-4 py-2 bg-rose-500/20 border border-rose-500/50 rounded-lg text-rose-400 text-sm max-w-md"
                                        >
                                            <div className="flex items-start gap-2">
                                                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                                <span>{ocrError}</span>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* --- STEP 2: DATA VERIFY (HUD) --- */}
                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="w-full max-w-3xl"
                        >
                            <div className="text-center mb-10">
                                <h2 className="text-2xl font-bold text-slate-300 uppercase tracking-widest mb-1">Flight Check</h2>
                                <div className="h-1 w-20 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                                {/* SYMBOL & SIDE */}
                                <div className="col-span-1 md:col-span-2 flex items-center justify-between bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 hover:border-blue-500/30 transition-colors">
                                    <div className="flex items-center space-x-4 flex-1">
                                        <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-500 flex-shrink-0">
                                            <Target className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-xs text-slate-500 font-mono uppercase">Asset Pair</label>
                                            <input
                                                type="text"
                                                value={tradeData.symbol}
                                                onChange={(e) => setTradeData({ ...tradeData, symbol: e.target.value.toUpperCase() })}
                                                className="block w-full bg-transparent text-3xl font-bold text-white focus:outline-none focus:ring-0 border-none p-0 uppercase placeholder-slate-600"
                                                placeholder="BTCUSDT"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700 ml-4">
                                        {['long', 'short'].map((side) => (
                                            <button
                                                key={side}
                                                onClick={() => setTradeData({ ...tradeData, side: side as 'long' | 'short' })}
                                                className={`
                                                    px-6 py-2 rounded-md font-bold uppercase text-sm transition-all
                                                    ${tradeData.side === side
                                                        ? (side === 'long' ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-rose-500/20 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]')
                                                        : 'text-slate-500 hover:text-slate-300'
                                                    }
                                                `}
                                            >
                                                {side}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* ENTRY PRICE */}
                                <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50 group hover:border-blue-500/30 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <label className="text-xs text-slate-500 font-mono uppercase flex items-center gap-1">
                                            <TrendingUp className="w-3 h-3" /> Entry Price
                                        </label>
                                    </div>
                                    <div className="flex items-baseline">
                                        <span className="text-slate-500 text-xl mr-1">$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={tradeData.entryPrice || ''}
                                            onChange={(e) => setTradeData({ ...tradeData, entryPrice: parseFloat(e.target.value) || 0 })}
                                            className="w-full bg-transparent text-4xl font-mono font-medium text-white focus:outline-none"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                {/* EXIT PRICE */}
                                <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50 group hover:border-blue-500/30 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <label className="text-xs text-slate-500 font-mono uppercase flex items-center gap-1">
                                            <TrendingDown className="w-3 h-3" /> Target / Exit
                                        </label>
                                    </div>
                                    <div className="flex items-baseline">
                                        <span className="text-slate-500 text-xl mr-1">$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={tradeData.exitPrice || ''}
                                            onChange={(e) => setTradeData({ ...tradeData, exitPrice: parseFloat(e.target.value) || 0 })}
                                            className="w-full bg-transparent text-4xl font-mono font-medium text-white focus:outline-none"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                {/* SIZE / QTY */}
                                <div className="col-span-1 md:col-span-2 bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50 flex items-center justify-between">
                                    <div className="flex-1">
                                        <label className="text-xs text-slate-500 font-mono uppercase flex items-center gap-1">
                                            <Hash className="w-3 h-3" /> Position Size (Units)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={tradeData.size || ''}
                                            onChange={(e) => setTradeData({ ...tradeData, size: parseFloat(e.target.value) || 0 })}
                                            className="w-full bg-transparent text-3xl font-mono font-medium text-white focus:outline-none mt-1"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="text-right ml-8">
                                        <div className="text-xs text-slate-500 uppercase mb-1">Est. PnL</div>
                                        <div className={`text-2xl font-bold ${(tradeData.exitPrice - tradeData.entryPrice) * (tradeData.side === 'long' ? 1 : -1) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            ${((tradeData.exitPrice - tradeData.entryPrice) * (tradeData.side === 'long' ? 1 : -1) * (tradeData.size || 0)).toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setStep(3)}
                                disabled={!tradeData.symbol || !tradeData.entryPrice}
                                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 group"
                            >
                                Confirm & Continue <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </motion.button>
                        </motion.div>
                    )}

                    {/* --- STEP 3: MENTAL CHECK --- */}
                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full max-w-2xl"
                        >
                            <div className="text-center mb-12">
                                <h2 className="text-3xl font-bold text-white mb-2">Psychology Check</h2>
                                <p className="text-slate-400">Trading determines your wallet, psychology determines your wealth.</p>
                            </div>

                            {/* Emotion Slider */}
                            <div className="mb-12 relative px-4">
                                <label className="block text-center text-sm font-bold text-slate-400 uppercase mb-6">
                                    How did you feel at Entry?
                                </label>
                                <div className="flex justify-between text-sm font-bold uppercase tracking-wider mb-6">
                                    <span className="text-rose-400">Fear</span>
                                    <span className="text-emerald-400">Flow</span>
                                    <span className="text-amber-400">Greed</span>
                                </div>

                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={emotionScore}
                                    onChange={(e) => setEmotionScore(parseInt(e.target.value))}
                                    className="w-full h-4 bg-slate-800 rounded-full appearance-none cursor-pointer focus:outline-none slider-thumb-custom"
                                    style={{
                                        background: `linear-gradient(to right, #f43f5e 0%, #34d399 50%, #f59e0b 100%)`
                                    }}
                                />

                                <div className="mt-4 text-center">
                                    <motion.span
                                        initial={{ scale: 0.9 }}
                                        animate={{ scale: 1 }}
                                        className={`inline-block px-4 py-2 rounded-full text-sm font-bold border ${getEmotionLabel(emotionScore).color.replace('text-', 'border-')} bg-opacity-10`}
                                        style={{ color: getEmotionColor(emotionScore) }}
                                    >
                                        {getEmotionLabel(emotionScore).text}
                                    </motion.span>
                                </div>
                            </div>

                            {/* Tags */}
                            <div className="mb-12">
                                <label className="block text-center text-sm font-bold text-slate-500 uppercase mb-4">
                                    Quick Tags
                                </label>
                                <div className="flex flex-wrap justify-center gap-3">
                                    {[
                                        { id: 'perfect', label: 'A+ Setup', icon: CheckCircle2, color: 'hover:border-emerald-500 hover:text-emerald-400' },
                                        { id: 'chase', label: 'Chased Price', icon: TrendingUp, color: 'hover:border-purple-500 hover:text-purple-400' },
                                        { id: 'revenge', label: 'Revenge Trade', icon: BrainCircuit, color: 'hover:border-rose-500 hover:text-rose-400' },
                                        { id: 'early', label: 'Missed Exit', icon: History, color: 'hover:border-blue-500 hover:text-blue-400' },
                                        { id: 'fomo', label: 'FOMO', icon: AlertTriangle, color: 'hover:border-amber-500 hover:text-amber-400' },
                                    ].map((tag) => {
                                        const isSelected = selectedTags.includes(tag.id);
                                        const Icon = tag.icon;
                                        return (
                                            <motion.button
                                                key={tag.id}
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => handleTagToggle(tag.id)}
                                                className={`
                                                    px-4 py-3 rounded-xl border flex items-center gap-2 text-sm font-semibold transition-all
                                                    ${isSelected
                                                        ? 'bg-slate-700 border-slate-500 text-white shadow-lg shadow-black/20'
                                                        : `bg-slate-800/50 border-slate-700 text-slate-400 ${tag.color}`
                                                    }
                                                `}
                                            >
                                                <Icon className="w-4 h-4" />
                                                {tag.label}
                                            </motion.button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Finish Button */}
                            <motion.button
                                whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                                whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                                onClick={finishWizard}
                                disabled={isSubmitting}
                                className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-xl shadow-xl shadow-blue-900/30 flex items-center justify-center gap-3"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                <BarChart2 className="w-6 h-6" />
                                Log Execution
                                    </>
                                )}
                            </motion.button>

                            {ocrError && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-4 px-4 py-2 bg-rose-500/20 border border-rose-500/50 rounded-lg text-rose-400 text-sm text-center"
                                >
                                    {ocrError}
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Custom CSS for Range Slider */}
            <style>{`
                input[type=range]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    height: 24px;
                    width: 24px;
                    border-radius: 50%;
                    background: #ffffff;
                    cursor: pointer;
                    margin-top: -4px;
                    box-shadow: 0 0 10px rgba(0,0,0,0.5);
                    border: 4px solid #1e293b;
                }
                input[type=range]::-moz-range-thumb {
                    height: 24px;
                    width: 24px;
                    border-radius: 50%;
                    background: #ffffff;
                    cursor: pointer;
                    box-shadow: 0 0 10px rgba(0,0,0,0.5);
                    border: 4px solid #1e293b;
                }
            `}</style>
        </div>
    );
};
