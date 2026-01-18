import DashboardLayout from "@/react-app/components/DashboardLayout";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  Rocket,
  Clock,
  CheckCircle2,
  TrendingUp,
  Users,
  Calendar,
  ChevronRight,
  Filter
} from "lucide-react";

type LaunchStatus = 'live' | 'upcoming' | 'completed';

interface LaunchProject {
  id: string;
  name: string;
  symbol: string;
  logo: string;
  status: LaunchStatus;
  description: string;
  totalRaise: string;
  tokenPrice: string;
  startDate: string;
  endDate: string;
  participants: number;
  progress: number;
  chain: string;
  website?: string;
}

export default function LaunchpadPage() {
  const [activeFilter, setActiveFilter] = useState<LaunchStatus | 'all'>('all');

  const projects: LaunchProject[] = [
    {
      id: '1',
      name: 'NexaFi Protocol',
      symbol: 'NEXA',
      logo: 'N',
      status: 'live',
      description: 'Next-generation DeFi infrastructure for cross-chain liquidity.',
      totalRaise: '$2,500,000',
      tokenPrice: '$0.025',
      startDate: '2026-01-15',
      endDate: '2026-01-22',
      participants: 12450,
      progress: 68,
      chain: 'Arbitrum',
    },
    {
      id: '2',
      name: 'MetaVault Finance',
      symbol: 'MVF',
      logo: 'M',
      status: 'live',
      description: 'Automated yield optimization across multiple protocols.',
      totalRaise: '$1,800,000',
      tokenPrice: '$0.15',
      startDate: '2026-01-14',
      endDate: '2026-01-21',
      participants: 8920,
      progress: 85,
      chain: 'Ethereum',
    },
    {
      id: '3',
      name: 'ZeroX Gaming',
      symbol: 'ZXG',
      logo: 'Z',
      status: 'upcoming',
      description: 'Web3 gaming platform with play-to-earn mechanics.',
      totalRaise: '$3,000,000',
      tokenPrice: '$0.08',
      startDate: '2026-01-25',
      endDate: '2026-02-01',
      participants: 0,
      progress: 0,
      chain: 'Solana',
    },
    {
      id: '4',
      name: 'ChainLink AI',
      symbol: 'CLAI',
      logo: 'C',
      status: 'upcoming',
      description: 'AI-powered oracle network for smart contracts.',
      totalRaise: '$5,000,000',
      tokenPrice: '$0.50',
      startDate: '2026-02-01',
      endDate: '2026-02-08',
      participants: 0,
      progress: 0,
      chain: 'Ethereum',
    },
    {
      id: '5',
      name: 'SolPay',
      symbol: 'SPAY',
      logo: 'S',
      status: 'completed',
      description: 'Decentralized payment solution for merchants.',
      totalRaise: '$1,500,000',
      tokenPrice: '$0.12',
      startDate: '2026-01-01',
      endDate: '2026-01-08',
      participants: 15680,
      progress: 100,
      chain: 'Solana',
    },
    {
      id: '6',
      name: 'DefiStake',
      symbol: 'DSTK',
      logo: 'D',
      status: 'completed',
      description: 'Liquid staking derivatives protocol.',
      totalRaise: '$2,000,000',
      tokenPrice: '$0.20',
      startDate: '2025-12-20',
      endDate: '2025-12-27',
      participants: 22340,
      progress: 100,
      chain: 'Arbitrum',
    },
  ];

  const filteredProjects = activeFilter === 'all'
    ? projects
    : projects.filter(p => p.status === activeFilter);

  const getStatusConfig = (status: LaunchStatus) => {
    switch (status) {
      case 'live':
        return { color: 'bg-[#10B981]', text: 'Live', icon: TrendingUp };
      case 'upcoming':
        return { color: 'bg-[#F59E0B]', text: 'Upcoming', icon: Clock };
      case 'completed':
        return { color: 'bg-[#6B7280]', text: 'Completed', icon: CheckCircle2 };
    }
  };

  const stats = {
    totalRaised: '$45.2M',
    projects: 48,
    participants: '125K+',
    avgROI: '312%',
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white flex items-center gap-3">
              <Rocket className="w-7 h-7 text-[#03AAC7]" />
              Launchpad
            </h1>
            <p className="text-[#9CA3AF] text-sm mt-1">Discover and participate in token launches</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Raised', value: stats.totalRaised, icon: TrendingUp },
            { label: 'Projects Launched', value: stats.projects, icon: Rocket },
            { label: 'Participants', value: stats.participants, icon: Users },
            { label: 'Avg. ROI', value: stats.avgROI, icon: TrendingUp },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className="w-4 h-4 text-[#03AAC7]" />
                <span className="text-[#6B7280] text-sm">{stat.label}</span>
              </div>
              <span className="text-xl font-semibold text-white">{stat.value}</span>
            </motion.div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 p-1 bg-[#1B1B1D] rounded-lg w-fit">
          {[
            { id: 'all', label: 'All' },
            { id: 'live', label: 'Live' },
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'completed', label: 'Completed' },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id as LaunchStatus | 'all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === filter.id
                  ? 'bg-[#03AAC7] text-[#151517]'
                  : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project, index) => {
            const statusConfig = getStatusConfig(project.status);
            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] overflow-hidden hover:border-[#3A3E45] transition-colors"
              >
                {/* Project Header */}
                <div className="p-5 border-b border-[#2B2F36]">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#03AAC7] to-[#26BFD4] flex items-center justify-center text-white font-bold text-lg">
                        {project.logo}
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">{project.name}</h3>
                        <span className="text-[#6B7280] text-sm">${project.symbol}</span>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${statusConfig.color}/20`}>
                      <statusConfig.icon className={`w-3 h-3 ${statusConfig.color.replace('bg-', 'text-')}`} />
                      <span className={`text-xs font-medium ${statusConfig.color.replace('bg-', 'text-')}`}>
                        {statusConfig.text}
                      </span>
                    </div>
                  </div>
                  <p className="text-[#9CA3AF] text-sm line-clamp-2">{project.description}</p>
                </div>

                {/* Project Details */}
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[#6B7280] text-xs block mb-1">Total Raise</span>
                      <span className="text-white font-medium">{project.totalRaise}</span>
                    </div>
                    <div>
                      <span className="text-[#6B7280] text-xs block mb-1">Token Price</span>
                      <span className="text-white font-medium">{project.tokenPrice}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {project.status !== 'upcoming' && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[#6B7280] text-xs">Progress</span>
                        <span className="text-white text-xs font-medium">{project.progress}%</span>
                      </div>
                      <div className="h-2 bg-[#252629] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#03AAC7] rounded-full transition-all"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Date & Chain */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-[#6B7280]">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(project.startDate).toLocaleDateString()}</span>
                    </div>
                    <span className="px-2 py-0.5 bg-[#252629] text-[#9CA3AF] rounded text-xs">
                      {project.chain}
                    </span>
                  </div>

                  {/* Participants */}
                  {project.participants > 0 && (
                    <div className="flex items-center gap-1 text-[#6B7280] text-sm">
                      <Users className="w-4 h-4" />
                      <span>{project.participants.toLocaleString()} participants</span>
                    </div>
                  )}

                  {/* Action Button */}
                  <button
                    className={`w-full py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                      project.status === 'live'
                        ? 'bg-[#03AAC7] hover:bg-[#26BFD4] text-[#151517]'
                        : project.status === 'upcoming'
                        ? 'bg-[#252629] hover:bg-[#2B2F36] text-white'
                        : 'bg-[#252629] text-[#6B7280] cursor-not-allowed'
                    }`}
                    disabled={project.status === 'completed'}
                  >
                    {project.status === 'live' && 'Participate Now'}
                    {project.status === 'upcoming' && 'Subscribe'}
                    {project.status === 'completed' && 'Ended'}
                    {project.status !== 'completed' && <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredProjects.length === 0 && (
          <div className="text-center py-12">
            <Filter className="w-12 h-12 text-[#6B7280] mx-auto mb-4" />
            <h3 className="text-white font-medium mb-2">No projects found</h3>
            <p className="text-[#6B7280] text-sm">Try adjusting your filter</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
