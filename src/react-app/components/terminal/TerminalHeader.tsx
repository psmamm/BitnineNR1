/**
 * Terminal Header Component
 * 
 * Displays symbol selector, current price, and market statistics (Mark, Index, 24h High/Low, Volume, OI, Funding).
 * Bybit UTA 2.0 style header bar.
 */

import { useState } from 'react';
import { Star, ChevronDown, Settings, Bot } from 'lucide-react';
import { useSymbol } from '../../contexts/SymbolContext';
import { PortfolioHeader } from './PortfolioHeader';
import type { Symbol, TerminalStats } from '../../types/terminal';

interface TerminalHeaderProps {
  currentPrice: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  stats?: TerminalStats;
  onAICloneToggle?: () => void;
  isAIClonePanelOpen?: boolean;
}

const SYMBOLS: Symbol[] = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT'];

export function TerminalHeader({
  currentPrice,
  priceChange24h,
  priceChangePercent24h,
  stats,
  onAICloneToggle,
  isAIClonePanelOpen = false,
}: TerminalHeaderProps) {
  const { symbol, setSymbol } = useSymbol();
  const [isSymbolDropdownOpen, setIsSymbolDropdownOpen] = useState(false);

  const isPositive = priceChange24h >= 0;
  const priceColor = isPositive ? 'text-[#2EAD65]' : 'text-[#F6465D]';

  return (
    <header className="h-14 bg-[#161A1E] border-b border-[#2B2F36] flex items-center px-4 shrink-0 terminal-panel">
      <div className="flex items-center gap-6 flex-1">
        {/* Symbol Selector */}
        <div className="relative flex items-center gap-2">
          <Star className="w-4 h-4 text-[#848E9C] hover:text-[#FCD535] cursor-pointer" />
          <div className="relative">
            <button
              onClick={() => setIsSymbolDropdownOpen(!isSymbolDropdownOpen)}
              className="flex items-center gap-2 text-[#EAECEF] font-semibold text-lg hover:text-[#FCD535] transition-colors"
            >
              <span>{symbol}</span>
              <span className="text-[#848E9C] text-xs bg-[#2B2F36] px-1.5 py-0.5 rounded">Perpetual</span>
              <ChevronDown className="w-4 h-4 text-[#848E9C]" />
            </button>
            
            {isSymbolDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 bg-[#161A1E] border border-[#2B2F36] rounded shadow-lg z-50 min-w-[200px]">
                {SYMBOLS.map((sym) => (
                  <button
                    key={sym}
                    onClick={() => {
                      setSymbol(sym);
                      setIsSymbolDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-[#2B2F36] transition-colors ${
                      sym === symbol ? 'text-[#FCD535]' : 'text-[#EAECEF]'
                    }`}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Price Display */}
        <div className="flex items-center gap-3">
          <span className={`text-xl font-mono font-semibold ${priceColor}`}>
            {currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className={`text-xs ${priceColor}`}>
            {isPositive ? '+' : ''}{priceChangePercent24h.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 text-xs">
        {stats && (
          <>
            <div className="flex flex-col">
              <span className="text-[#848E9C]">Mark</span>
              <span className="text-[#EAECEF] font-mono">{stats.mark.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[#848E9C]">Index</span>
              <span className="text-[#EAECEF] font-mono">{stats.index.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[#848E9C]">24h High</span>
              <span className="text-[#EAECEF] font-mono">{stats.high24h.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[#848E9C]">24h Low</span>
              <span className="text-[#EAECEF] font-mono">{stats.low24h.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[#848E9C]">24h Vol(BTC)</span>
              <span className="text-[#EAECEF] font-mono">{stats.volume24h.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[#848E9C]">Open Interest</span>
              <span className="text-[#EAECEF] font-mono">${(stats.openInterest / 1e9).toFixed(2)}B</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[#848E9C]">Funding</span>
              <span className={`font-mono ${stats.fundingRate >= 0 ? 'text-[#2EAD65]' : 'text-[#F6465D]'}`}>
                {(stats.fundingRate * 100).toFixed(4)}%
              </span>
            </div>
          </>
        )}
        {/* Divider */}
        <div className="w-px h-6 bg-[#2B2F36] mx-2" />

        {/* Portfolio Header */}
        <PortfolioHeader />

        {/* AI Clone Toggle */}
        {onAICloneToggle && (
          <button
            onClick={onAICloneToggle}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              isAIClonePanelOpen
                ? 'bg-[#FCD535]/20 text-[#FCD535] border border-[#FCD535]/50'
                : 'bg-[#2B2F36]/50 text-[#848E9C] hover:text-[#EAECEF] border border-transparent hover:border-[#2B2F36]'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span className="text-xs font-medium">AI Clone</span>
          </button>
        )}

        <Settings className="w-4 h-4 text-[#848E9C] hover:text-[#EAECEF] cursor-pointer ml-2" />
      </div>
    </header>
  );
}
