/**
 * Risk-First Deal Ticket Component
 * 
 * Implements mathematical position sizing based on Fiat risk amount.
 * Integrates with Kill Switch (MDL 5% / ML 10%) and Bybit V5 API.
 * 
 * Styling: Bybit Dark Mode Clone Strategy
 */

import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { calculatePositionSize, calculateBybitPositionSize, type BybitPositionSizeResult } from '../../utils/riskCalculator';
import { useKillSwitch } from '../../hooks/useKillSwitch';
import { useRiskEngine } from '../../hooks/useRiskEngine';
import { buildApiUrl } from '../../hooks/useApi';

type OrderType = 'LIMIT' | 'MARKET' | 'CONDITIONAL';

interface RiskFirstDealTicketProps {
  currentPrice?: number;
  symbol?: string;
  exchangeConnectionId?: string; // Bybit connection ID
}

export default function RiskFirstDealTicket({ 
  currentPrice = 98500, 
  symbol = 'BTCUSDT',
  exchangeConnectionId 
}: RiskFirstDealTicketProps) {
  const baseAsset = symbol.replace(/USDT$|USD$|BUSD$/, '');
  
  const [orderType, setOrderType] = useState<OrderType>('LIMIT');
  const [price, setPrice] = useState<number>(currentPrice);
  const [stopLoss, setStopLoss] = useState<number>(currentPrice * 0.98);
  const [takeProfit, setTakeProfit] = useState<number>(currentPrice * 1.04);
  const [riskAmount, setRiskAmount] = useState<number>(50);
  const [leverage, setLeverage] = useState<number>(10);
  const [marginMode, setMarginMode] = useState<'isolated' | 'cross'>('isolated');
  const [showMarginDropdown, setShowMarginDropdown] = useState(false);
  const [availableBalance, setAvailableBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { killSwitch } = useKillSwitch({ calculatedRisk: riskAmount });
  const { enforceTrade } = useRiskEngine([]);

  // Update prices when currentPrice changes
  useEffect(() => {
    setPrice(currentPrice);
    setStopLoss(currentPrice * 0.98);
    setTakeProfit(currentPrice * 1.04);
  }, [currentPrice]);

  // Calculate position size using risk-first formula
  const positionSizeResult: BybitPositionSizeResult = useMemo(() => {
    if (availableBalance > 0 && exchangeConnectionId) {
      return calculateBybitPositionSize({
        riskAmount,
        entryPrice: price,
        stopLossPrice: stopLoss,
        pointValue: 1, // Crypto
        leverage,
        marginMode,
        availableBalance,
        accountType: 'UNIFIED',
        positionMode: 'One-Way'
      });
    }
    // Return a default BybitPositionSizeResult when no balance available
    return {
      ...calculatePositionSize({
        riskAmount,
        entryPrice: price,
        stopLossPrice: stopLoss,
        pointValue: 1,
        leverage,
        marginMode
      }),
      availableBalance: 0,
      accountType: 'UNIFIED',
      canOpen: false,
      reason: 'No balance available'
    };
  }, [riskAmount, price, stopLoss, leverage, marginMode, availableBalance, exchangeConnectionId]);

  // Fetch available balance from Bybit
  useEffect(() => {
    if (exchangeConnectionId) {
      fetchAvailableBalance();
    }
  }, [exchangeConnectionId]);

  const fetchAvailableBalance = async () => {
    try {
      // This would call your backend API to get Bybit balance
      // For now, using a placeholder
      const response = await fetch(buildApiUrl(`/api/exchange-connections/${exchangeConnectionId}/balance`), {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setAvailableBalance(data.availableBalance || 0);
      }
    } catch (err) {
      console.error('Failed to fetch balance:', err);
    }
  };

  // Validate trade with Kill Switch
  const validateTrade = () => {
    if (!positionSizeResult.isValid) {
      return { valid: false, reason: positionSizeResult.errors.join(', ') };
    }

    // Check Kill Switch
    if (killSwitch.isBlocked) {
      return { valid: false, reason: killSwitch.reason || 'Trading blocked by Kill Switch' };
    }

    // Check Risk Engine
    const side = price > stopLoss ? 'Long' : 'Short';
    const enforcement = enforceTrade({
      side,
      entryPrice: price,
      stopLoss,
      size: positionSizeResult.positionSize,
      leverage
    });

    if (enforcement.blocked) {
      return { valid: false, reason: enforcement.reasons.join(', ') };
    }

    return { valid: true };
  };

  const handleBuyLong = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const validation = validateTrade();
      if (!validation.valid) {
        setError(validation.reason || 'Trade validation failed');
        return;
      }

      // Execute order via backend
      const response = await fetch(buildApiUrl('/api/orders/bybit'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          connectionId: exchangeConnectionId,
          symbol,
          side: 'Buy',
          orderType: orderType === 'MARKET' ? 'Market' : 'Limit',
          qty: positionSizeResult.positionSize.toString(),
          price: orderType === 'MARKET' ? undefined : price.toString(),
          stopLoss: stopLoss.toString(),
          takeProfit: takeProfit.toString(),
          leverage: leverage.toString(),
          marginMode,
          category: 'linear' // Bybit linear futures
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Order execution failed');
      }

      setSuccess('Order placed successfully');
      // Reset form after delay
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute order');
    } finally {
      setLoading(false);
    }
  };

  const handleSellShort = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const validation = validateTrade();
      if (!validation.valid) {
        setError(validation.reason || 'Trade validation failed');
        return;
      }

      // Execute order via backend
      const response = await fetch(buildApiUrl('/api/orders/bybit'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          connectionId: exchangeConnectionId,
          symbol,
          side: 'Sell',
          orderType: orderType === 'MARKET' ? 'Market' : 'Limit',
          qty: positionSizeResult.positionSize.toString(),
          price: orderType === 'MARKET' ? undefined : price.toString(),
          stopLoss: stopLoss.toString(),
          takeProfit: takeProfit.toString(),
          leverage: leverage.toString(),
          marginMode,
          category: 'linear'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Order execution failed');
      }

      setSuccess('Order placed successfully');
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute order');
    } finally {
      setLoading(false);
    }
  };

  const isTradeBlocked = killSwitch.isBlocked || !positionSizeResult.isValid || !positionSizeResult.canOpen;
  const canExecute = !isTradeBlocked && !loading && positionSizeResult.positionSize > 0;

  return (
    <div className="h-full flex flex-col bg-[#1e2026] text-[#eaecef] text-xs">
      {/* Kill Switch Warning Banner */}
      {killSwitch.isBlocked && (
        <div className="bg-[#f6465d]/10 border-b border-[#f6465d]/30 px-3 py-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#f6465d] flex-shrink-0" />
          <div className="flex-1">
            <div className="text-[#f6465d] font-medium text-xs">Kill Switch Active</div>
            <div className="text-[#848e9c] text-[10px]">{killSwitch.reason}</div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-[#2ead65]/10 border-b border-[#2ead65]/30 px-3 py-2 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#2ead65] flex-shrink-0" />
          <div className="text-[#2ead65] font-medium text-xs">{success}</div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-[#f6465d]/10 border-b border-[#f6465d]/30 px-3 py-2 flex items-center gap-2">
          <XCircle className="w-4 h-4 text-[#f6465d] flex-shrink-0" />
          <div className="text-[#f6465d] font-medium text-xs">{error}</div>
        </div>
      )}

      {/* Order Type Tabs */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2b3139]">
        <div className="flex gap-4">
          {(['LIMIT', 'MARKET', 'CONDITIONAL'] as OrderType[]).map((type) => (
            <button
              key={type}
              onClick={() => setOrderType(type)}
              className={`text-xs font-medium pb-1 transition-colors ${
                orderType === type
                  ? 'text-[#FCD535] border-b-2 border-[#FCD535]'
                  : 'text-[#848e9c] hover:text-[#eaecef]'
              }`}
            >
              {type.charAt(0) + type.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        
        {/* Margin Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowMarginDropdown(!showMarginDropdown)}
            className="flex items-center gap-1 text-[#848e9c] hover:text-[#eaecef] bg-[#2b3139] px-2 py-1 rounded text-xs"
          >
            <span>{marginMode === 'isolated' ? 'Isolated' : 'Cross'} {leverage}x</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          
          {showMarginDropdown && (
            <div className="absolute right-0 top-full mt-1 bg-[#2b3139] rounded shadow-xl z-50 w-36">
              <div className="p-2 border-b border-[#1e2026]">
                <div className="flex gap-1 mb-2">
                  <button
                    onClick={() => setMarginMode('cross')}
                    className={`flex-1 text-xs py-1 rounded ${marginMode === 'cross' ? 'bg-[#FCD535] text-black' : 'bg-[#1e2026] text-[#848e9c]'}`}
                  >
                    Cross
                  </button>
                  <button
                    onClick={() => setMarginMode('isolated')}
                    className={`flex-1 text-xs py-1 rounded ${marginMode === 'isolated' ? 'bg-[#FCD535] text-black' : 'bg-[#1e2026] text-[#848e9c]'}`}
                  >
                    Isolated
                  </button>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={leverage}
                  onChange={(e) => setLeverage(Number(e.target.value))}
                  className="w-full h-1 bg-[#1e2026] rounded appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#848e9c] mt-1">
                  <span>1x</span>
                  <span className="text-[#FCD535]">{leverage}x</span>
                  <span>100x</span>
                </div>
              </div>
              <button onClick={() => setShowMarginDropdown(false)} className="w-full text-xs py-1.5 text-[#FCD535] hover:bg-[#1e2026]">
                Confirm
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
        {/* Price */}
        <div>
          <div className="flex justify-between text-[#848e9c] mb-1">
            <span>Price</span>
            <button 
              onClick={() => setPrice(currentPrice)}
              className="text-[#FCD535] cursor-pointer hover:underline"
            >
              Last
            </button>
          </div>
          <div className="relative">
            <input
              type="number"
              value={orderType === 'MARKET' ? '' : price}
              onChange={(e) => setPrice(Number(e.target.value))}
              disabled={orderType === 'MARKET'}
              placeholder={orderType === 'MARKET' ? 'Market' : ''}
              className="w-full bg-[#2b3139] rounded px-3 py-2 text-[#eaecef] text-xs focus:outline-none focus:ring-1 focus:ring-[#FCD535] disabled:text-[#848e9c]"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#848e9c]">USDT</span>
          </div>
        </div>

        {/* Risk Amount (Fiat-based) */}
        <div>
          <div className="flex justify-between text-[#848e9c] mb-1">
            <span>Risk Amount</span>
            <span className="text-[#FCD535]">$</span>
          </div>
          <div className="relative">
            <input
              type="number"
              value={riskAmount}
              onChange={(e) => setRiskAmount(Number(e.target.value))}
              className="w-full bg-[#2b3139] rounded px-3 py-2 text-[#eaecef] text-xs focus:outline-none ring-1 ring-[#FCD535]/50"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#848e9c]">USDT</span>
          </div>
        </div>

        {/* Stop Loss */}
        <div>
          <div className="text-[#848e9c] mb-1">Stop Loss</div>
          <div className="relative">
            <input
              type="number"
              value={stopLoss}
              onChange={(e) => setStopLoss(Number(e.target.value))}
              className="w-full bg-[#2b3139] rounded px-3 py-2 text-[#eaecef] text-xs focus:outline-none focus:ring-1 focus:ring-[#f6465d]"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#848e9c]">USDT</span>
          </div>
        </div>

        {/* Take Profit */}
        <div>
          <div className="text-[#848e9c] mb-1">Take Profit</div>
          <div className="relative">
            <input
              type="number"
              value={takeProfit}
              onChange={(e) => setTakeProfit(Number(e.target.value))}
              className="w-full bg-[#2b3139] rounded px-3 py-2 text-[#eaecef] text-xs focus:outline-none focus:ring-1 focus:ring-[#2ead65]"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#848e9c]">USDT</span>
          </div>
        </div>

        {/* Quantity (Auto-calculated, Read-only) */}
        <div>
          <div className="flex justify-between text-[#848e9c] mb-1">
            <span>Qty ({baseAsset})</span>
            <span className="text-[#2ead65]">Auto</span>
          </div>
          <div className="relative">
            <input
              type="text"
              value={positionSizeResult.positionSize.toFixed(4)}
              readOnly
              className="w-full bg-[#2b3139] rounded px-3 py-2 text-[#eaecef] text-xs cursor-not-allowed"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#848e9c]">{baseAsset}</span>
          </div>
        </div>

        {/* Risk Metrics Summary */}
        <div className="bg-[#2b3139] rounded p-2 space-y-1 mt-2">
          <div className="flex justify-between">
            <span className="text-[#848e9c]">Order Value</span>
            <span>${positionSizeResult.orderValue.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#848e9c]">Margin Required</span>
            <span>${positionSizeResult.marginRequired.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#848e9c]">Risk Amount</span>
            <span className="text-[#FCD535]">${riskAmount.toFixed(2)}</span>
          </div>
          {positionSizeResult.liquidationPrice && (
            <div className="flex justify-between">
              <span className="text-[#848e9c]">Est. Liq. Price</span>
              <span className="text-[#f6465d]">${positionSizeResult.liquidationPrice.toFixed(2)}</span>
            </div>
          )}
          {availableBalance > 0 && (
            <div className="flex justify-between">
              <span className="text-[#848e9c]">Available</span>
              <span className={availableBalance >= positionSizeResult.marginRequired ? 'text-[#2ead65]' : 'text-[#f6465d]'}>
                ${availableBalance.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Validation Errors */}
        {positionSizeResult.errors.length > 0 && (
          <div className="bg-[#f6465d]/10 border border-[#f6465d]/30 rounded p-2">
            {positionSizeResult.errors.map((err, idx) => (
              <div key={idx} className="text-[#f6465d] text-[10px]">{err}</div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-3 border-t border-[#2b3139]">
        <div className="flex gap-2">
          <button 
            onClick={handleBuyLong} 
            disabled={!canExecute}
            className="flex-1 bg-[#2ead65] hover:bg-[#26965a] disabled:bg-[#2b3139] disabled:text-[#848e9c] disabled:cursor-not-allowed text-white font-medium py-2.5 rounded text-sm transition-colors"
          >
            {loading ? 'Executing...' : 'Buy/Long'}
          </button>
          <button 
            onClick={handleSellShort} 
            disabled={!canExecute}
            className="flex-1 bg-[#f6465d] hover:bg-[#d93d52] disabled:bg-[#2b3139] disabled:text-[#848e9c] disabled:cursor-not-allowed text-white font-medium py-2.5 rounded text-sm transition-colors"
          >
            {loading ? 'Executing...' : 'Sell/Short'}
          </button>
        </div>
      </div>
    </div>
  );
}