import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ExternalLink, RefreshCw, Twitter } from "lucide-react";

interface TwitterPost {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  text: string;
  timestamp: Date;
  url: string;
  likes?: number;
  retweets?: number;
}

interface TwitterFeedProps {
  accounts: Array<{
    username: string;
    displayName: string;
    avatar: string;
  }>;
}

export default function TwitterFeed({ accounts }: TwitterFeedProps) {
  const [posts, setPosts] = useState<TwitterPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const fetchTwitterPosts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch from backend API
      const response = await fetch('/api/twitter-feed');
      
      const data = await response.json();
      
      if (!response.ok || data.source === 'error') {
        // Real error from backend
        setError(data.error || 'Failed to fetch Twitter posts. Please configure Twitter API credentials.');
        setPosts([]);
        return;
      }
      
      if (data.posts && data.posts.length > 0) {
        setPosts(data.posts);
        setError(null);
      } else {
        setError('No posts available');
        setPosts([]);
      }
    } catch (err) {
      console.error('Error fetching Twitter posts:', err);
      setError('Failed to load posts. Please check your connection.');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTwitterPosts();
    // Refresh every 5 minutes
    const interval = setInterval(fetchTwitterPosts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#1E2232] rounded-2xl p-6 border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#6A3DF4]/10 rounded-xl flex items-center justify-center">
            <Twitter className="w-5 h-5 text-[#6A3DF4]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Live Crypto Intel</h3>
            <p className="text-[#7F8C8D] text-xs">WatcherGuru • Lookonchain • Arkham</p>
          </div>
        </div>
        <button
          onClick={fetchTwitterPosts}
          disabled={loading}
          className="p-2 bg-[#0D0F18]/50 hover:bg-[#0D0F18]/70 border border-white/10 hover:border-[#6A3DF4]/50 rounded-xl text-[#BDC3C7] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
        {loading && posts.length === 0 ? (
          <div className="text-center py-8">
            <RefreshCw className="w-6 h-6 text-[#6A3DF4] animate-spin mx-auto mb-3" />
            <p className="text-[#7F8C8D] text-sm">Loading latest posts...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-[#7F8C8D] text-sm">
            <div className="bg-[#6A3DF4]/10 border border-[#6A3DF4]/20 rounded-xl p-4">
              <p className="text-[#6A3DF4] font-semibold mb-2">⚠️ {error}</p>
              <p className="text-xs text-[#7F8C8D] mb-3">
                To enable real Twitter posts, add TWITTER_BEARER_TOKEN to your Cloudflare Worker secrets.
              </p>
              <button
                onClick={fetchTwitterPosts}
                className="px-4 py-2 bg-[#6A3DF4] hover:bg-[#8B5CF6] text-white text-xs rounded-lg transition-colors"
              >
                Try again
              </button>
            </div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-8 text-[#7F8C8D] text-sm">
            <p>No posts available</p>
          </div>
        ) : (
          posts.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => window.open(post.url, '_blank')}
              className="p-3 bg-[#0D0F18]/50 rounded-lg border border-white/10 hover:border-[#6A3DF4]/50 cursor-pointer transition-all group"
            >
              <div className="flex items-start space-x-3">
                <img
                  src={post.avatar}
                  alt={post.displayName}
                  className="w-8 h-8 rounded-full flex-shrink-0"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(post.displayName)}&background=6A3DF4&color=fff&size=128`;
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-white text-sm font-semibold">{post.displayName}</span>
                    <span className="text-[#7F8C8D] text-xs">@{post.username}</span>
                    <span className="text-[#7F8C8D] text-xs">•</span>
                    <span className="text-[#7F8C8D] text-xs">{formatTimeAgo(post.timestamp)}</span>
                  </div>
                  <p className="text-white text-sm leading-relaxed">{post.text}</p>
                  {(post.likes || post.retweets) && (
                    <div className="flex items-center space-x-4 mt-2">
                      {post.likes && (
                        <span className="text-[#7F8C8D] text-xs">❤️ {post.likes.toLocaleString()}</span>
                      )}
                      {post.retweets && (
                        <span className="text-[#7F8C8D] text-xs">🔄 {post.retweets.toLocaleString()}</span>
                      )}
                    </div>
                  )}
                </div>
                <ExternalLink className="w-3 h-3 text-[#7F8C8D] group-hover:text-[#6A3DF4] transition-colors mt-1 flex-shrink-0" />
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

