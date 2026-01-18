/**
 * Professional Deal Ticket Component - Bybit Style
 */

import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, Settings, Calculator } from 'lucide-react';

type OrderType = 'limit' | 'market' | 'conditional';
export type TradingType = 'spot' | 'margin' | 'futures';

interface DealTicketProps {
  currentPrice?: number;
  symbol?: string;
  tradingType?: TradingType;
  availableBalance?: number;
  onOrderSubmit?: (order: {
    side: 'buy' | 'sell';
    type: OrderType;
    price: number;
    quantity: number;
    leverage: number;
    takeProfit?: number;
    stopLoss?: number;
  }) => void;
}

export default function DealTicket({
  currentPrice = 98500,
  symbol = 'BTCUSDT',
  tradingType = 'futures',
  availableBalance = 70.1925,
  onOrderSubmit
}: DealTicketProps) {
  const baseAsset = symbol.replace(/USDT$|USD$|BUSD$/, '');

  const [orderType, setOrderType] = useState<OrderType>('limit');
  const [marginMode, setMarginMode] = useState<'isolated' | 'cross'>('isolated');
  const [leverage, setLeverage] = useState(15);
  const [showLeverageModal, setShowLeverageModal] = useState(false);

  const [price, setPrice] = useState(currentPrice.toString());
  const [quantity, setQuantity] = useState('');
  const [quantityUnit, setQuantityUnit] = useState<'coin' | 'usdt'>('coin');
  const [sliderValue, setSliderValue] = useState(0);

  const [showTpSl, setShowTpSl] = useState(false);
  const [takeProfit, setTakeProfit] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [postOnly, setPostOnly] = useState(false);
  const [reduceOnly, setReduceOnly] = useState(false);

  const maxLeverage = tradingType === 'spot' ? 1 : tradingType === 'margin' ? 10 : 100;

  useEffect(() => {
    setPrice(currentPrice.toFixed(4));
  }, [currentPrice]);

  // Calculate order values
  const orderCalc = useMemo(() => {
    const qty = parseFloat(quantity) || 0;
    const prc = parseFloat(price) || currentPrice;

    let value = 0;
    let cost = 0;
    let coinQty = qty;

    if (quantityUnit === 'usdt') {
      value = qty;
      coinQty = qty / prc;
      cost = qty / leverage;
    } else {
      value = qty * prc;
      cost = value / leverage;
    }

    const liqPrice = prc * (1 - (1 / leverage) * 0.9); // Simplified

    return { value, cost, coinQty, liqPrice };
  }, [quantity, price, currentPrice, leverage, quantityUnit]);

  // Handle slider change
  const handleSliderChange = (percent: number) => {
    setSliderValue(percent);
    const maxValue = availableBalance * leverage;
    const value = (maxValue * percent) / 100;
    if (quantityUnit === 'usdt') {
      setQuantity(value.toFixed(2));
    } else {
      const prc = parseFloat(price) || currentPrice;
      setQuantity((value / prc).toFixed(6));
    }
  };

  const handleOrder = (side: 'buy' | 'sell') => {
    onOrderSubmit?.({
      side,
      type: orderType,
      price: parseFloat(price) || currentPrice,
      quantity: orderCalc.coinQty,
      leverage,
      takeProfit: parseFloat(takeProfit) || undefined,
      stopLoss: parseFloat(stopLoss) || undefined,
    });
  };

  const sliderMarks = [0, 25, 50, 75, 100];

  return (
    <div className="h-full flex flex-col bg-[#16181c] text-[13px]">
      {/* Margin Mode & Leverage */}
      {tradingType !== 'spot' && (
        <div className="flex gap-2 px-3 py-2.5 border-b border-[#2b2f36]">
          <button
            onClick={() => setShowLeverageModal(true)}
            className="flex-1 flex items-center justify-between bg-[#1e2026] hover:bg-[#252930] border border-[#2b2f36] rounded px-3 py-2 transition-colors"
          >
            <span className="text-[#848e9c]">{marginMode === 'isolated' ? 'Isolated' : 'Cross'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#848e9c]" />
          </button>
          <button
            onClick={() => setShowLeverageModal(true)}
            className="flex-1 flex items-center justify-between bg-[#1e2026] hover:bg-[#252930] border border-[#2b2f36] rounded px-3 py-2 transition-colors"
          >
            <span className="text-white">{leverage.toFixed(2)}x</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#848e9c]" />
          </button>
        </div>
      )}

      {/* Order Type Tabs */}
      <div className="flex items-center gap-4 px-3 py-2.5 border-b border-[#2b2f36]">
        {(['limit', 'market', 'conditional'] as OrderType[]).map((type) => (
          <button
            key={type}
            onClick={() => setOrderType(type)}
            className={`text-[13px] transition-colors ${
              orderType === type ? 'text-[#FCD535] font-medium' : 'text-[#848e9c] hover:text-white'
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
        <ChevronDown className="w-3.5 h-3.5 text-[#848e9c]" />
      </div>

      {/* Order Form */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {/* Price Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[#848e9c] text-xs">Price</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPrice(currentPrice.toFixed(4))}
                className="text-[#FCD535] text-xs hover:text-[#FCD535]/80"
              >
                Last
              </button>
              <Settings className="w-3.5 h-3.5 text-[#848e9c] cursor-pointer hover:text-white" />
            </div>
          </div>
          <input
            type="text"
            value={orderType === 'market' ? 'Market Price' : price}
            onChange={(e) => setPrice(e.target.value)}
            disabled={orderType === 'market'}
            className="w-full bg-[#1e2026] border border-[#2b2f36] rounded px-3 py-2.5 text-white text-[13px] outline-none focus:border-[#FCD535]/50 disabled:text-[#848e9c] transition-colors"
          />
        </div>

        {/* Quantity Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[#848e9c] text-xs">Quantity</span>
            <button
              onClick={() => setQuantityUnit(u => u === 'coin' ? 'usdt' : 'coin')}
              className="flex items-center gap-1 text-[#FCD535] text-xs"
            >
              {quantityUnit === 'coin' ? baseAsset : 'USDT'}
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
          <input
            type="text"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0"
            className="w-full bg-[#1e2026] border border-[#2b2f36] rounded px-3 py-2.5 text-white text-[13px] outline-none focus:border-[#FCD535]/50 placeholder-[#848e9c] transition-colors"
          />
        </div>

        {/* Percentage Slider */}
        <div className="py-2">
          <div className="relative">
            <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-[2px] bg-[#2b2f36]" />
            <div
              className="absolute top-1/2 -translate-y-1/2 left-0 h-[2px] bg-[#FCD535]"
              style={{ width: `${sliderValue}%` }}
            />
            <input
              type="range"
              min="0"
              max="100"
              value={sliderValue}
              onChange={(e) => handleSliderChange(Number(e.target.value))}
              className="relative w-full h-4 appearance-none bg-transparent cursor-pointer z-10 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#FCD535] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#16181c] [&::-webkit-slider-thumb]:cursor-pointer"
            />
          </div>
          <div className="flex justify-between mt-1">
            {sliderMarks.map((mark) => (
              <button
                key={mark}
                onClick={() => handleSliderChange(mark)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  sliderValue >= mark ? 'bg-[#FCD535]' : 'bg-[#2b2f36]'
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-[#848e9c] mt-1">
            <span>0</span>
            <span>100%</span>
          </div>
        </div>

        {/* Order Info */}
        <div className="space-y-2 py-2 border-t border-[#2b2f36]">
          <div className="flex justify-between text-xs">
            <span className="text-[#848e9c]">Value</span>
            <span className="text-white">
              {orderCalc.value > 0 ? `${orderCalc.value.toFixed(2)} USDT` : '-- / -- USDT'}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[#848e9c]">Cost</span>
            <span className="text-white">
              {orderCalc.cost > 0 ? `${orderCalc.cost.toFixed(2)} USDT` : '-- / -- USDT'}
            </span>
          </div>
          {tradingType !== 'spot' && (
            <div className="flex justify-between text-xs">
              <span className="text-[#848e9c]">Liq. Price</span>
              <button className="text-[#FCD535]">Calculate</button>
            </div>
          )}
        </div>

        {/* Options */}
        <div className="space-y-2.5 py-2 border-t border-[#2b2f36]">
          {/* TP/SL */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showTpSl}
              onChange={(e) => setShowTpSl(e.target.checked)}
              className="w-4 h-4 rounded border-[#2b2f36] bg-[#1e2026] text-[#FCD535] focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-[#848e9c] text-xs">TP/SL</span>
          </label>

          {showTpSl && (
            <div className="grid grid-cols-2 gap-2 pl-6">
              <input
                type="text"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                placeholder="Take Profit"
                className="bg-[#1e2026] border border-[#2b2f36] rounded px-2 py-1.5 text-white text-xs outline-none focus:border-[#0ecb81]/50 placeholder-[#848e9c]"
              />
              <input
                type="text"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="Stop Loss"
                className="bg-[#1e2026] border border-[#2b2f36] rounded px-2 py-1.5 text-white text-xs outline-none focus:border-[#f6465d]/50 placeholder-[#848e9c]"
              />
            </div>
          )}

          {/* Post-Only */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={postOnly}
                onChange={(e) => setPostOnly(e.target.checked)}
                className="w-4 h-4 rounded border-[#2b2f36] bg-[#1e2026] text-[#FCD535] focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-[#848e9c] text-xs">Post-Only</span>
            </label>
            <button className="flex items-center gap-1 text-[#848e9c] text-xs hover:text-white">
              Good-Till-Canceled
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>

          {/* Reduce-Only */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={reduceOnly}
              onChange={(e) => setReduceOnly(e.target.checked)}
              className="w-4 h-4 rounded border-[#2b2f36] bg-[#1e2026] text-[#FCD535] focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-[#848e9c] text-xs">Reduce-Only</span>
          </label>
        </div>

        {/* Buy/Sell Buttons */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => handleOrder('buy')}
            className="flex-1 py-3 bg-[#0ecb81] hover:bg-[#0ecb81]/90 text-white font-semibold rounded-lg transition-colors"
          >
            Long
          </button>
          <button
            onClick={() => handleOrder('sell')}
            className="flex-1 py-3 bg-[#f6465d] hover:bg-[#f6465d]/90 text-white font-semibold rounded-lg transition-colors"
          >
            Short
          </button>
        </div>

        {/* Fee Rate & Calculator */}
        <div className="flex items-center gap-4 text-xs py-1">
          <button className="flex items-center gap-1 text-[#848e9c] hover:text-white">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FCD535]" />
            Fee Rate
          </button>
          <button className="flex items-center gap-1 text-[#848e9c] hover:text-white">
            <Calculator className="w-3.5 h-3.5" />
            Calculator
          </button>
        </div>
      </div>

      {/* Account Section */}
      <div className="border-t border-[#2b2f36] px-3 py-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-white text-xs font-medium">Unified Trading Account</span>
            <span className="text-[#848e9c]">ⓘ</span>
          </div>
          <button className="flex items-center gap-1 text-xs text-[#848e9c] hover:text-white">
            <span>📊</span>
            P&L
          </button>
        </div>

        <div className="flex justify-between text-xs">
          <span className="text-[#848e9c]">Margin Mode</span>
          <button className="flex items-center gap-1 text-white hover:text-[#FCD535]">
            {marginMode === 'isolated' ? 'Isolated Margin' : 'Cross Margin'}
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-[#848e9c]">Margin Balance</span>
            <span className="text-white">{availableBalance.toFixed(4)} USDT</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[#848e9c]">Available Balance</span>
            <span className="text-white">{availableBalance.toFixed(4)} USDT</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-1">
          <button className="flex-1 py-2 bg-[#2b2f36] hover:bg-[#363c45] text-white text-xs font-medium rounded transition-colors">
            Deposit
          </button>
          <button className="flex-1 py-2 bg-[#2b2f36] hover:bg-[#363c45] text-white text-xs font-medium rounded transition-colors">
            Convert
          </button>
          <button className="flex-1 py-2 bg-[#2b2f36] hover:bg-[#363c45] text-white text-xs font-medium rounded transition-colors">
            Transfer
          </button>
        </div>
      </div>

      {/* Leverage Modal */}
      {showLeverageModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setShowLeverageModal(false)}
        >
          <div
            className="bg-[#1e2026] rounded-xl p-4 w-80 border border-[#2b2f36]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-white font-semibold mb-4">Adjust Leverage</h3>

            {/* Margin Mode */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setMarginMode('cross')}
                className={`flex-1 py-2 rounded text-sm transition-colors ${
                  marginMode === 'cross'
                    ? 'bg-[#FCD535] text-black font-medium'
                    : 'bg-[#2b2f36] text-[#848e9c] hover:text-white'
                }`}
              >
                Cross
              </button>
              <button
                onClick={() => setMarginMode('isolated')}
                className={`flex-1 py-2 rounded text-sm transition-colors ${
                  marginMode === 'isolated'
                    ? 'bg-[#FCD535] text-black font-medium'
                    : 'bg-[#2b2f36] text-[#848e9c] hover:text-white'
                }`}
              >
                Isolated
              </button>
            </div>

            {/* Leverage Input */}
            <div className="mb-4">
              <input
                type="number"
                value={leverage}
                onChange={(e) => setLeverage(Math.min(maxLeverage, Math.max(1, Number(e.target.value))))}
                className="w-full bg-[#2b2f36] border border-[#2b2f36] rounded px-3 py-2.5 text-white text-center text-lg font-semibold outline-none focus:border-[#FCD535]/50"
              />
            </div>

            {/* Leverage Slider */}
            <div className="mb-4">
              <input
                type="range"
                min="1"
                max={maxLeverage}
                value={leverage}
                onChange={(e) => setLeverage(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-[#848e9c] mt-1">
                <span>1x</span>
                <span>{maxLeverage}x</span>
              </div>
            </div>

            {/* Quick Select */}
            <div className="flex flex-wrap gap-2 mb-4">
              {[1, 5, 10, 25, 50, 75, 100].filter(l => l <= maxLeverage).map((l) => (
                <button
                  key={l}
                  onClick={() => setLeverage(l)}
                  className={`px-3 py-1.5 rounded text-xs transition-colors ${
                    leverage === l
                      ? 'bg-[#FCD535] text-black font-medium'
                      : 'bg-[#2b2f36] text-[#848e9c] hover:text-white'
                  }`}
                >
                  {l}x
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowLeverageModal(false)}
              className="w-full py-2.5 bg-[#FCD535] hover:bg-[#FCD535]/90 text-black font-semibold rounded transition-colors"
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
