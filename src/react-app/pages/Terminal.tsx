/**
 * Terminal Page
 * 
 * High-Frequency Trading Terminal with Multi-Panel Grid Layout:
 * - Chart Panel (resizable)
 * - Orderbook Panel (resizable)
 * - Deal Ticket Panel (resizable)
 * - Positions Panel (resizable, collapsible)
 * 
 * Features:
 * - Drag & Drop to reorder panels
 * - Resize panels by dragging borders
 * - Collapsible bottom panel
 */

import { useState } from 'react';
import { SymbolProvider } from '../contexts/SymbolContext';
import { TerminalHeader } from '../components/terminal/TerminalHeader';
import { TradingViewChart } from '../components/terminal/TradingViewChart';
import { TerminalDealTicket } from '../components/terminal/TerminalDealTicket';
import { PositionsPanel } from '../components/terminal/PositionsPanel';
import { WebGLOrderbook } from '../components/terminal/WebGLOrderbook';
import { AICloneFloatingPanel } from '../components/terminal/AICloneFloatingPanel';
import { ChevronUp, ChevronDown } from 'lucide-react';

// Mock stats for now - will be replaced with real data
const mockStats = {
  mark: 98445.12,
  index: 98432.89,
  high24h: 99850.00,
  low24h: 95120.00,
  volume24h: 45892.34,
  openInterest: 2.4e9,
  fundingRate: 0.0001,
  priceChange24h: 2300.5,
  priceChangePercent24h: 2.34,
};

export default function Terminal() {
  const currentPrice = 98456.78;
  const [isBottomPanelCollapsed, setIsBottomPanelCollapsed] = useState(false);
  const [chartSize, setChartSize] = useState(60); // Percentage
  const [orderbookSize, setOrderbookSize] = useState(50); // Percentage of right side
  const [bottomPanelSize, setBottomPanelSize] = useState(25); // Percentage
  const [isAIClonePanelOpen, setIsAIClonePanelOpen] = useState(false);

  // Resize handlers
  const handleChartResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startSize = chartSize;
    const container = (e.currentTarget as HTMLElement).parentElement;
    if (!container) return;

    const handleMove = (moveEvent: MouseEvent) => {
      const containerRect = container.getBoundingClientRect();
      const delta = ((moveEvent.clientX - startX) / containerRect.width) * 100;
      const newSize = Math.max(30, Math.min(80, startSize + delta));
      setChartSize(newSize);
    };

    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  const handleOrderbookResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startSize = orderbookSize;
    const container = (e.currentTarget as HTMLElement).parentElement;
    if (!container) return;

    const handleMove = (moveEvent: MouseEvent) => {
      const containerRect = container.getBoundingClientRect();
      const delta = ((moveEvent.clientY - startY) / containerRect.height) * 100;
      const newSize = Math.max(20, Math.min(80, startSize + delta));
      setOrderbookSize(newSize);
    };

    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  const handleBottomResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startSize = bottomPanelSize;
    const container = document.querySelector('.terminal') as HTMLElement;
    if (!container) return;

    const handleMove = (moveEvent: MouseEvent) => {
      const containerRect = container.getBoundingClientRect();
      const delta = ((startY - moveEvent.clientY) / containerRect.height) * 100;
      const newSize = Math.max(10, Math.min(50, startSize + delta));
      setBottomPanelSize(newSize);
    };

    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  const rightPanelSize = 100 - chartSize;
  const dealTicketSize = 100 - orderbookSize;

  return (
    <SymbolProvider initialSymbol="BTCUSDT">
      <div className="h-screen w-full bg-[#0B0E11] flex flex-col overflow-hidden terminal">
        {/* Header Bar */}
        <TerminalHeader
          currentPrice={currentPrice}
          priceChange24h={mockStats.priceChange24h}
          priceChangePercent24h={mockStats.priceChangePercent24h}
          stats={mockStats}
          onAICloneToggle={() => setIsAIClonePanelOpen(!isAIClonePanelOpen)}
          isAIClonePanelOpen={isAIClonePanelOpen}
        />

        {/* Main Content with Resizable Panels */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chart Panel */}
          <div 
            className="flex flex-col bg-[#0B0E11] border-r border-[#2B2F36]"
            style={{ width: `${chartSize}%` }}
          >
            {/* Chart Toolbar */}
            <div className="h-10 bg-[#161A1E] border-b border-[#2B2F36] flex items-center px-3 gap-4 text-xs shrink-0">
              {['1m', '5m', '15m', '1H', '4H', '1D', '1W'].map((tf) => (
                <button
                  key={tf}
                  className={`px-2 py-1 rounded transition-colors ${
                    tf === '1H'
                      ? 'bg-[#2B2F36] text-[#EAECEF]'
                      : 'text-[#848E9C] hover:text-[#EAECEF]'
                  }`}
                >
                  {tf}
                </button>
              ))}
              <div className="w-px h-4 bg-[#2B2F36]" />
              <button className="text-[#848E9C] hover:text-[#EAECEF]">Indicators</button>
              <button className="text-[#848E9C] hover:text-[#EAECEF]">Templates</button>
            </div>

            {/* Chart */}
            <div className="flex-1 overflow-hidden min-h-0">
              <TradingViewChart interval="60" />
            </div>
          </div>

          {/* Resize Handle */}
          <div
            onMouseDown={handleChartResize}
            className="w-1 bg-[#2B2F36] hover:bg-[#03AAC7] transition-colors cursor-col-resize shrink-0"
          />

          {/* Right Side Panels */}
          <div className="flex flex-col" style={{ width: `${rightPanelSize}%` }}>
            {/* Orderbook Panel */}
            <div 
              className="bg-[#161A1E] border-r border-[#2B2F36]"
              style={{ height: `${orderbookSize}%` }}
            >
              <WebGLOrderbook />
            </div>

            {/* Resize Handle */}
            <div
              onMouseDown={handleOrderbookResize}
              className="h-1 bg-[#2B2F36] hover:bg-[#03AAC7] transition-colors cursor-row-resize shrink-0"
            />

            {/* Deal Ticket Panel */}
            <div 
              className="bg-[#161A1E]"
              style={{ height: `${dealTicketSize}%` }}
            >
              <TerminalDealTicket currentPrice={currentPrice} />
            </div>
          </div>
        </div>

        {/* Bottom Panel - Positions/Orders (Collapsible) */}
        {!isBottomPanelCollapsed ? (
          <>
            <div
              onMouseDown={handleBottomResize}
              className="h-1 bg-[#2B2F36] hover:bg-[#03AAC7] transition-colors cursor-row-resize relative group shrink-0"
            >
              <button
                onClick={() => setIsBottomPanelCollapsed(true)}
                className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#161A1E] border border-[#2B2F36] rounded p-1 hover:bg-[#2B2F36] z-10"
              >
                <ChevronDown className="w-4 h-4 text-[#848E9C]" />
              </button>
            </div>
            <div 
              className="bg-[#161A1E] border-t border-[#2B2F36] shrink-0"
              style={{ height: `${bottomPanelSize}%` }}
            >
              <PositionsPanel />
            </div>
          </>
        ) : (
          <div className="h-8 bg-[#161A1E] border-t border-[#2B2F36] flex items-center justify-center shrink-0">
            <button
              onClick={() => setIsBottomPanelCollapsed(false)}
              className="flex items-center gap-2 px-4 py-1 text-xs text-[#848E9C] hover:text-[#EAECEF] transition-colors"
            >
              <ChevronUp className="w-4 h-4" />
              <span>Show Positions</span>
            </button>
          </div>
        )}

        {/* AI Clone Floating Panel */}
        <AICloneFloatingPanel
          isOpen={isAIClonePanelOpen}
          onClose={() => setIsAIClonePanelOpen(false)}
        />
      </div>
    </SymbolProvider>
  );
}











