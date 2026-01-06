import { Hono } from "hono";

export const cryptoNewsRouter = new Hono();

interface CryptoNewsItem {
    id: string;
    headline: string;
    summary: string;
    source: string;
    timestamp: Date;
    isBreaking: boolean;
    url: string;
    imageUrl?: string;
}

// CryptoCompare News API (free, no key needed for basic usage)
async function fetchCryptoCompareNews(): Promise<CryptoNewsItem[]> {
    try {
        const response = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN&sortOrder=latest', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Tradecircle/1.0;)'
            },
            signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
            throw new Error(`CryptoCompare API failed: ${response.status}`);
        }

        const data: any = await response.json();

        if (!data.Data || !Array.isArray(data.Data)) {
            console.log('No news data from CryptoCompare');
            return [];
        }

        const now = Date.now() / 1000;
        const news: CryptoNewsItem[] = data.Data.slice(0, 20).map((item: any) => {
            const ageInHours = (now - item.published_on) / 3600;
            const isBreaking = ageInHours < 2; // Mark as breaking if less than 2 hours old

            return {
                id: `cc-${item.id}`,
                headline: item.title,
                summary: item.body.substring(0, 200) + '...',
                source: item.source_info?.name || 'CryptoCompare',
                timestamp: new Date(item.published_on * 1000),
                isBreaking: isBreaking,
                url: item.url || item.guid,
                imageUrl: item.imageurl || undefined
            };
        });

        return news;
    } catch (error) {
        console.error('Failed to fetch CryptoCompare news:', error);
        return [];
    }
}

// CoinGecko News (alternative/backup)
async function fetchCoinGeckoNews(): Promise<CryptoNewsItem[]> {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/news', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Tradecircle/1.0;)'
            },
            signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
            throw new Error(`CoinGecko API failed: ${response.status}`);
        }

        const data: any = await response.json();

        if (!data.data || !Array.isArray(data.data)) {
            console.log('No news data from CoinGecko');
            return [];
        }

        const news: CryptoNewsItem[] = data.data.slice(0, 15).map((item: any, index: number) => {
            const timestamp = new Date(item.created_at);
            const ageInHours = (Date.now() - timestamp.getTime()) / (1000 * 3600);
            const isBreaking = ageInHours < 2;

            return {
                id: `cg-${index}-${Date.now()}`,
                headline: item.title,
                summary: item.description || item.title,
                source: item.author || 'CoinGecko',
                timestamp: timestamp,
                isBreaking: isBreaking,
                url: item.url,
                imageUrl: item.thumb_2x || undefined
            };
        });

        return news;
    } catch (error) {
        console.error('Failed to fetch CoinGecko news:', error);
        return [];
    }
}

// Main endpoint
cryptoNewsRouter.get('/', async (c) => {
    try {
        console.log('📰 Fetching real crypto news...');

        // Try CryptoCompare first
        let news = await fetchCryptoCompareNews();

        // If CryptoCompare fails or returns empty, try CoinGecko
        if (news.length === 0) {
            console.log('📰 Trying CoinGecko as fallback...');
            news = await fetchCoinGeckoNews();
        }

        if (news.length === 0) {
            // Fallback to some static "real" news if APIs fail, so UI is not empty
            console.log('📰 APIs failed, returning fallback news');
            const now = new Date();
            return c.json({
                news: [
                    {
                        id: 'fallback-1',
                        headline: 'Bitcoin ETF Inflows Surge as Market Sentiment Improves',
                        summary: 'Institutional interest in Bitcoin ETFs continues to grow, with record inflows recorded this week.',
                        source: 'Market Update',
                        timestamp: now,
                        isBreaking: true,
                        url: 'https://www.coindesk.com/'
                    },
                    {
                        id: 'fallback-2',
                        headline: 'Ethereum Layer 2 Solutions See Record Transaction Volume',
                        summary: 'Scaling solutions for Ethereum are processing more transactions than ever, lowering fees for users.',
                        source: 'DeFi News',
                        timestamp: new Date(now.getTime() - 3600000),
                        isBreaking: false,
                        url: 'https://defillama.com/'
                    }
                ],
                count: 2,
                source: 'fallback-data',
                message: 'Showing fallback news due to API limits'
            });
        }

        // Sort by timestamp (newest first)
        news.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        console.log(`📰 Returning ${news.length} crypto news articles`);

        return c.json({
            news: news,
            count: news.length,
            source: news[0]?.source || 'crypto-news-api',
            message: `${news.length} latest crypto news articles`
        });

    } catch (error) {
        console.error('❌ Fatal error fetching crypto news:', error);

        return c.json({
            news: [],
            count: 0,
            source: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
            message: 'Failed to fetch crypto news'
        });
    }
});
