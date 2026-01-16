/**
 * Portfolio Header Component
 *
 * Displays aggregated portfolio balance from all connected exchanges
 * in the terminal header bar.
 */

import { useState } from 'react';
import { Wallet, ChevronDown, RefreshCw } from 'lucide-react';
import { useMultiExchangePortfolio } from '../../hooks/useMultiExchangePortfolio';

export function PortfolioHeader() {
  const { portfolio, loading, refresh } = useMultiExchangePortfolio();
  const [showDropdown, setShowDropdown] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const pnlColor = portfolio.pnlPercentage24h >= 0 ? 'text-[#2EAD65]' : 'text-[#F6465D]';

  return (
    <div className="relative flex items-center gap-3">
      {/* Portfolio Summary */}
      <div
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#2B2F36]/50 hover:bg-[#2B2F36] transition-colors cursor-pointer border border-[#2B2F36] hover:border-[#03AAC7]/30"
      >
        <Wallet className="w-4 h-4 text-[#03AAC7]" />

        {loading ? (
          <div className="flex items-center gap-2">
            <RefreshCw className="w-3 h-3 animate-spin text-[#848E9C]" />
            <span className="text-xs text-[#848E9C]">Loading...</span>
          </div>
        ) : (
          <>
            <div className="flex flex-col">
              <span className="text-[10px] text-[#848E9C]">Total Equity</span>
              <span className="text-sm font-mono font-semibold text-[#EAECEF]">
                {formatCurrency(portfolio.totalEquityUsd)}
              </span>
            </div>

            {portfolio.pnlPercentage24h !== 0 && (
              <span className={`text-xs font-mono ${pnlColor}`}>
                {portfolio.pnlPercentage24h >= 0 ? '+' : ''}
                {portfolio.pnlPercentage24h.toFixed(2)}%
              </span>
            )}

            <ChevronDown className={`w-3 h-3 text-[#848E9C] transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </>
        )}
      </div>

      {/* Dropdown with Exchange Breakdown */}
      {showDropdown && !loading && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-[#161A1E] border border-[#2B2F36] rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2B2F36]">
            <span className="text-sm font-medium text-[#EAECEF]">Portfolio Overview</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                refresh();
              }}
              className="p-1 hover:bg-[#2B2F36] rounded transition-colors"
            >
              <RefreshCw className="w-3 h-3 text-[#848E9C]" />
            </button>
          </div>

          {/* Summary */}
          <div className="px-4 py-3 bg-[#0B0E11]/50">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] text-[#848E9C]">Total Equity</span>
                <p className="text-lg font-mono font-semibold text-[#EAECEF]">
                  {formatCurrency(portfolio.totalEquityUsd)}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-[#848E9C]">Available</span>
                <p className="text-lg font-mono font-semibold text-[#03AAC7]">
                  {formatCurrency(portfolio.availableBalanceUsd)}
                </p>
              </div>
            </div>
            {portfolio.unrealizedPnl !== 0 && (
              <div className="mt-2 pt-2 border-t border-[#2B2F36]">
                <span className="text-[10px] text-[#848E9C]">Unrealized P&L</span>
                <p className={`text-sm font-mono font-semibold ${pnlColor}`}>
                  {portfolio.unrealizedPnl >= 0 ? '+' : ''}
                  {formatCurrency(portfolio.unrealizedPnl)}
                </p>
              </div>
            )}
          </div>

          {/* Exchange Breakdown */}
          {portfolio.exchanges.length > 0 && (
            <div className="px-4 py-3 border-t border-[#2B2F36]">
              <span className="text-[10px] text-[#848E9C] uppercase tracking-wide">Exchanges</span>
              <div className="mt-2 space-y-2">
                {portfolio.exchanges.map((exchange) => (
                  <div
                    key={exchange.exchange}
                    className="flex items-center justify-between py-1"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{exchange.exchangeIcon}</span>
                      <span className="text-xs text-[#EAECEF] capitalize">{exchange.exchange}</span>
                      {!exchange.isConnected && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F6465D]/20 text-[#F6465D]">
                          Offline
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono text-[#EAECEF]">
                      {formatCurrency(exchange.totalEquityUsd)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {portfolio.exchanges.length === 0 && (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-[#848E9C]">No exchanges connected</p>
              <p className="text-[10px] text-[#848E9C] mt-1">
                Go to Settings → API to connect exchanges
              </p>
            </div>
          )}

          {/* Last Updated */}
          {portfolio.lastUpdated && (
            <div className="px-4 py-2 border-t border-[#2B2F36] bg-[#0B0E11]/30">
              <span className="text-[10px] text-[#848E9C]">
                Updated {portfolio.lastUpdated.toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
