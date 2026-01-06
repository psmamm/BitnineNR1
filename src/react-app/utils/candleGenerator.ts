import { CandlestickData, Time } from 'lightweight-charts';

interface CandleGeneratorOptions {
    startPrice: number;
    volatility: number;
    trend: 'bullish' | 'bearish' | 'neutral';
}

interface MarketEventImpact {
    type: string;
    priceMultiplier: number;
    volatilityMultiplier: number;
    duration: number;
}

export class CandleGenerator {
    private currentPrice: number;
    private volatility: number;
    private trend: 'bullish' | 'bearish' | 'neutral';

    private candleCount: number = 0;
    private marketEvent: MarketEventImpact | null = null;

    constructor(options: CandleGeneratorOptions) {
        this.currentPrice = options.startPrice;
        this.volatility = options.volatility;
        this.trend = options.trend;

    }

    setMarketEvent(event: MarketEventImpact | null): void {
        this.marketEvent = event;
    }

    generateCandle(): CandlestickData<Time> {
        this.candleCount++;

        // Apply market event impact if active
        let volatilityMultiplier = 1;
        let priceImpact = 0;

        if (this.marketEvent) {
            volatilityMultiplier = this.marketEvent.volatilityMultiplier;
            priceImpact = (this.currentPrice * this.marketEvent.priceMultiplier) - this.currentPrice;
        }

        // Calculate trend bias
        let trendBias = 0;
        if (this.trend === 'bullish') trendBias = 0.001;
        else if (this.trend === 'bearish') trendBias = -0.001;

        // Generate random price movement
        const randomFactor = (Math.random() - 0.5) * 2;
        const priceChange = this.currentPrice * this.volatility * volatilityMultiplier * randomFactor + (this.currentPrice * trendBias) + priceImpact;

        const open = this.currentPrice;
        const close = this.currentPrice + priceChange;

        // Generate high and low with some variance
        const wickRange = Math.abs(priceChange) * (0.5 + Math.random() * 0.5);
        const high = Math.max(open, close) + wickRange * Math.random();
        const low = Math.min(open, close) - wickRange * Math.random();

        this.currentPrice = close;

        // Generate timestamp (add 60 seconds per candle for 1m timeframe)
        const now = Math.floor(Date.now() / 1000) + (this.candleCount * 60);

        return {
            time: now as Time,
            open: parseFloat(open.toFixed(2)),
            high: parseFloat(high.toFixed(2)),
            low: parseFloat(low.toFixed(2)),
            close: parseFloat(close.toFixed(2)),
        };
    }

    static calculateVolatility(candles: CandlestickData[]): number {
        if (candles.length < 2) return 0.01;

        const returns: number[] = [];
        for (let i = 1; i < candles.length; i++) {
            const prevClose = candles[i - 1].close;
            const currClose = candles[i].close;
            returns.push((currClose - prevClose) / prevClose);
        }

        const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;

        return Math.sqrt(variance);
    }

    static calculateAverageVolume(candles: (CandlestickData & { volume?: number })[]): number {
        const volumes = candles.filter(c => c.volume).map(c => c.volume!);
        if (volumes.length === 0) return 1000;
        return volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
    }

    static detectTrend(candles: CandlestickData[]): 'bullish' | 'bearish' | 'neutral' {
        if (candles.length < 20) return 'neutral';

        const recent = candles.slice(-20);
        const firstClose = recent[0].close;
        const lastClose = recent[recent.length - 1].close;
        const change = (lastClose - firstClose) / firstClose;

        if (change > 0.02) return 'bullish';
        if (change < -0.02) return 'bearish';
        return 'neutral';
    }
}

export function createMarketEventImpact(
    eventType: string,
    severity: 'low' | 'medium' | 'high'
): MarketEventImpact {
    const severityMultipliers = {
        low: 1.5,
        medium: 2.5,
        high: 4,
    };

    const eventConfigs: Record<string, { priceMultiplier: number; volatilityMultiplier: number; duration: number }> = {
        flash_crash: {
            priceMultiplier: severity === 'high' ? 0.9 : severity === 'medium' ? 0.95 : 0.98,
            volatilityMultiplier: severityMultipliers[severity],
            duration: 30000,
        },
        volatility_spike: {
            priceMultiplier: 1,
            volatilityMultiplier: severityMultipliers[severity] * 1.5,
            duration: 60000,
        },
        whale_dump: {
            priceMultiplier: severity === 'high' ? 0.92 : severity === 'medium' ? 0.96 : 0.98,
            volatilityMultiplier: severityMultipliers[severity],
            duration: 45000,
        },
        liquidity_shock: {
            priceMultiplier: 1,
            volatilityMultiplier: severityMultipliers[severity] * 2,
            duration: 20000,
        },
        fake_news: {
            priceMultiplier: Math.random() > 0.5 ? 1.02 : 0.98,
            volatilityMultiplier: severityMultipliers[severity],
            duration: 40000,
        },
        exchange_outage: {
            priceMultiplier: 1,
            volatilityMultiplier: 0.1, // Very low volatility during outage
            duration: 30000,
        },
    };

    const config = eventConfigs[eventType] || {
        priceMultiplier: 1,
        volatilityMultiplier: 1,
        duration: 10000,
    };

    return {
        ...config,
        type: eventType,
    };
}
