import DashboardLayout from "@/react-app/components/DashboardLayout";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  Ticket,
  Plus,
  CheckCircle2,
  XCircle,
  Tag,
  Calendar,
  Gift,
  Copy,
  Check
} from "lucide-react";

type VoucherStatus = 'active' | 'used' | 'expired';
type VoucherType = 'trading' | 'fee' | 'bonus' | 'referral';

interface Voucher {
  id: string;
  code: string;
  type: VoucherType;
  name: string;
  description: string;
  value: string;
  status: VoucherStatus;
  expiresAt: string;
  createdAt: string;
  usedAt?: string;
}

export default function VouchersPage() {
  const [activeTab, setActiveTab] = useState<VoucherStatus | 'all'>('active');
  const [voucherCode, setVoucherCode] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);

  const vouchers: Voucher[] = [
    {
      id: '1',
      code: 'WELCOME100',
      type: 'bonus',
      name: 'Welcome Bonus',
      description: '$100 trading credit for new users',
      value: '$100',
      status: 'active',
      expiresAt: '2026-02-28',
      createdAt: '2026-01-15',
    },
    {
      id: '2',
      code: 'FEE50OFF',
      type: 'fee',
      name: '50% Fee Discount',
      description: '50% off trading fees for 7 days',
      value: '50% off',
      status: 'active',
      expiresAt: '2026-01-31',
      createdAt: '2026-01-10',
    },
    {
      id: '3',
      code: 'TRADE25',
      type: 'trading',
      name: 'Trading Voucher',
      description: '$25 trading bonus',
      value: '$25',
      status: 'used',
      expiresAt: '2026-01-20',
      createdAt: '2026-01-01',
      usedAt: '2026-01-05',
    },
    {
      id: '4',
      code: 'NEWYEAR24',
      type: 'bonus',
      name: 'New Year Bonus',
      description: 'Special new year trading credit',
      value: '$50',
      status: 'expired',
      expiresAt: '2026-01-01',
      createdAt: '2025-12-25',
    },
  ];

  const filteredVouchers = activeTab === 'all'
    ? vouchers
    : vouchers.filter(v => v.status === activeTab);

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRedeem = async () => {
    if (!voucherCode.trim()) return;
    setIsRedeeming(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRedeeming(false);
    setVoucherCode('');
  };

  const getStatusConfig = (status: VoucherStatus) => {
    switch (status) {
      case 'active':
        return { color: 'text-[#10B981]', bg: 'bg-[#10B981]/10', icon: CheckCircle2 };
      case 'used':
        return { color: 'text-[#6B7280]', bg: 'bg-[#6B7280]/10', icon: Check };
      case 'expired':
        return { color: 'text-[#F43F5E]', bg: 'bg-[#F43F5E]/10', icon: XCircle };
    }
  };

  const getTypeConfig = (type: VoucherType) => {
    switch (type) {
      case 'trading':
        return { color: 'text-[#FCD535]', label: 'Trading' };
      case 'fee':
        return { color: 'text-[#8B5CF6]', label: 'Fee Discount' };
      case 'bonus':
        return { color: 'text-[#F59E0B]', label: 'Bonus' };
      case 'referral':
        return { color: 'text-[#10B981]', label: 'Referral' };
    }
  };

  const stats = {
    active: vouchers.filter(v => v.status === 'active').length,
    totalValue: vouchers
      .filter(v => v.status === 'active')
      .reduce((sum, v) => {
        const match = v.value.match(/\$(\d+)/);
        return sum + (match ? parseInt(match[1]) : 0);
      }, 0),
    used: vouchers.filter(v => v.status === 'used').length,
    expired: vouchers.filter(v => v.status === 'expired').length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white flex items-center gap-3">
              <Ticket className="w-7 h-7 text-[#8B5CF6]" />
              Vouchers
            </h1>
            <p className="text-[#9CA3AF] text-sm mt-1">Manage your vouchers and promotional codes</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-[#10B981]/20 to-[#10B981]/5 rounded-xl border border-[#10B981]/30 p-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <Ticket className="w-5 h-5 text-[#10B981]" />
              <span className="text-[#9CA3AF] text-sm">Active Vouchers</span>
            </div>
            <div className="text-3xl font-bold text-white">{stats.active}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <Gift className="w-5 h-5 text-[#F59E0B]" />
              <span className="text-[#9CA3AF] text-sm">Total Value</span>
            </div>
            <div className="text-3xl font-bold text-white">${stats.totalValue}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <Check className="w-5 h-5 text-[#6B7280]" />
              <span className="text-[#9CA3AF] text-sm">Used</span>
            </div>
            <div className="text-3xl font-bold text-white">{stats.used}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-5 h-5 text-[#F43F5E]" />
              <span className="text-[#9CA3AF] text-sm">Expired</span>
            </div>
            <div className="text-3xl font-bold text-white">{stats.expired}</div>
          </motion.div>
        </div>

        {/* Redeem Voucher */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Plus className="w-5 h-5 text-[#FCD535]" />
            <h3 className="text-white font-semibold">Redeem Voucher Code</h3>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Enter voucher code"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 bg-[#252629] border border-[#2B2F36] rounded-lg text-white placeholder-[#6B7280] focus:border-[#FCD535] focus:outline-none uppercase tracking-wider"
              />
            </div>
            <button
              onClick={handleRedeem}
              disabled={!voucherCode.trim() || isRedeeming}
              className="px-6 py-3 bg-[#FCD535] hover:bg-[#FFE066] text-[#151517] rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRedeeming ? 'Redeeming...' : 'Redeem'}
            </button>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex items-center gap-2 p-1 bg-[#1B1B1D] rounded-lg w-fit">
          {[
            { id: 'all', label: 'All' },
            { id: 'active', label: 'Active' },
            { id: 'used', label: 'Used' },
            { id: 'expired', label: 'Expired' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as VoucherStatus | 'all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#FCD535] text-[#151517]'
                  : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Vouchers List */}
        <div className="space-y-3">
          {filteredVouchers.length > 0 ? (
            filteredVouchers.map((voucher, index) => {
              const statusConfig = getStatusConfig(voucher.status);
              const typeConfig = getTypeConfig(voucher.type);
              return (
                <motion.div
                  key={voucher.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`bg-[#1B1B1D] rounded-xl border border-[#2B2F36] overflow-hidden ${
                    voucher.status !== 'active' ? 'opacity-70' : ''
                  }`}
                >
                  <div className="flex items-stretch">
                    {/* Left section with value */}
                    <div className="w-32 bg-gradient-to-br from-[#252629] to-[#1B1B1D] flex flex-col items-center justify-center p-4 border-r border-[#2B2F36]">
                      <div className="text-2xl font-bold text-white">{voucher.value}</div>
                      <span className={`text-xs font-medium ${typeConfig.color}`}>{typeConfig.label}</span>
                    </div>

                    {/* Main content */}
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-white font-semibold">{voucher.name}</h4>
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                              <statusConfig.icon className="w-3 h-3" />
                              {voucher.status.charAt(0).toUpperCase() + voucher.status.slice(1)}
                            </span>
                          </div>
                          <p className="text-[#6B7280] text-sm mb-2">{voucher.description}</p>
                          <div className="flex items-center gap-4 text-xs text-[#6B7280]">
                            <div className="flex items-center gap-1">
                              <Tag className="w-3 h-3" />
                              <button
                                onClick={() => handleCopy(voucher.code, voucher.id)}
                                className="font-mono hover:text-white transition-colors flex items-center gap-1"
                              >
                                {voucher.code}
                                {copiedId === voucher.id ? (
                                  <Check className="w-3 h-3 text-[#10B981]" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {voucher.status === 'used' && voucher.usedAt ? (
                                <span>Used: {new Date(voucher.usedAt).toLocaleDateString()}</span>
                              ) : (
                                <span>Expires: {new Date(voucher.expiresAt).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {voucher.status === 'active' && (
                          <button className="px-4 py-2 bg-[#FCD535] hover:bg-[#FFE066] text-[#151517] rounded-lg font-medium text-sm transition-colors">
                            Use Now
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-12 text-center">
              <Ticket className="w-12 h-12 text-[#6B7280] mx-auto mb-4" />
              <h3 className="text-white font-medium mb-2">No Vouchers Found</h3>
              <p className="text-[#6B7280] text-sm">
                {activeTab === 'all'
                  ? 'Enter a voucher code above to get started'
                  : `No ${activeTab} vouchers at the moment`}
              </p>
            </div>
          )}
        </div>

        {/* Info Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-[#252629] rounded-lg p-4"
        >
          <h4 className="text-white font-medium mb-2">How Vouchers Work</h4>
          <ul className="text-[#9CA3AF] text-sm space-y-1">
            <li>• Trading vouchers can be used as credit for spot or futures trading</li>
            <li>• Fee discount vouchers reduce your trading fees for a limited time</li>
            <li>• Vouchers cannot be combined or transferred</li>
            <li>• Check expiration dates to ensure you use vouchers before they expire</li>
          </ul>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
