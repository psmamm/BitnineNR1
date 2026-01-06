import { CreditCard, Star, Zap, TrendingUp, AlertCircle } from "lucide-react";
import { motion } from 'framer-motion';

interface SubscriptionData {
  plan: string;
  price: number;
  nextBilling: string;
  usage: {
    trades: { current: number; limit: number | null };
    apiCalls: { current: number; limit: number };
  };
}

interface SubscriptionSectionProps {
  subscription?: SubscriptionData;
  onUpgrade?: () => void;
  onManageBilling?: () => void;
}

const defaultSubscription: SubscriptionData = {
  plan: 'Pro Plan',
  price: 29,
  nextBilling: 'October 3, 2024',
  usage: {
    trades: { current: 48, limit: null },
    apiCalls: { current: 1200, limit: 10000 }
  }
};

export default function SubscriptionSection({ 
  subscription = defaultSubscription, 
  onUpgrade,
  onManageBilling 
}: SubscriptionSectionProps) {
  const isBasicPlan = subscription.plan.toLowerCase().includes('basic');
  const tradeUsagePercent = subscription.usage.trades.limit 
    ? (subscription.usage.trades.current / subscription.usage.trades.limit) * 100 
    : 30;
  const apiUsagePercent = (subscription.usage.apiCalls.current / subscription.usage.apiCalls.limit) * 100;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-[#1E2232] rounded-xl p-6 border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
    >
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-[#6A3DF4]/10 p-2 rounded-xl">
          <CreditCard className="w-6 h-6 text-[#BDC3C7]" />
        </div>
        <h3 className="text-xl font-semibold text-white">Subscription</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Plan */}
        <div>
          <h4 className="text-white font-medium mb-2">Current Plan</h4>
          <div className={`border rounded-xl p-4 ${
            isBasicPlan 
              ? 'bg-[#F39C12]/10 border-[#F39C12]/20' 
              : 'bg-[#6A3DF4]/10 border-[#6A3DF4]/20'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className={`font-semibold ${
                  isBasicPlan ? 'text-[#F39C12]' : 'text-[#6A3DF4]'
                }`}>
                  {subscription.plan}
                </span>
                {!isBasicPlan && <Star className="w-4 h-4 text-[#F39C12]" />}
              </div>
              <span className="text-white font-bold">
                ${subscription.price}/{subscription.price === 0 ? 'free' : 'month'}
              </span>
            </div>
            <p className="text-[#AAB0C0] text-sm">
              {isBasicPlan 
                ? 'Limited features and usage' 
                : `Next billing: ${subscription.nextBilling}`
              }
            </p>
            
            {isBasicPlan && (
              <div className="mt-3 flex items-center space-x-2 text-[#F39C12] text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>Upgrade for unlimited features</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Usage Statistics */}
        <div>
          <h4 className="text-white font-medium mb-2">Usage This Month</h4>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#AAB0C0]">Trades</span>
                <span className="text-white">
                  {subscription.usage.trades.current} / {
                    subscription.usage.trades.limit ? subscription.usage.trades.limit : 'Unlimited'
                  }
                </span>
              </div>
              <div className="w-full bg-[#0D0F18]/50 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    tradeUsagePercent > 80 ? 'bg-[#E74C3C]' : 
                    tradeUsagePercent > 60 ? 'bg-[#F39C12]' : 'bg-[#6A3DF4]'
                  }`}
                  style={{ width: `${Math.min(tradeUsagePercent, 100)}%` }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#AAB0C0]">API Calls</span>
                <span className="text-white">
                  {subscription.usage.apiCalls.current.toLocaleString()} / {subscription.usage.apiCalls.limit.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-[#0D0F18]/50 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    apiUsagePercent > 80 ? 'bg-[#E74C3C]' : 
                    apiUsagePercent > 60 ? 'bg-[#F39C12]' : 'bg-[#6A3DF4]'
                  }`}
                  style={{ width: `${Math.min(apiUsagePercent, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mt-6">
        {isBasicPlan ? (
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onUpgrade}
            className="bg-gradient-to-r from-[#6A3DF4] to-[#8A5CFF] hover:from-[#8A5CFF] hover:to-[#6A3DF4] text-white px-6 py-2 rounded-xl font-medium transition-all shadow-lg hover:shadow-[0_4px_20px_rgba(106,61,244,0.4)] flex items-center space-x-2"
          >
            <Zap className="w-4 h-4" />
            <span>Upgrade to Pro</span>
          </motion.button>
        ) : (
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onUpgrade}
            className="bg-[#6A3DF4] hover:bg-[#8A5CFF] text-white px-6 py-2 rounded-xl font-medium transition-all shadow-lg hover:shadow-[0_4px_20px_rgba(106,61,244,0.4)] flex items-center space-x-2"
          >
            <TrendingUp className="w-4 h-4" />
            <span>Upgrade Plan</span>
          </motion.button>
        )}
        
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onManageBilling}
          className="bg-[#0D0F18]/50 hover:bg-[#0D0F18]/70 text-white px-6 py-2 rounded-xl font-medium transition-all border border-white/10 hover:border-white/20"
        >
          Manage Billing
        </motion.button>
      </div>

      {/* Features Comparison */}
      {isBasicPlan && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-6 pt-6 border-t border-white/10"
        >
          <h5 className="text-white font-medium mb-3">Pro Plan Benefits</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center space-x-2 text-[#2ECC71]">
              <div className="w-1.5 h-1.5 bg-[#2ECC71] rounded-full"></div>
              <span>Unlimited trades</span>
            </div>
            <div className="flex items-center space-x-2 text-[#2ECC71]">
              <div className="w-1.5 h-1.5 bg-[#2ECC71] rounded-full"></div>
              <span>Advanced analytics</span>
            </div>
            <div className="flex items-center space-x-2 text-[#2ECC71]">
              <div className="w-1.5 h-1.5 bg-[#2ECC71] rounded-full"></div>
              <span>Real-time data feeds</span>
            </div>
            <div className="flex items-center space-x-2 text-[#2ECC71]">
              <div className="w-1.5 h-1.5 bg-[#2ECC71] rounded-full"></div>
              <span>Priority support</span>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
