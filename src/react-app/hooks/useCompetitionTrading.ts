import { useState, useCallback } from 'react';

export interface Position {
    id: string;
    symbol: string;
    type: 'Long' | 'Short';
    leverage: number;
    size: number;
    entryPrice: number;
    markPrice: number;
    pnl: number;
    pnlPercent: number;
    takeProfit?: number;
    stopLoss?: number;
    commission: number;
}

export function useCompetitionTrading(
    currentPrice: number,
    tradingFeePercent: number,
    slippageMultiplier: number,
    exchangeOutage: boolean,
    maxPositions: number,
    onPositionClosed?: (position: Position, finalPnl: number) => void
) {
    const [positions, setPositions] = useState<Position[]>([]);

    const executeTrade = useCallback((type: 'Long' | 'Short', quantity: number, leverage: number, takeProfit?: number, stopLoss?: number) => {
        if (exchangeOutage) {
            alert('🚫 Trading disabled during exchange outage!');
            return;
        }

        if (positions.length >= maxPositions) {
            alert(`⚠️ Maximum ${maxPositions} positions allowed!`);
            return;
        }

        // Calculate fees
        const positionValue = currentPrice * quantity;
        const commission = positionValue * (tradingFeePercent / 100) * slippageMultiplier;

        const newPosition: Position = {
            id: Math.random().toString(36).substr(2, 9),
            symbol: 'BTC/USDT',
            type,
            leverage,
            size: quantity,
            entryPrice: currentPrice * slippageMultiplier, // Apply slippage
            markPrice: currentPrice,
            pnl: 0,
            pnlPercent: 0,
            takeProfit: takeProfit,
            stopLoss: stopLoss,
            commission,
        };

        setPositions(prev => [newPosition, ...prev]);
        return newPosition;
    }, [currentPrice, tradingFeePercent, slippageMultiplier, exchangeOutage, maxPositions, positions.length]);

    const closePosition = useCallback((id: string) => {
        const pos = positions.find(p => p.id === id);
        if (pos) {
            // Add exit commission
            const exitCommission = pos.markPrice * pos.size * (tradingFeePercent / 100);
            const finalPnl = pos.pnl - exitCommission;
            
            if (onPositionClosed) {
                onPositionClosed(pos, finalPnl);
            }
        }
        setPositions(prev => prev.filter(p => p.id !== id));
    }, [positions, tradingFeePercent, onPositionClosed]);

    const updatePositionPrices = useCallback((price: number) => {
        setPositions(prevPositions => prevPositions.map(pos => {
            const priceDiff = price - pos.entryPrice;
            const pnlRaw = pos.type === 'Long' ? priceDiff : -priceDiff;
            const pnl = (pnlRaw * pos.size) - pos.commission;
            const pnlPercent = (pnlRaw / pos.entryPrice) * pos.leverage * 100;

            return { ...pos, markPrice: price, pnl, pnlPercent };
        }));
    }, []);

    const checkTakeProfitStopLoss = useCallback((candle: { high: number; low: number; close: number }) => {
        let realizedPnl = 0;

        setPositions(currentPositions => {
            const remainingPositions: Position[] = [];

            currentPositions.forEach(pos => {
                let closed = false;
                let closePrice = 0;

                if (pos.type === 'Long') {
                    if (pos.stopLoss && candle.low <= pos.stopLoss) {
                        closed = true;
                        closePrice = pos.stopLoss;
                    } else if (pos.takeProfit && candle.high >= pos.takeProfit) {
                        closed = true;
                        closePrice = pos.takeProfit;
                    }
                } else {
                    if (pos.stopLoss && candle.high >= pos.stopLoss) {
                        closed = true;
                        closePrice = pos.stopLoss;
                    } else if (pos.takeProfit && candle.low <= pos.takeProfit) {
                        closed = true;
                        closePrice = pos.takeProfit;
                    }
                }

                if (closed) {
                    const priceDiff = closePrice - pos.entryPrice;
                    const pnlRaw = pos.type === 'Long' ? priceDiff : -priceDiff;
                    const pnl = (pnlRaw * pos.size) - pos.commission;
                    realizedPnl += pnl;
                } else {
                    remainingPositions.push(pos);
                }
            });

            return remainingPositions;
        });

        return realizedPnl;
    }, []);

    const clearPositions = useCallback(() => {
        setPositions([]);
    }, []);

    return {
        positions,
        executeTrade,
        closePosition,
        updatePositionPrices,
        checkTakeProfitStopLoss,
        clearPositions,
        setPositions,
    };
}

