import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useMemo, useState, useEffect } from 'react';
import { useTrades } from '@/react-app/hooks/useTrades';
import { useLanguageCurrency } from '@/react-app/contexts/LanguageCurrencyContext';

export default function EquityChart() {
  const { trades } = useTrades();
  const { currency, convertCurrency } = useLanguageCurrency();
  const [conversionRate, setConversionRate] = useState<number>(1);
  const currencyCode = currency.split('-')[0];

  useEffect(() => {
    const loadRate = async () => {
      if (currencyCode === 'USD') {
        setConversionRate(1);
      } else {
        const rate = await convertCurrency(1, 'USD');
        setConversionRate(rate);
      }
    };
    loadRate();
  }, [currency, currencyCode]);
  
  const chartData = useMemo(() => {
    // Generate equity curve data - starts at 0 and accumulates from trades
    const data = [];
    let runningPnl = 0; // Start at 0, not starting capital
    
    // Sort trades by date
    const sortedTrades = [...trades]
      .filter(t => t.is_closed)
      .sort((a, b) => new Date(a.exit_date || a.entry_date).getTime() - new Date(b.exit_date || b.entry_date).getTime());
    
    // If no trades, show a flat line
    if (sortedTrades.length === 0) {
      const today = new Date();
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        data.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          value: runningPnl
        });
      }
      return data;
    }
    
    // Start from 30 days ago
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 29);
    startDate.setHours(0, 0, 0, 0);
    
    // Filter trades to only include those in the last 30 days
    const recentTrades = sortedTrades.filter(trade => {
      const tradeDate = new Date(trade.exit_date || trade.entry_date);
      return tradeDate >= startDate;
    });
    
    let tradeIndex = 0;
    
    // Generate data for each day in the last 30 days
    for (let i = 0; i < 30; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Add any trades that happened on this day or before
      while (tradeIndex < recentTrades.length) {
        const trade = recentTrades[tradeIndex];
        const tradeDate = (trade.exit_date || trade.entry_date);
        
        if (tradeDate <= dateStr) {
          // Convert PnL to selected currency
          const pnlInCurrency = (trade.pnl || 0) * conversionRate;
          runningPnl += pnlInCurrency;
          tradeIndex++;
        } else {
          break;
        }
      }
      
      data.push({
        date: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: runningPnl
      });
    }
    
    return data;
  }, [trades, conversionRate]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0D0F18] border border-white/10 rounded-lg p-3">
          <p className="text-[#7F8C8D] text-sm mb-1">{label}</p>
          <p className="text-white font-semibold">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis 
            dataKey="date" 
            stroke="#7F8C8D" 
            fontSize={12}
            tick={{ fill: '#7F8C8D' }}
          />
          <YAxis 
            stroke="#7F8C8D" 
            fontSize={12}
            tick={{ fill: '#7F8C8D' }}
            tickFormatter={(value) => {
              const currencySymbol = currency.split('-')[1] || currencyCode;
              return `${currencySymbol}${value.toFixed(0)}`;
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="#6A3DF4" 
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: '#6A3DF4', strokeWidth: 2, fill: '#6A3DF4' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
