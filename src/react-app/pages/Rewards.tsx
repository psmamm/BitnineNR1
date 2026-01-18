import DashboardLayout from "@/react-app/components/DashboardLayout";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  Gift,
  Trophy,
  Star,
  Zap,
  CheckCircle2,
  Clock,
  Coins,
  Target,
  Award
} from "lucide-react";

type TaskStatus = 'available' | 'completed' | 'locked';
type TaskCategory = 'daily' | 'weekly' | 'special';

interface Task {
  id: string;
  title: string;
  description: string;
  reward: number;
  rewardType: 'points' | 'usdt' | 'token';
  status: TaskStatus;
  category: TaskCategory;
  progress?: number;
  maxProgress?: number;
  expiresAt?: string;
}

interface Reward {
  id: string;
  name: string;
  description: string;
  cost: number;
  image?: string;
  available: boolean;
  quantity?: number;
}

export default function RewardsPage() {
  const [activeTab, setActiveTab] = useState<'tasks' | 'rewards' | 'history'>('tasks');
  const [activeCategory, setActiveCategory] = useState<TaskCategory | 'all'>('all');

  const userPoints = 0;
  const totalEarned = 0;
  const currentStreak = 0;

  const tasks: Task[] = [
    {
      id: '1',
      title: 'Daily Login',
      description: 'Log in to the platform',
      reward: 10,
      rewardType: 'points',
      status: 'available',
      category: 'daily',
    },
    {
      id: '2',
      title: 'Complete a Trade',
      description: 'Execute at least one spot or futures trade',
      reward: 25,
      rewardType: 'points',
      status: 'available',
      category: 'daily',
    },
    {
      id: '3',
      title: 'Deposit Funds',
      description: 'Make a deposit of any amount',
      reward: 50,
      rewardType: 'points',
      status: 'available',
      category: 'daily',
    },
    {
      id: '4',
      title: 'Trade Volume: $1,000',
      description: 'Reach $1,000 in weekly trading volume',
      reward: 100,
      rewardType: 'points',
      status: 'available',
      category: 'weekly',
      progress: 0,
      maxProgress: 1000,
    },
    {
      id: '5',
      title: 'Refer a Friend',
      description: 'Invite a friend who completes their first trade',
      reward: 500,
      rewardType: 'points',
      status: 'available',
      category: 'special',
    },
    {
      id: '6',
      title: 'First Futures Trade',
      description: 'Complete your first futures trade',
      reward: 200,
      rewardType: 'points',
      status: 'available',
      category: 'special',
    },
    {
      id: '7',
      title: 'Verify KYC',
      description: 'Complete identity verification',
      reward: 100,
      rewardType: 'points',
      status: 'locked',
      category: 'special',
    },
    {
      id: '8',
      title: '7-Day Login Streak',
      description: 'Log in for 7 consecutive days',
      reward: 150,
      rewardType: 'points',
      status: 'available',
      category: 'weekly',
      progress: currentStreak,
      maxProgress: 7,
    },
  ];

  const rewards: Reward[] = [
    {
      id: '1',
      name: 'Trading Fee Discount (5%)',
      description: '5% off trading fees for 7 days',
      cost: 500,
      available: userPoints >= 500,
    },
    {
      id: '2',
      name: 'VIP Status Trial',
      description: 'Experience VIP benefits for 3 days',
      cost: 1000,
      available: userPoints >= 1000,
    },
    {
      id: '3',
      name: '$5 Trading Voucher',
      description: 'Get $5 credit for trading',
      cost: 2500,
      available: userPoints >= 2500,
      quantity: 10,
    },
    {
      id: '4',
      name: 'Mystery Box',
      description: 'Random reward worth up to $50',
      cost: 5000,
      available: userPoints >= 5000,
      quantity: 5,
    },
  ];

  const filteredTasks = activeCategory === 'all'
    ? tasks
    : tasks.filter(t => t.category === activeCategory);

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-5 h-5 text-[#10B981]" />;
      case 'locked': return <Clock className="w-5 h-5 text-[#6B7280]" />;
      default: return <Target className="w-5 h-5 text-[#FCD535]" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white flex items-center gap-3">
              <Gift className="w-7 h-7 text-[#F59E0B]" />
              Rewards Center
            </h1>
            <p className="text-[#9CA3AF] text-sm mt-1">Complete tasks and earn rewards</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-[#FCD535]/20 to-[#FCD535]/5 rounded-xl border border-[#FCD535]/30 p-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <Coins className="w-5 h-5 text-[#FCD535]" />
              <span className="text-[#9CA3AF] text-sm">Current Points</span>
            </div>
            <div className="text-3xl font-bold text-white">{userPoints.toLocaleString()}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-[#F59E0B]" />
              <span className="text-[#9CA3AF] text-sm">Total Earned</span>
            </div>
            <div className="text-3xl font-bold text-white">{totalEarned.toLocaleString()}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-[#8B5CF6]" />
              <span className="text-[#9CA3AF] text-sm">Login Streak</span>
            </div>
            <div className="text-3xl font-bold text-white">{currentStreak} days</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-5 h-5 text-[#10B981]" />
              <span className="text-[#9CA3AF] text-sm">Level</span>
            </div>
            <div className="text-3xl font-bold text-white">Bronze</div>
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-[#2B2F36]">
          {[
            { id: 'tasks', label: 'Tasks', icon: Target },
            { id: 'rewards', label: 'Rewards', icon: Gift },
            { id: 'history', label: 'History', icon: Clock },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'text-[#FCD535] border-[#FCD535]'
                  : 'text-[#6B7280] border-transparent hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            {/* Category Filter */}
            <div className="flex items-center gap-2">
              {[
                { id: 'all', label: 'All' },
                { id: 'daily', label: 'Daily' },
                { id: 'weekly', label: 'Weekly' },
                { id: 'special', label: 'Special' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id as TaskCategory | 'all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeCategory === cat.id
                      ? 'bg-[#FCD535] text-[#151517]'
                      : 'bg-[#1B1B1D] text-[#9CA3AF] hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Tasks List */}
            <div className="space-y-3">
              {filteredTasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-4 ${
                    task.status === 'locked' ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {getStatusIcon(task.status)}
                      <div>
                        <h4 className="text-white font-medium">{task.title}</h4>
                        <p className="text-[#6B7280] text-sm">{task.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {task.progress !== undefined && task.maxProgress && (
                        <div className="text-right">
                          <div className="text-[#9CA3AF] text-sm mb-1">
                            {task.progress} / {task.maxProgress}
                          </div>
                          <div className="w-24 h-1.5 bg-[#252629] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#FCD535] rounded-full"
                              style={{ width: `${(task.progress / task.maxProgress) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-[#F59E0B]">
                          <Star className="w-4 h-4" />
                          <span className="font-semibold">+{task.reward}</span>
                        </div>
                        <span className="text-[#6B7280] text-xs">points</span>
                      </div>
                      {task.status === 'available' && (
                        <button className="px-4 py-2 bg-[#FCD535] hover:bg-[#FFE066] text-[#151517] rounded-lg font-medium text-sm transition-colors">
                          Claim
                        </button>
                      )}
                      {task.status === 'completed' && (
                        <span className="px-4 py-2 bg-[#10B981]/20 text-[#10B981] rounded-lg font-medium text-sm">
                          Done
                        </span>
                      )}
                      {task.status === 'locked' && (
                        <span className="px-4 py-2 bg-[#252629] text-[#6B7280] rounded-lg font-medium text-sm">
                          Locked
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Rewards Tab */}
        {activeTab === 'rewards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {rewards.map((reward, index) => (
              <motion.div
                key={reward.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] overflow-hidden hover:border-[#3A3E45] transition-colors"
              >
                <div className="h-32 bg-gradient-to-br from-[#252629] to-[#1B1B1D] flex items-center justify-center">
                  <Gift className="w-12 h-12 text-[#6B7280]" />
                </div>
                <div className="p-4">
                  <h4 className="text-white font-medium mb-1">{reward.name}</h4>
                  <p className="text-[#6B7280] text-sm mb-3">{reward.description}</p>
                  {reward.quantity && (
                    <div className="text-[#9CA3AF] text-xs mb-3">{reward.quantity} remaining</div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[#F59E0B]">
                      <Star className="w-4 h-4" />
                      <span className="font-semibold">{reward.cost.toLocaleString()}</span>
                    </div>
                    <button
                      disabled={!reward.available}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                        reward.available
                          ? 'bg-[#FCD535] hover:bg-[#FFE066] text-[#151517]'
                          : 'bg-[#252629] text-[#6B7280] cursor-not-allowed'
                      }`}
                    >
                      Redeem
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-8 text-center">
            <Clock className="w-12 h-12 text-[#6B7280] mx-auto mb-4" />
            <h3 className="text-white font-medium mb-2">No Redemption History</h3>
            <p className="text-[#6B7280] text-sm">Your reward redemptions will appear here</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
