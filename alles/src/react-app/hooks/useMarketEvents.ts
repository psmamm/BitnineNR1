import { useState, useEffect, useCallback } from 'react';

export interface MarketEvent {
    id: string;
    type: 'flash_crash' | 'fake_news' | 'liquidity_shock' | 'exchange_outage' | 'whale_dump' | 'volatility_spike';
    title: string;
    description: string;
    impact: string;
    timestamp: number;
    duration?: number;
}

interface UseMarketEventsOptions {
    gameStarted: boolean;
    gameOver: boolean;
    currentPrice?: number;
    onFlashCrash?: (crashPrice: number) => void;
    onVolatilitySpike?: (speed: number) => void;
    onEventTriggered?: (event: MarketEvent) => void;
    onEventEnded?: (event: MarketEvent) => void;
}

export function useMarketEvents({ 
    gameStarted, 
    gameOver,
    currentPrice,
    onFlashCrash,
    onVolatilitySpike,
    onEventTriggered,
    onEventEnded
}: UseMarketEventsOptions) {
    const [marketEvents, setMarketEvents] = useState<MarketEvent[]>([]);
    const [activeEvent, setActiveEvent] = useState<MarketEvent | null>(null);
    const [slippageMultiplier, setSlippageMultiplier] = useState(1);
    const [exchangeOutage, setExchangeOutage] = useState(false);

    const applyEventEffects = useCallback((event: MarketEvent) => {
        switch (event.type) {
            case 'flash_crash':
                if (onFlashCrash && currentPrice !== undefined) {
                    const crashPrice = currentPrice * 0.95;
                    onFlashCrash(crashPrice);
                }
                break;
            case 'liquidity_shock':
                setSlippageMultiplier(5);
                break;
            case 'exchange_outage':
                setExchangeOutage(true);
                break;
            case 'volatility_spike':
                if (onVolatilitySpike) {
                    onVolatilitySpike(50);
                }
                break;
        }
    }, [currentPrice, onFlashCrash, onVolatilitySpike]);

    const removeEventEffects = useCallback((event: MarketEvent) => {
        switch (event.type) {
            case 'liquidity_shock':
                setSlippageMultiplier(1);
                break;
            case 'exchange_outage':
                setExchangeOutage(false);
                break;
            case 'volatility_spike':
                if (onVolatilitySpike) {
                    onVolatilitySpike(100);
                }
                break;
        }
    }, [onVolatilitySpike]);

    const triggerRandomEvent = useCallback(() => {
        const events: Omit<MarketEvent, 'id' | 'timestamp'>[] = [
            {
                type: 'flash_crash',
                title: '⚡ FLASH CRASH!',
                description: 'Market drops 5% instantly!',
                impact: 'Extreme volatility',
                duration: 10000,
            },
            {
                type: 'fake_news',
                title: '📰 BREAKING: Fake Elon Tweet',
                description: 'False bullish signal detected',
                impact: 'Price manipulation',
                duration: 8000,
            },
            {
                type: 'liquidity_shock',
                title: '💧 LIQUIDITY CRISIS',
                description: 'Slippage increased 5x',
                impact: 'High slippage on all trades',
                duration: 12000,
            },
            {
                type: 'exchange_outage',
                title: '🚫 EXCHANGE OUTAGE',
                description: 'Trading disabled for 15 seconds!',
                impact: 'Cannot open/close positions',
                duration: 15000,
            },
            {
                type: 'whale_dump',
                title: '🐋 WHALE DUMP DETECTED',
                description: 'Large sell orders incoming',
                impact: 'Increased downward pressure',
                duration: 10000,
            },
            {
                type: 'volatility_spike',
                title: '📈 VOLATILITY EXPLOSION',
                description: 'Price swings doubled',
                impact: 'Extreme price movements',
                duration: 15000,
            },
        ];

        const randomEvent = events[Math.floor(Math.random() * events.length)];
        const newEvent: MarketEvent = {
            ...randomEvent,
            id: Math.random().toString(36).substr(2, 9),
            timestamp: Date.now(),
        };

        setMarketEvents(prev => [...prev, newEvent]);
        setActiveEvent(newEvent);

        // Apply event effects
        applyEventEffects(newEvent);

        // Notify parent
        if (onEventTriggered) {
            onEventTriggered(newEvent);
        }

        // Remove event after duration
        if (newEvent.duration) {
            setTimeout(() => {
                setActiveEvent(null);
                removeEventEffects(newEvent);
                if (onEventEnded) {
                    onEventEnded(newEvent);
                }
            }, newEvent.duration);
        }
    }, [onEventTriggered, onEventEnded, applyEventEffects, removeEventEffects]);

    // Market Events System
    useEffect(() => {
        if (!gameStarted || gameOver) return;

        const eventInterval = setInterval(() => {
            const eventChance = Math.random();

            if (eventChance < 0.15) { // 15% chance every interval
                triggerRandomEvent();
            }
        }, 15000); // Check every 15 seconds

        return () => clearInterval(eventInterval);
    }, [gameStarted, gameOver, triggerRandomEvent]);

    const resetEvents = useCallback(() => {
        setMarketEvents([]);
        setActiveEvent(null);
        setSlippageMultiplier(1);
        setExchangeOutage(false);
    }, []);

    return {
        marketEvents,
        activeEvent,
        slippageMultiplier,
        exchangeOutage,
        resetEvents,
    };
}
