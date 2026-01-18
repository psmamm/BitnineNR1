/**
 * Positions Panel Component
 * 
 * Displays positions, open orders, and order history in a tabbed interface.
 * Uses ScrollArea for efficient rendering of large lists.
 */

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import type { Position, Order } from '../../types/terminal';

export function PositionsPanel() {
  const [activeTab, setActiveTab] = useState<'positions' | 'orders' | 'history'>('positions');

  // Mock data - will be replaced with real API calls
  const positions: Position[] = [];
  const orders: Order[] = [];
  const history: Order[] = [];

  return (
    <div className="h-full flex flex-col bg-[#161A1E] terminal-panel">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        {/* Tabs */}
        <div className="h-10 flex items-center px-4 gap-6 border-b border-[#2B2F36] shrink-0">
          <TabsList className="h-auto p-0 bg-transparent">
            <TabsTrigger value="positions" className="text-sm">
              Positions ({positions.length})
            </TabsTrigger>
            <TabsTrigger value="orders" className="text-sm">
              Open Orders ({orders.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="text-sm">
              Order History
            </TabsTrigger>
          </TabsList>
          
          <div className="ml-auto flex items-center gap-4 text-xs">
            <label className="flex items-center gap-2 text-[#848E9C] cursor-pointer">
              <input type="checkbox" className="accent-[#FCD535]" />
              <span>Hide Other Symbols</span>
            </label>
          </div>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-10 gap-2 px-4 py-2 text-[10px] font-medium text-[#848E9C] border-b border-[#2B2F36] shrink-0 bg-[#161A1E] sticky top-0 z-10">
          <span className="text-left">Symbol</span>
          <span className="text-right">Size</span>
          <span className="text-right">Entry</span>
          <span className="text-right">Mark</span>
          <span className="text-right">Liq.</span>
          <span className="text-right">Margin</span>
          <span className="text-right">PNL</span>
          <span className="text-center">TP/SL</span>
          <span className="text-center">Trail</span>
          <span className="text-center">Action</span>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <TabsContent value="positions" className="m-0">
          {positions.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-[#848E9C] text-xs py-12">
              <div className="text-center">
                <div className="text-4xl mb-2">📊</div>
                <div>No open positions</div>
              </div>
            </div>
          ) : (
            <div className="px-4">
              {positions.map((position) => (
                <div
                  key={`${position.symbol}-${position.side}`}
                  className="grid grid-cols-10 gap-2 py-1.5 text-[11px] border-b border-[#2B2F36]/50 hover:bg-[#2B2F36]/30 transition-colors"
                >
                  <span className="text-[#EAECEF] font-medium">{position.symbol}</span>
                  <span className={`font-mono text-right ${position.side === 'Long' ? 'text-[#2EAD65]' : 'text-[#F6465D]'}`}>
                    {position.size.toFixed(4)}
                  </span>
                  <span className="text-[#EAECEF] font-mono text-right">{position.entryPrice.toFixed(2)}</span>
                  <span className="text-[#EAECEF] font-mono text-right">{position.markPrice.toFixed(2)}</span>
                  <span className="text-[#F6465D] font-mono text-right">{position.liquidationPrice.toFixed(2)}</span>
                  <span className="text-[#EAECEF] font-mono text-right">${position.margin.toFixed(2)}</span>
                  <span className={`font-mono text-right ${position.pnl >= 0 ? 'text-[#2EAD65]' : 'text-[#F6465D]'}`}>
                    ${position.pnl.toFixed(2)}
                    <span className="text-[10px] ml-1">({position.roe >= 0 ? '+' : ''}{position.roe.toFixed(2)}%)</span>
                  </span>
                  <span className="text-[#848E9C] text-[10px] text-center">
                    {position.takeProfit || position.stopLoss ? (
                      <>
                        {position.takeProfit && <span className="text-[#2EAD65]">TP</span>}
                        {position.takeProfit && position.stopLoss && <span className="mx-1">/</span>}
                        {position.stopLoss && <span className="text-[#F6465D]">SL</span>}
                      </>
                    ) : (
                      '-'
                    )}
                  </span>
                  <span className="text-[#848E9C] text-center">
                    {position.trailingStop ? <span className="text-[#FCD535]">●</span> : '-'}
                  </span>
                  <button className="text-[#F6465D] hover:text-[#d93d52] transition-colors text-center text-[10px] font-medium">
                    Close
                  </button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="orders" className="m-0">
          {orders.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-[#848E9C] text-xs py-12">
              <div className="text-center">
                <div className="text-4xl mb-2">📋</div>
                <div>No open orders</div>
              </div>
            </div>
          ) : (
            <div className="px-4">
              {orders.map((order) => (
                <div
                  key={order.orderId}
                  className="grid grid-cols-10 gap-2 py-1.5 text-[11px] border-b border-[#2B2F36]/50 hover:bg-[#2B2F36]/30 transition-colors"
                >
                  <span className="text-[#EAECEF] font-medium">{order.symbol}</span>
                  <span className={`font-mono text-right ${order.side === 'Buy' ? 'text-[#2EAD65]' : 'text-[#F6465D]'}`}>
                    {order.qty.toFixed(4)}
                  </span>
                  <span className="text-[#EAECEF] font-mono text-right">
                    {order.price ? order.price.toFixed(2) : 'Market'}
                  </span>
                  <span className="text-[#848E9C] text-center">{order.orderType}</span>
                  <span className={`text-[10px] text-center ${
                    order.status === 'Filled' ? 'text-[#2EAD65]' :
                    order.status === 'Canceled' ? 'text-[#F6465D]' :
                    'text-[#848E9C]'
                  }`}>
                    {order.status}
                  </span>
                  <span className="text-[#848E9C] text-[10px] text-right">
                    {new Date(order.createdAt).toLocaleTimeString()}
                  </span>
                  <span className="col-span-3"></span>
                  <button className="text-[#F6465D] hover:text-[#d93d52] transition-colors text-center text-[10px] font-medium">
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="m-0">
          {history.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-[#848E9C] text-xs py-12">
              <div className="text-center">
                <div className="text-4xl mb-2">📜</div>
                <div>No order history</div>
              </div>
            </div>
          ) : (
            <div className="px-4">
              {history.map((order) => (
                <div
                  key={order.orderId}
                  className="grid grid-cols-10 gap-2 py-1.5 text-[11px] border-b border-[#2B2F36]/50 hover:bg-[#2B2F36]/30 transition-colors"
                >
                  <span className="text-[#EAECEF] font-medium">{order.symbol}</span>
                  <span className={`font-mono text-right ${order.side === 'Buy' ? 'text-[#2EAD65]' : 'text-[#F6465D]'}`}>
                    {order.qty.toFixed(4)}
                  </span>
                  <span className="text-[#EAECEF] font-mono text-right">
                    {order.price ? order.price.toFixed(2) : 'Market'}
                  </span>
                  <span className="text-[#848E9C] text-center">{order.orderType}</span>
                  <span className={`text-[10px] text-center ${
                    order.status === 'Filled' ? 'text-[#2EAD65]' :
                    order.status === 'Canceled' ? 'text-[#F6465D]' :
                    'text-[#848E9C]'
                  }`}>
                    {order.status}
                  </span>
                  <span className="text-[#848E9C] text-[10px] text-right">
                    {new Date(order.createdAt).toLocaleTimeString()}
                  </span>
                  <span className="col-span-4"></span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
