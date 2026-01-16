/**
 * Subscriptions & Pricing Page
 *
 * Display subscription tiers and manage user subscription
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { buildApiUrl } from '../hooks/useApi';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Skeleton, ProgressBar } from '../components/ui/skeleton';
import {
  Check,
  Sparkles,
  Crown,
  Zap,
  BarChart3,
  CreditCard,
  ExternalLink,
} from 'lucide-react';

// Types
interface Subscription {
  tier: 'free' | 'pro' | 'elite';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
}

interface Usage {
  trades_this_month: number;
  voice_minutes_used: number;
  storage_used_mb: number;
}

interface TierLimits {
  max_trades: number | null;
  max_voice_minutes: number | null;
  max_storage_mb: number | null;
}

const TIERS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'Perfect for getting started',
    icon: Zap,
    color: 'text-zinc-400',
    bgColor: 'bg-zinc-500/10',
    borderColor: 'border-zinc-500/20',
    features: [
      { text: '50 trades/month', included: true },
      { text: '10 min voice notes', included: true },
      { text: '100MB storage', included: true },
      { text: '1 exchange connection', included: true },
      { text: '15 basic reports', included: true },
      { text: 'AI Clone', included: false },
      { text: 'Auto-trading', included: false },
      { text: 'Priority support', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29,
    description: 'For serious traders',
    icon: Sparkles,
    color: 'text-primary-400',
    bgColor: 'bg-primary-500/10',
    borderColor: 'border-primary-500/30',
    popular: true,
    features: [
      { text: 'Unlimited trades', included: true },
      { text: 'Unlimited voice notes', included: true },
      { text: '10GB storage', included: true },
      { text: 'All exchanges', included: true },
      { text: '50+ advanced reports', included: true },
      { text: 'AI Clone (Suggest)', included: true },
      { text: 'Auto-trading', included: false },
      { text: 'Priority support', included: false },
    ],
  },
  {
    id: 'elite',
    name: 'Elite',
    price: 99,
    description: 'Maximum trading power',
    icon: Crown,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    features: [
      { text: 'Unlimited trades', included: true },
      { text: 'Unlimited voice notes', included: true },
      { text: 'Unlimited storage', included: true },
      { text: 'All exchanges + Priority', included: true },
      { text: '75+ AI-powered reports', included: true },
      { text: 'AI Clone (Full Auto)', included: true },
      { text: 'Auto-trading enabled', included: true },
      { text: '1:1 Priority support', included: true },
    ],
  },
];

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [limits, setLimits] = useState<TierLimits | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  // Helper to get auth token
  const getToken = useCallback(async () => {
    if (!user) return null;
    return await user.getIdToken();
  }, [user]);

  // Fetch subscription data
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);

      try {
        const token = await getToken();
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        };

        // Fetch current subscription
        const subRes = await fetch(buildApiUrl('/api/subscriptions/current'), { headers });
        if (subRes.ok) {
          const subData = await subRes.json();
          setSubscription(subData.subscription);
        }

        // Fetch usage
        const usageRes = await fetch(buildApiUrl('/api/subscriptions/usage'), { headers });
        if (usageRes.ok) {
          const usageData = await usageRes.json();
          setUsage(usageData.usage);
          setLimits(usageData.limits);
        }
      } catch (error) {
        console.error('Error fetching subscription data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, getToken]);

  // Handle checkout
  const handleCheckout = async (tier: string) => {
    if (!user) return;
    setCheckoutLoading(tier);

    try {
      const token = await getToken();
      const res = await fetch(buildApiUrl('/api/subscriptions/checkout'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tier,
          success_url: `${window.location.origin}/settings?subscription=success`,
          cancel_url: `${window.location.origin}/subscriptions?canceled=true`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.checkout_url) {
          window.location.href = data.checkout_url;
        }
      }
    } catch (error) {
      console.error('Checkout failed:', error);
    } finally {
      setCheckoutLoading(null);
    }
  };

  // Handle portal access
  const handlePortalAccess = async () => {
    if (!user) return;

    try {
      const token = await getToken();
      const res = await fetch(buildApiUrl('/api/subscriptions/portal'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          return_url: `${window.location.origin}/subscriptions`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.portal_url) {
          window.location.href = data.portal_url;
        }
      }
    } catch (error) {
      console.error('Portal access failed:', error);
    }
  };

  const currentTier = subscription?.tier || 'free';
  const currentTierIndex = TIERS.findIndex(t => t.id === currentTier);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 p-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-96" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2">Choose Your Plan</h1>
          <p className="text-zinc-400">
            Unlock advanced features and take your trading to the next level
          </p>
        </div>

        {/* Current Usage (for paid users) */}
        {currentTier !== 'free' && usage && limits && (
          <Card variant="glass" className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary-500" />
                Current Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Trades */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-zinc-400">Trades this month</span>
                    <span className="text-white">
                      {usage.trades_this_month} / {limits.max_trades || '∞'}
                    </span>
                  </div>
                  <ProgressBar
                    value={limits.max_trades ? (usage.trades_this_month / limits.max_trades) * 100 : 0}
                  />
                </div>

                {/* Voice Minutes */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-zinc-400">Voice minutes</span>
                    <span className="text-white">
                      {usage.voice_minutes_used} / {limits.max_voice_minutes || '∞'} min
                    </span>
                  </div>
                  <ProgressBar
                    value={limits.max_voice_minutes ? (usage.voice_minutes_used / limits.max_voice_minutes) * 100 : 0}
                  />
                </div>

                {/* Storage */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-zinc-400">Storage used</span>
                    <span className="text-white">
                      {usage.storage_used_mb.toFixed(1)} / {limits.max_storage_mb || '∞'} MB
                    </span>
                  </div>
                  <ProgressBar
                    value={limits.max_storage_mb ? (usage.storage_used_mb / limits.max_storage_mb) * 100 : 0}
                  />
                </div>
              </div>

              {subscription?.stripe_subscription_id && (
                <Button
                  variant="outline"
                  className="mt-4 w-full"
                  onClick={handlePortalAccess}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Manage Billing
                  <ExternalLink className="h-3 w-3 ml-2" />
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Pricing Tiers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {TIERS.map((tier, index) => {
            const Icon = tier.icon;
            const isCurrent = tier.id === currentTier;
            const isUpgrade = index > currentTierIndex;
            const isDowngrade = index < currentTierIndex;

            return (
              <Card
                key={tier.id}
                variant="glass"
                className={`relative overflow-hidden ${
                  tier.popular ? `border-2 ${tier.borderColor}` : ''
                }`}
              >
                {tier.popular && (
                  <div className="absolute top-0 right-0 bg-primary-500 text-white text-xs font-medium px-3 py-1 rounded-bl-lg">
                    Most Popular
                  </div>
                )}

                <CardContent className="p-6">
                  {/* Tier Header */}
                  <div className="text-center mb-6">
                    <div className={`inline-flex p-3 rounded-xl ${tier.bgColor} mb-4`}>
                      <Icon className={`h-8 w-8 ${tier.color}`} />
                    </div>
                    <h3 className="text-xl font-bold text-white">{tier.name}</h3>
                    <p className="text-sm text-zinc-400 mt-1">{tier.description}</p>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-white">${tier.price}</span>
                      <span className="text-zinc-400">/month</span>
                    </div>
                  </div>

                  {/* Features List */}
                  <ul className="space-y-3 mb-6">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2">
                        {feature.included ? (
                          <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <div className="h-4 w-4 rounded-full bg-zinc-700 flex-shrink-0" />
                        )}
                        <span className={feature.included ? 'text-zinc-300' : 'text-zinc-500'}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Action Button */}
                  {isCurrent ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : isUpgrade ? (
                    <Button
                      variant={tier.popular ? 'default' : 'outline'}
                      className="w-full"
                      onClick={() => handleCheckout(tier.id)}
                      loading={checkoutLoading === tier.id}
                    >
                      Upgrade to {tier.name}
                    </Button>
                  ) : isDowngrade ? (
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={handlePortalAccess}
                    >
                      Manage Plan
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      className="w-full"
                      onClick={() => handleCheckout(tier.id)}
                      loading={checkoutLoading === tier.id}
                    >
                      Get Started
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Feature Comparison */}
        <Card variant="glass" className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Feature Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2B2F36]">
                    <th className="text-left py-3 text-zinc-400 font-medium">Feature</th>
                    <th className="text-center py-3 text-zinc-400 font-medium">Free</th>
                    <th className="text-center py-3 text-primary-400 font-medium">Pro</th>
                    <th className="text-center py-3 text-yellow-400 font-medium">Elite</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  <FeatureRow label="Monthly Trades" free="50" pro="Unlimited" elite="Unlimited" />
                  <FeatureRow label="Voice Minutes" free="10 min" pro="Unlimited" elite="Unlimited" />
                  <FeatureRow label="Storage" free="100 MB" pro="10 GB" elite="Unlimited" />
                  <FeatureRow label="Exchanges" free="1" pro="All" elite="All + Priority" />
                  <FeatureRow label="Reports" free="15 Basic" pro="50+ Advanced" elite="75+ AI-Powered" />
                  <FeatureRow label="Trade Replay" free="Basic" pro="Multi-TF" elite="Multi-TF + AI" />
                  <FeatureRow label="AI Clone" free={false} pro="Suggest" elite="Full Auto" />
                  <FeatureRow label="Auto-Trading" free={false} pro={false} elite={true} />
                  <FeatureRow label="Priority Support" free={false} pro={false} elite={true} />
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* FAQ / Info */}
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-zinc-400 text-sm">
            All plans include a 7-day free trial. Cancel anytime.
            <br />
            Questions? Contact us at support@bitnine.app
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Helper component for feature rows
function FeatureRow({
  label,
  free,
  pro,
  elite,
}: {
  label: string;
  free: string | boolean;
  pro: string | boolean;
  elite: string | boolean;
}) {
  const renderValue = (value: string | boolean) => {
    if (value === true) {
      return <Check className="h-4 w-4 text-emerald-400 mx-auto" />;
    }
    if (value === false) {
      return <div className="h-4 w-4 rounded-full bg-zinc-700 mx-auto" />;
    }
    return <span className="text-zinc-300">{value}</span>;
  };

  return (
    <tr className="border-b border-white/5">
      <td className="py-3 text-zinc-300">{label}</td>
      <td className="py-3 text-center">{renderValue(free)}</td>
      <td className="py-3 text-center">{renderValue(pro)}</td>
      <td className="py-3 text-center">{renderValue(elite)}</td>
    </tr>
  );
}











