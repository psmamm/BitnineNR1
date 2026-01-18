import DashboardLayout from "@/react-app/components/DashboardLayout";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  Wallet,
  Users,
  ChevronDown,
  ChevronRight,
  BarChart3,
  History,
  FileText,
  Coins,
  Shield,
  Eye,
  Percent,
  ArrowRight
} from "lucide-react";
import { useNavigate, useLocation } from "react-router";

// Bitget-Style Assets Page with Sidebar
export default function AssetsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    accounts: true,
    products: false,
    orders: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Sidebar menu items
  const sidebarMenu = [
    {
      id: 'accounts',
      label: 'Accounts',
      icon: Users,
      expandable: true,
      items: [
        { label: 'Spot', path: '/assets/spot' },
        { label: 'Margin', path: '/assets/margin' },
        { label: 'Futures', path: '/assets/futures' },
        { label: 'Onchain', path: '/assets/onchain' },
        { label: 'OTC', path: '/assets/otc' },
      ]
    },
    {
      id: 'products',
      label: 'Products',
      icon: Coins,
      expandable: true,
      items: [
        { label: 'Copy trading', path: '/copy-trading' },
        { label: 'Bots', path: '/trading-bots' },
        { label: 'Earn', path: '/earn' },
      ]
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: History,
      expandable: true,
      items: [
        { label: 'Spot orders', path: '/orders/spot' },
        { label: 'Margin orders', path: '/orders/margin' },
        { label: 'Futures orders', path: '/orders/futures' },
        { label: 'Onchain orders', path: '/orders/onchain' },
        { label: 'OTC history', path: '/orders/otc' },
        { label: 'Convert history', path: '/orders/convert' },
        { label: 'Crypto Loans history', path: '/orders/loans' },
        { label: 'Earn history', path: '/orders/earn' },
        { label: 'Voucher history', path: '/orders/vouchers' },
      ]
    },
    {
      id: 'export',
      label: 'Data export',
      icon: FileText,
      expandable: true,
      items: []
    },
  ];

  // Recommended products
  const recommendedProducts = [
    { coin: 'USDC', icon: '$', isNew: true, product: 'On-chain Earn / Flexible', apr: '8.13%' },
    { coin: 'USDT', icon: '₮', isNew: true, product: 'On-chain Earn / Flexible', apr: '7.25%' },
    { coin: 'Buy BTC low', icon: '₿', isNew: false, product: 'Dual Investment / Fixed', apr: '2.05%~116.67%' },
    { coin: 'BTC', icon: '₿', isNew: false, product: 'Simple Earn / Flexible', apr: '10.00%' },
    { coin: 'BGUSD', icon: '$', isNew: true, product: 'On-chain Elite / Flexible', apr: '4.00%' },
    { coin: 'BGBTC', icon: '₿', isNew: false, product: 'On-chain Elite / Flexible', apr: '1.00%' },
  ];

  return (
    <DashboardLayout>
      <div className="min-h-screen flex">
        {/* Left Sidebar */}
        <div className="w-[200px] border-r border-[#2B2F36] flex-shrink-0">
          <div className="sticky top-0 py-4">
            {/* Assets Header */}
            <div className="flex items-center gap-2 px-4 py-3 text-white font-medium">
              <Wallet className="w-5 h-5" />
              <span>Assets</span>
            </div>

            {/* Sidebar Menu */}
            <nav className="mt-2">
              {sidebarMenu.map((section) => (
                <div key={section.id}>
                  {/* Section Header */}
                  <button
                    onClick={() => section.expandable && toggleSection(section.id)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-[#9CA3AF] hover:text-white hover:bg-[#1B1B1D] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <section.icon className="w-4 h-4" />
                      <span className="text-sm">{section.label}</span>
                    </div>
                    {section.expandable && section.items.length > 0 && (
                      expandedSections[section.id] ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )
                    )}
                  </button>

                  {/* Section Items */}
                  {section.expandable && expandedSections[section.id] && section.items.length > 0 && (
                    <div className="ml-4">
                      {section.items.map((item) => (
                        <button
                          key={item.path}
                          onClick={() => navigate(item.path)}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                            location.pathname === item.path
                              ? 'text-[#FCD535]'
                              : 'text-[#9CA3AF] hover:text-white'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6 space-y-6">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div>
              <h1 className="text-3xl font-semibold text-white mb-4">
                Deposit to CIRCL from another<br />
                crypto wallet or platform
              </h1>
              <button
                onClick={() => navigate('/deposit')}
                className="px-6 py-2.5 bg-transparent border border-[#2B2F36] hover:border-[#3A3E45] text-white rounded-lg font-medium transition-colors"
              >
                Deposit now
              </button>
            </div>
            {/* Illustration placeholder - 3D crypto visual */}
            <div className="w-64 h-48 relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  {/* Wallet illustration */}
                  <div className="w-32 h-24 bg-gradient-to-br from-[#252629] to-[#2B2F36] rounded-xl border border-[#3A3E45] shadow-xl flex items-center justify-center">
                    <Wallet className="w-12 h-12 text-[#FCD535]" />
                  </div>
                  {/* Floating coins */}
                  <div className="absolute -top-4 -right-4 w-10 h-10 bg-[#F7931A] rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                    ₿
                  </div>
                  <div className="absolute -bottom-2 -left-6 w-8 h-8 bg-[#627EEA] rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                    Ξ
                  </div>
                  <div className="absolute top-0 -left-8 w-6 h-6 bg-[#FCD535] rounded-full flex items-center justify-center text-[#151517] font-bold text-xs shadow-lg">
                    $
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Promo Cards */}
          <div className="grid grid-cols-2 gap-4">
            {/* Crypto Loans Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-5 hover:border-[#3A3E45] transition-colors cursor-pointer"
              onClick={() => navigate('/loans')}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-white font-semibold mb-1">Flexible loans, seamless trading</h3>
                  <p className="text-[#9CA3AF] text-sm mb-3">VIP only: Up to 20% off interest rates</p>
                  <span className="text-[#6B7280] text-xs">Crypto Loans</span>
                </div>
                <div className="w-12 h-12 bg-[#252629] rounded-lg flex items-center justify-center">
                  <Percent className="w-6 h-6 text-[#FCD535]" />
                </div>
              </div>
            </motion.div>

            {/* Savings Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-5 hover:border-[#3A3E45] transition-colors cursor-pointer"
              onClick={() => navigate('/earn')}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-white font-semibold mb-1">Guaranteed returns, flexible access</h3>
                  <p className="text-[#9CA3AF] text-sm mb-3">Earn steady returns on your deposits</p>
                  <span className="text-[#6B7280] text-xs">Savings</span>
                </div>
                <div className="w-12 h-12 bg-[#252629] rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-[#FCD535]" />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Recommended Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2B2F36]">
              <h3 className="text-white font-semibold">Recommended</h3>
              <button className="text-[#9CA3AF] hover:text-white transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-4 gap-4 px-6 py-3 text-sm text-[#6B7280]">
              <div>Coin</div>
              <div>Product</div>
              <div>Est. APR</div>
              <div className="text-right">Action</div>
            </div>

            {/* Table Body */}
            {recommendedProducts.map((product, index) => (
              <div
                key={index}
                className="grid grid-cols-4 gap-4 px-6 py-4 border-t border-[#2B2F36] hover:bg-[#252629] transition-colors items-center"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                    product.coin.includes('BTC') ? 'bg-[#F7931A]' :
                    product.coin.includes('USD') ? 'bg-[#26A17B]' :
                    'bg-[#2B2F36]'
                  }`}>
                    {product.icon}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{product.coin}</span>
                    {product.isNew && (
                      <span className="px-1.5 py-0.5 bg-[#FCD535]/20 text-[#FCD535] text-[10px] font-medium rounded">
                        New
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-[#9CA3AF]">{product.product}</div>
                <div className="text-white font-medium">
                  {product.apr} <span className="text-[#6B7280] text-xs">APR</span>
                </div>
                <div className="text-right">
                  <button className="text-[#FCD535] hover:text-[#FFE066] text-sm font-medium transition-colors">
                    Subscribe
                  </button>
                </div>
              </div>
            ))}
          </motion.div>

          {/* Security Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-6"
          >
            <h3 className="text-white font-semibold mb-6">Your funds are secure with us</h3>

            <div className="grid grid-cols-2 gap-8">
              {/* Protection Fund */}
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-white font-semibold mb-1">$400 million Protection Fund</h4>
                  <p className="text-[#9CA3AF] text-sm mb-2">Your security, our priority</p>
                  <button className="text-[#FCD535] hover:text-[#FFE066] text-sm font-medium transition-colors flex items-center gap-1">
                    View more <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="w-16 h-16 flex items-center justify-center">
                  <Shield className="w-10 h-10 text-[#6B7280]" />
                </div>
              </div>

              {/* Proof of Reserves */}
              <div className="flex items-start justify-between border-l border-[#2B2F36] pl-8">
                <div>
                  <h4 className="text-white font-semibold mb-1">Proof of Reserves</h4>
                  <p className="text-[#9CA3AF] text-sm mb-2">1:1 reserve of all users' funds on our platform</p>
                  <button className="text-[#FCD535] hover:text-[#FFE066] text-sm font-medium transition-colors flex items-center gap-1">
                    View my audit <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="w-16 h-16 flex items-center justify-center">
                  <Eye className="w-10 h-10 text-[#6B7280]" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
