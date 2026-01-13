import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import { Button } from '../components/ui/button';
import { Bot, Plus, Play, Pause, Settings, RefreshCw } from 'lucide-react';
import { CreateBotModal, BotFormData } from '../components/bots/CreateBotModal';

interface TradingBot {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'stopped';
  strategy: string;
  pnl: number;
  trades_count: number;
  win_rate: number;
  created_at: string;
}

export default function TradingBotsPage() {
  const { user } = useAuth();
  const [bots, setBots] = useState<TradingBot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchBots = async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/bots', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setBots(data.bots || []);
        }
      } catch (error) {
        console.error('[Trading Bots] Failed to fetch:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBots();
  }, [user]);

  const handleCreateBot = async (botData: BotFormData) => {
    if (!user) return;

    const token = await user.getIdToken();
    const response = await fetch('/api/bots', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: botData.name,
        strategy: botData.strategy,
        symbol: botData.symbol,
        max_position_size: botData.maxPositionSize,
        stop_loss: botData.stopLoss,
        take_profit: botData.takeProfit,
        risk_per_trade: botData.riskPerTrade,
        status: 'paused',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create bot');
    }

    const newBot = await response.json();
    setBots([...bots, newBot.bot]);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <RefreshCw className="w-16 h-16 text-[#00D9C8] animate-spin mx-auto mb-4" />
            <p className="text-zinc-400">Loading trading bots...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Trading Bots</h1>
            <p className="text-zinc-400 mt-1">Automate your trading strategies</p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-[#00D9C8] hover:bg-[#00A89C]"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Bot
          </Button>
        </div>

        {bots.length === 0 ? (
          <div className="text-center py-16 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
            <Bot className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No trading bots yet</h3>
            <p className="text-zinc-400 mb-6">Create your first bot to automate your trading</p>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-[#00D9C8] hover:bg-[#00A89C]"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Bot
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bots.map((bot) => (
              <div
                key={bot.id}
                className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#00D9C8]/10 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-[#00D9C8]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{bot.name}</h3>
                      <p className="text-xs text-zinc-500">{bot.strategy}</p>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    bot.status === 'active'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : bot.status === 'paused'
                      ? 'bg-amber-500/10 text-amber-400'
                      : 'bg-zinc-500/10 text-zinc-400'
                  }`}>
                    {bot.status}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-zinc-500">P&L</p>
                    <p className={`font-bold ${bot.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {bot.pnl >= 0 ? '+' : ''}${bot.pnl.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Trades</p>
                    <p className="font-bold text-white">{bot.trades_count}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Win Rate</p>
                    <p className="font-bold text-white">{(bot.win_rate * 100).toFixed(0)}%</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  {bot.status === 'active' ? (
                    <Button size="sm" variant="outline" className="flex-1">
                      <Pause className="w-4 h-4 mr-1" />
                      Pause
                    </Button>
                  ) : (
                    <Button size="sm" className="flex-1 bg-[#00D9C8] hover:bg-[#00A89C]">
                      <Play className="w-4 h-4 mr-1" />
                      Start
                    </Button>
                  )}
                  <Button size="sm" variant="outline">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateBotModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateBot={handleCreateBot}
      />
    </DashboardLayout>
  );
}
