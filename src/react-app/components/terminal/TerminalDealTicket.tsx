/**
 * Terminal Deal Ticket Component
 *
 * Multi-exchange Deal Ticket with Risk-First methodology.
 * Supports: Bybit, Lighter DEX
 * Features:
 * - Exchange selector (Bybit | Lighter)
 * - Tabs: Market, Limit, Conditional
 * - Risk-First Input (Primary)
 * - On-the-fly position size calculation
 * - Kill Switch integration
 * - Order execution with latency monitoring
 * - 0% fees badge for Lighter DEX
 */

import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, Zap } from 'lucide-react';
import { useSymbol } from '../../contexts/SymbolContext';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { calculatePositionSize, type PositionSizeResult } from '../../utils/riskCalculator';
import { useApiMutation } from '../../hooks/useApi';
import { useKillSwitch } from '../../hooks/useKillSwitch';
import { useLighterOrders } from '../../hooks/useLighterOrders';
import { useLighterConnectionStatus } from '../../hooks/useLighterBalance';

type OrderType = 'Market' | 'Limit' | 'Conditional';
type Exchange = 'bybit' | 'lighter';

interface TerminalDealTicketProps {
  currentPrice: number;
}

export function TerminalDealTicket({ currentPrice }: TerminalDealTicketProps) {
  const { symbol } = useSymbol();
  const baseAsset = symbol.replace(/USDT$|USD$|BUSD$/, '');

  // Exchange selection
  const [selectedExchange, setSelectedExchange] = useState<Exchange>('bybit');
  const [showExchangeDropdown, setShowExchangeDropdown] = useState(false);

  const [orderType, setOrderType] = useState<OrderType>('Limit');
  const [price, setPrice] = useState<number>(currentPrice);
  const [stopLoss, setStopLoss] = useState<number>(currentPrice * 0.98);
  const [takeProfit, setTakeProfit] = useState<number>(currentPrice * 1.04);
  const [riskAmount, setRiskAmount] = useState<number>(50);
  const [leverage, setLeverage] = useState<number>(10);
  const [marginMode, setMarginMode] = useState<'isolated' | 'cross'>('isolated');
  const [showMarginDropdown, setShowMarginDropdown] = useState(false);
  const [availableBalance, setAvailableBalance] = useState<number>(0);
  const [orderLatency, setOrderLatency] = useState<number | null>(null);

  // Exchange-specific hooks
  const { mutate: placeBybitOrder, loading: isPlacingBybitOrder } = useApiMutation('/api/orders/bybit', { method: 'POST' });
  const { placeOrder: placeLighterOrder } = useLighterOrders();
  const { status: lighterStatus } = useLighterConnectionStatus();
  const [isPlacingLighterOrder, setIsPlacingLighterOrder] = useState(false);

  const isPlacingOrder = selectedExchange === 'bybit' ? isPlacingBybitOrder : isPlacingLighterOrder;
  const isLighterConnected = lighterStatus?.connected ?? false;
  
  // Kill Switch integration
  const { killSwitch } = useKillSwitch({ calculatedRisk: riskAmount });
  const isKillSwitchActive = killSwitch.isBlocked;

  // Update prices when currentPrice changes
  useEffect(() => {
    setPrice(currentPrice);
    setStopLoss(currentPrice * 0.98);
    setTakeProfit(currentPrice * 1.04);
  }, [currentPrice]);

  // Calculate position size using risk-first formula (on-the-fly)
  const positionSizeResult: PositionSizeResult = useMemo(() => {
    return calculatePositionSize({
      riskAmount,
      entryPrice: price,
      stopLossPrice: stopLoss,
      leverage,
      marginMode,
    });
  }, [riskAmount, price, stopLoss, leverage, marginMode]);

  // Fetch available balance
  useEffect(() => {
    // TODO: Fetch from /api/users/me
    // For now, mock data
    setAvailableBalance(1000);
  }, []);

  const handleBuyLong = async () => {
    if (!positionSizeResult.isValid || isKillSwitchActive) return;
    if (selectedExchange === 'lighter' && !isLighterConnected) return;

    const startTime = performance.now();

    try {
      if (selectedExchange === 'lighter') {
        setIsPlacingLighterOrder(true);
        await placeLighterOrder({
          symbol: symbol.replace('USDT', '-USDT'), // Lighter uses BTC-USDT format
          side: 'buy',
          type: orderType.toLowerCase() as 'market' | 'limit' | 'stop' | 'stop_limit',
          quantity: positionSizeResult.positionSize,
          price: orderType === 'Market' ? undefined : price,
          stopLoss,
          takeProfit,
          leverage,
        });
        setIsPlacingLighterOrder(false);
      } else {
        await placeBybitOrder({
          symbol,
          side: 'Buy',
          orderType: orderType.toLowerCase(),
          qty: positionSizeResult.positionSize,
          price: orderType === 'Market' ? undefined : price,
          stopLoss,
          takeProfit,
          leverage,
          marginMode,
        });
      }

      const latency = performance.now() - startTime;
      setOrderLatency(latency);

      // Reset latency display after 3 seconds
      setTimeout(() => setOrderLatency(null), 3000);
    } catch (error) {
      console.error('Order placement failed:', error);
      setIsPlacingLighterOrder(false);
    }
  };

  const handleSellShort = async () => {
    if (!positionSizeResult.isValid || isKillSwitchActive) return;
    if (selectedExchange === 'lighter' && !isLighterConnected) return;

    const startTime = performance.now();

    try {
      if (selectedExchange === 'lighter') {
        setIsPlacingLighterOrder(true);
        await placeLighterOrder({
          symbol: symbol.replace('USDT', '-USDT'), // Lighter uses BTC-USDT format
          side: 'sell',
          type: orderType.toLowerCase() as 'market' | 'limit' | 'stop' | 'stop_limit',
          quantity: positionSizeResult.positionSize,
          price: orderType === 'Market' ? undefined : price,
          stopLoss,
          takeProfit,
          leverage,
        });
        setIsPlacingLighterOrder(false);
      } else {
        await placeBybitOrder({
          symbol,
          side: 'Sell',
          orderType: orderType.toLowerCase(),
          qty: positionSizeResult.positionSize,
          price: orderType === 'Market' ? undefined : price,
          stopLoss,
          takeProfit,
          leverage,
          marginMode,
        });
      }

      const latency = performance.now() - startTime;
      setOrderLatency(latency);

      setTimeout(() => setOrderLatency(null), 3000);
    } catch (error) {
      console.error('Order placement failed:', error);
      setIsPlacingLighterOrder(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#161A1E] text-[#EAECEF] text-xs terminal-panel relative">
      {/* Kill Switch Overlay */}
      {isKillSwitchActive && (
        <div className="absolute inset-0 bg-[#0B0E11]/90 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center p-6">
            <div className="text-lg font-semibold text-[#F6465D] mb-2">
              Discipline Protocol Active
            </div>
            <div className="text-sm text-[#848E9C]">
              Execution Locked
            </div>
            <div className="text-xs text-[#848E9C] mt-2">
              MDL threshold exceeded (≥5%)
            </div>
          </div>
        </div>
      )}

      {/* Exchange Selector */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2B2F36]">
        <div className="relative">
          <button
            onClick={() => setShowExchangeDropdown(!showExchangeDropdown)}
            className="flex items-center gap-2 text-[#EAECEF] hover:text-white bg-[#2B2F36] px-3 py-1.5 rounded text-xs transition-colors"
          >
            <span className="font-medium">
              {selectedExchange === 'bybit' ? 'Bybit' : 'Lighter'}
            </span>
            {selectedExchange === 'lighter' && (
              <span className="flex items-center gap-1 text-[10px] text-[#10B981] bg-[#10B981]/10 px-1.5 py-0.5 rounded">
                <Zap size={10} />
                0% FEE
              </span>
            )}
            <ChevronDown className="w-3 h-3" />
          </button>

          {showExchangeDropdown && (
            <div className="absolute left-0 top-full mt-1 bg-[#2B2F36] rounded shadow-xl z-50 w-40 border border-[#161A1E]">
              <button
                onClick={() => {
                  setSelectedExchange('bybit');
                  setShowExchangeDropdown(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                  selectedExchange === 'bybit'
                    ? 'bg-[#00D9C8]/10 text-[#00D9C8]'
                    : 'text-[#EAECEF] hover:bg-[#161A1E]'
                }`}
              >
                Bybit
              </button>
              <button
                onClick={() => {
                  setSelectedExchange('lighter');
                  setShowExchangeDropdown(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between ${
                  selectedExchange === 'lighter'
                    ? 'bg-[#00D9C8]/10 text-[#00D9C8]'
                    : 'text-[#EAECEF] hover:bg-[#161A1E]'
                }`}
              >
                <span>Lighter</span>
                <span className="text-[10px] text-[#10B981]">0% FEE</span>
              </button>
            </div>
          )}
        </div>

        {/* Lighter connection warning */}
        {selectedExchange === 'lighter' && !isLighterConnected && (
          <div className="text-[10px] text-[#F6465D]">Not connected</div>
        )}
      </div>

      {/* Order Type Tabs */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2B2F36]">
        <Tabs value={orderType} onValueChange={(v) => setOrderType(v as OrderType)}>
          <TabsList className="h-auto p-0 bg-transparent">
            <TabsTrigger value="Market" className="text-xs">Market</TabsTrigger>
            <TabsTrigger value="Limit" className="text-xs">Limit</TabsTrigger>
            <TabsTrigger value="Conditional" className="text-xs">Conditional</TabsTrigger>
          </TabsList>
        </Tabs>
        
        {/* Margin Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowMarginDropdown(!showMarginDropdown)}
            className="flex items-center gap-1 text-[#848E9C] hover:text-[#EAECEF] bg-[#2B2F36] px-2 py-1 rounded text-xs transition-colors"
          >
            <span>{marginMode === 'isolated' ? 'Isolated' : 'Cross'} {leverage}x</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          
          {showMarginDropdown && (
            <div className="absolute right-0 top-full mt-1 bg-[#2B2F36] rounded shadow-xl z-50 w-36 border border-[#161A1E]">
              <div className="p-2 border-b border-[#161A1E]">
                <div className="flex gap-1 mb-2">
                  <button
                    onClick={() => setMarginMode('cross')}
                    className={`flex-1 text-xs py-1 rounded transition-colors ${
                      marginMode === 'cross'
                        ? 'bg-[#00D9C8] text-black'
                        : 'bg-[#161A1E] text-[#848E9C] hover:text-[#EAECEF]'
                    }`}
                  >
                    Cross
                  </button>
                  <button
                    onClick={() => setMarginMode('isolated')}
                    className={`flex-1 text-xs py-1 rounded transition-colors ${
                      marginMode === 'isolated'
                        ? 'bg-[#00D9C8] text-black'
                        : 'bg-[#161A1E] text-[#848E9C] hover:text-[#EAECEF]'
                    }`}
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
                  className="w-full h-1 bg-[#161A1E] rounded appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#848E9C] mt-1">
                  <span>1x</span>
                  <span className="text-[#00D9C8]">{leverage}x</span>
                  <span>100x</span>
                </div>
              </div>
              <button
                onClick={() => setShowMarginDropdown(false)}
                className="w-full text-xs py-1.5 text-[#00D9C8] hover:bg-[#161A1E] transition-colors"
              >
                Confirm
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
        {/* Entry Price */}
        <div>
          <div className="flex justify-between text-[#848E9C] mb-1">
            <span>Price</span>
            {orderType === 'Market' && (
              <span className="text-[#00D9C8] cursor-pointer hover:underline" onClick={() => setPrice(currentPrice)}>
                Last
              </span>
            )}
          </div>
          <div className="relative">
            <input
              type="number"
              value={orderType === 'Market' ? '' : price}
              onChange={(e) => setPrice(Number(e.target.value))}
              disabled={orderType === 'Market'}
              placeholder={orderType === 'Market' ? 'Market' : ''}
              className="w-full bg-[#2B2F36] rounded px-3 py-2 text-[#EAECEF] text-xs focus:outline-none focus:ring-1 focus:ring-[#00D9C8] disabled:text-[#848E9C] disabled:cursor-not-allowed"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#848E9C]">USDT</span>
          </div>
        </div>

        {/* Risk Amount (Primary Input) */}
        <div>
          <div className="flex justify-between text-[#848E9C] mb-1">
            <span>Risk Amount</span>
            <span className="text-[#00D9C8]">$</span>
          </div>
          <div className="relative">
            <input
              type="number"
              value={riskAmount}
              onChange={(e) => setRiskAmount(Number(e.target.value))}
              className="w-full bg-[#2B2F36] rounded px-3 py-2 text-[#EAECEF] text-xs focus:outline-none focus:ring-2 focus:ring-[#00D9C8]"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#848E9C]">USDT</span>
          </div>
        </div>

        {/* Stop Loss */}
        <div>
          <div className="text-[#848E9C] mb-1">Stop Loss</div>
          <div className="relative">
            <input
              type="number"
              value={stopLoss}
              onChange={(e) => setStopLoss(Number(e.target.value))}
              className="w-full bg-[#2B2F36] rounded px-3 py-2 text-[#EAECEF] text-xs focus:outline-none focus:ring-1 focus:ring-[#F6465D]"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#848E9C]">USDT</span>
          </div>
        </div>

        {/* Take Profit */}
        <div>
          <div className="text-[#848E9C] mb-1">Take Profit</div>
          <div className="relative">
            <input
              type="number"
              value={takeProfit}
              onChange={(e) => setTakeProfit(Number(e.target.value))}
              className="w-full bg-[#2B2F36] rounded px-3 py-2 text-[#EAECEF] text-xs focus:outline-none focus:ring-1 focus:ring-[#2EAD65]"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#848E9C]">USDT</span>
          </div>
        </div>

        {/* Quantity (Auto-calculated, Read-only) */}
        <div>
          <div className="flex justify-between text-[#848E9C] mb-1">
            <span>Qty ({baseAsset})</span>
            <span className="text-[#2EAD65]">Auto</span>
          </div>
          <div className="relative">
            <input
              type="text"
              value={positionSizeResult.positionSize.toFixed(4)}
              readOnly
              className="w-full bg-[#2B2F36] rounded px-3 py-2 text-[#EAECEF] text-xs cursor-not-allowed"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#848E9C]">{baseAsset}</span>
          </div>
          {!positionSizeResult.isValid && positionSizeResult.errors.length > 0 && (
            <div className="text-[10px] text-[#F6465D] mt-1">
              {positionSizeResult.errors[0]}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="bg-[#2B2F36] rounded p-2 space-y-1 mt-2">
          <div className="flex justify-between">
            <span className="text-[#848E9C]">Order Value</span>
            <span>${positionSizeResult.orderValue.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#848E9C]">Margin Required</span>
            <span>${positionSizeResult.marginRequired.toFixed(2)}</span>
          </div>
          {positionSizeResult.liquidationPrice && (
            <div className="flex justify-between">
              <span className="text-[#848E9C]">Est. Liq. Price</span>
              <span className="text-[#F6465D]">${positionSizeResult.liquidationPrice.toFixed(2)}</span>
            </div>
          )}
          {orderLatency !== null && (
            <div className="flex justify-between">
              <span className="text-[#848E9C]">Latency</span>
              <span className="text-[#2EAD65]">{orderLatency.toFixed(0)}ms</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-3 border-t border-[#2B2F36]">
        <div className="flex gap-2">
          <button
            onClick={handleBuyLong}
            disabled={
              !positionSizeResult.isValid ||
              isKillSwitchActive ||
              isPlacingOrder ||
              (selectedExchange === 'lighter' && !isLighterConnected)
            }
            className="flex-1 bg-[#2EAD65] hover:bg-[#26965a] disabled:bg-[#2B2F36] disabled:text-[#848E9C] disabled:cursor-not-allowed text-white font-medium py-2.5 rounded text-sm transition-colors"
          >
            {isPlacingOrder ? 'Placing...' : 'Buy/Long'}
          </button>
          <button
            onClick={handleSellShort}
            disabled={
              !positionSizeResult.isValid ||
              isKillSwitchActive ||
              isPlacingOrder ||
              (selectedExchange === 'lighter' && !isLighterConnected)
            }
            className="flex-1 bg-[#F6465D] hover:bg-[#d93d52] disabled:bg-[#2B2F36] disabled:text-[#848E9C] disabled:cursor-not-allowed text-white font-medium py-2.5 rounded text-sm transition-colors"
          >
            {isPlacingOrder ? 'Placing...' : 'Sell/Short'}
          </button>
        </div>
        <div className="flex justify-between text-[#848E9C] mt-2 text-xs">
          <span>Available</span>
          <span>{availableBalance.toFixed(2)} USDT</span>
        </div>
      </div>
    </div>
  );
}
