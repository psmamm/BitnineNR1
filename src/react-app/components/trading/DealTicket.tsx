import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

type OrderType = 'LIMIT' | 'MARKET' | 'CONDITIONAL';

interface DealTicketProps {
  currentPrice?: number;
  symbol?: string;
}

export default function DealTicket({ currentPrice = 98500, symbol = 'BTCUSDT' }: DealTicketProps) {
  const baseAsset = symbol.replace(/USDT$|USD$|BUSD$/, '');
  
  const [orderType, setOrderType] = useState<OrderType>('LIMIT');
  const [price, setPrice] = useState<number>(currentPrice);
  const [stopLoss, setStopLoss] = useState<number>(currentPrice * 0.98);
  const [takeProfit, setTakeProfit] = useState<number>(currentPrice * 1.04);
  const [riskAmount, setRiskAmount] = useState<number>(50);
  const [leverage, setLeverage] = useState<number>(10);
  const [marginMode, setMarginMode] = useState<'isolated' | 'cross'>('isolated');
  const [calculatedSize, setCalculatedSize] = useState<number>(0);
  const [sliderValue, setSliderValue] = useState<number>(25);
  const [showMarginDropdown, setShowMarginDropdown] = useState(false);

  useEffect(() => {
    setPrice(currentPrice);
    setStopLoss(currentPrice * 0.98);
    setTakeProfit(currentPrice * 1.04);
  }, [currentPrice]);

  useEffect(() => {
    if (riskAmount > 0 && price > 0 && stopLoss > 0) {
      const distance = Math.abs(price - stopLoss);
      if (distance > 0) {
        const size = riskAmount / distance;
        setCalculatedSize(Number(size.toFixed(4)));
      } else {
        setCalculatedSize(0);
      }
    } else {
      setCalculatedSize(0);
    }
  }, [riskAmount, price, stopLoss]);

  const totalValue = (calculatedSize * price).toFixed(2);
  const sliderMarks = [0, 25, 50, 75, 100];

  const handleBuyLong = () => {
    console.log('Buy/Long:', { orderType, price, stopLoss, takeProfit, riskAmount, leverage, size: calculatedSize });
  };

  const handleSellShort = () => {
    console.log('Sell/Short:', { orderType, price, stopLoss, takeProfit, riskAmount, leverage, size: calculatedSize });
  };

  return (
    <div className="h-full flex flex-col bg-[#1e2026] text-[#eaecef] text-xs">
      {/* Order Type Tabs */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2b3139]">
        <div className="flex gap-4">
          {(['LIMIT', 'MARKET', 'CONDITIONAL'] as OrderType[]).map((type) => (
            <button
              key={type}
              onClick={() => setOrderType(type)}
              className={`text-xs font-medium pb-1 transition-colors ${
                orderType === type
                  ? 'text-[#f0b90b] border-b-2 border-[#f0b90b]'
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
                    className={`flex-1 text-xs py-1 rounded ${marginMode === 'cross' ? 'bg-[#f0b90b] text-black' : 'bg-[#1e2026] text-[#848e9c]'}`}
                  >
                    Cross
                  </button>
                  <button
                    onClick={() => setMarginMode('isolated')}
                    className={`flex-1 text-xs py-1 rounded ${marginMode === 'isolated' ? 'bg-[#f0b90b] text-black' : 'bg-[#1e2026] text-[#848e9c]'}`}
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
                  <span className="text-[#f0b90b]">{leverage}x</span>
                  <span>100x</span>
                </div>
              </div>
              <button onClick={() => setShowMarginDropdown(false)} className="w-full text-xs py-1.5 text-[#f0b90b] hover:bg-[#1e2026]">
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
            <span className="text-[#f0b90b] cursor-pointer hover:underline">Last</span>
          </div>
          <div className="relative">
            <input
              type="number"
              value={orderType === 'MARKET' ? '' : price}
              onChange={(e) => setPrice(Number(e.target.value))}
              disabled={orderType === 'MARKET'}
              placeholder={orderType === 'MARKET' ? 'Market' : ''}
              className="w-full bg-[#2b3139] rounded px-3 py-2 text-[#eaecef] text-xs focus:outline-none focus:ring-1 focus:ring-[#f0b90b] disabled:text-[#848e9c]"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#848e9c]">USDT</span>
          </div>
        </div>

        {/* Risk Amount */}
        <div>
          <div className="flex justify-between text-[#848e9c] mb-1">
            <span>Risk Amount</span>
            <span className="text-[#f0b90b]">$</span>
          </div>
          <div className="relative">
            <input
              type="number"
              value={riskAmount}
              onChange={(e) => setRiskAmount(Number(e.target.value))}
              className="w-full bg-[#2b3139] rounded px-3 py-2 text-[#eaecef] text-xs focus:outline-none ring-1 ring-[#f0b90b]/50"
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

        {/* Quantity (Read-only) */}
        <div>
          <div className="flex justify-between text-[#848e9c] mb-1">
            <span>Qty ({baseAsset})</span>
            <span className="text-[#2ead65]">Auto</span>
          </div>
          <div className="relative">
            <input
              type="text"
              value={calculatedSize}
              readOnly
              className="w-full bg-[#2b3139] rounded px-3 py-2 text-[#eaecef] text-xs cursor-not-allowed"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#848e9c]">{baseAsset}</span>
          </div>
        </div>

        {/* Slider */}
        <div className="pt-1">
          <input
            type="range"
            min="0"
            max="100"
            value={sliderValue}
            onChange={(e) => setSliderValue(Number(e.target.value))}
            className="w-full h-1 bg-[#2b3139] rounded appearance-none cursor-pointer"
            style={{ background: `linear-gradient(to right, #f0b90b 0%, #f0b90b ${sliderValue}%, #2b3139 ${sliderValue}%, #2b3139 100%)` }}
          />
          <div className="flex justify-between mt-1.5">
            {sliderMarks.map((mark) => (
              <button
                key={mark}
                onClick={() => setSliderValue(mark)}
                className={`w-5 h-5 rounded-full text-[10px] ${sliderValue >= mark ? 'bg-[#f0b90b] text-black' : 'bg-[#2b3139] text-[#848e9c]'}`}
              >
                {mark}
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-[#2b3139] rounded p-2 space-y-1 mt-2">
          <div className="flex justify-between">
            <span className="text-[#848e9c]">Order Value</span>
            <span>${totalValue}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#848e9c]">Est. Liq. Price</span>
            <span className="text-[#f6465d]">${(price * 0.9).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-3 border-t border-[#2b3139]">
        <div className="flex gap-2">
          <button onClick={handleBuyLong} className="flex-1 bg-[#2ead65] hover:bg-[#26965a] text-white font-medium py-2.5 rounded text-sm transition-colors">
            Buy/Long
          </button>
          <button onClick={handleSellShort} className="flex-1 bg-[#f6465d] hover:bg-[#d93d52] text-white font-medium py-2.5 rounded text-sm transition-colors">
            Sell/Short
          </button>
        </div>
        <div className="flex justify-between text-[#848e9c] mt-2">
          <span>Available</span>
          <span>0.00 USDT</span>
        </div>
      </div>
    </div>
  );
}
