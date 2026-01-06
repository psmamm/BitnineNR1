import { useState, useEffect, useCallback } from 'react';

export interface CryptoNewsItem {
    id: string;
    headline: string;
    summary: string;
    source: string;
    timestamp: Date;
    isBreaking: boolean;
    url: string;
    imageUrl?: string;
}

export function useCryptoNews() {
    const [news, setNews] = useState<CryptoNewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchNews = useCallback(async () => {
        try {
            setError(null);
            setLoading(true);

            console.log('📰 Fetching real crypto news from API...');

            const response = await fetch('/api/crypto-news');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.news && Array.isArray(data.news)) {
                // Convert timestamp strings back to Date objects
                const processedNews = data.news.map((item: any) => ({
                    ...item,
                    timestamp: new Date(item.timestamp)
                }));

                setNews(processedNews);
                console.log(`✅ Got ${processedNews.length} real crypto news articles`);

                if (processedNews.length === 0) {
                    setError(data.message || 'No crypto news available');
                }
            } else {
                console.log('⚠️ No news found');
                setNews([]);
                setError(data.message || data.error || 'No crypto news found');
            }

        } catch (err) {
            console.error('❌ Failed to fetch crypto news:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch news';
            setError(errorMessage);
            setNews([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNews();

        // Refresh every 10 minutes
        const interval = setInterval(fetchNews, 10 * 60 * 1000);

        return () => clearInterval(interval);
    }, [fetchNews]);

    return {
        news,
        loading,
        error,
        refetch: fetchNews
    };
}
