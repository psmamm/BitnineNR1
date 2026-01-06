import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export interface Notification {
  id: number;
  type: 'trade' | 'performance' | 'strategy' | 'system' | 'market' | 'goal' | 'whale';
  title: string;
  message: string;
  time: string;
  read: boolean;
  data?: any;
  action?: {
    label: string;
    url: string;
  };
}

export interface WhaleTransaction {
  id: string;
  timestamp: Date;
  coin: string;
  amount: number;
  usdValue: number;
  transferType: 'wallet_to_exchange' | 'exchange_to_wallet' | 'whale_to_whale';
  hash: string;
  fromAddress?: string;
  toAddress?: string;
  blockchainExplorerUrl: string;
  chain: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [seenWhaleTransactions, setSeenWhaleTransactions] = useState<Set<string>>(new Set());

  // Monitor whale transactions and create notifications
  const checkWhaleTransactions = async () => {
    try {
      const response = await fetch('/api/whale-transactions');
      if (!response.ok) return;

      const data = await response.json();
      if (!data.transactions || !Array.isArray(data.transactions)) return;

      const whaleTransactions: WhaleTransaction[] = data.transactions.map((tx: any) => ({
        ...tx,
        timestamp: new Date(tx.timestamp)
      }));

      // Check for new whale transactions > $500K that haven't been seen
      const newLargeTransactions = whaleTransactions.filter(tx =>
        tx.usdValue >= 500000 && !seenWhaleTransactions.has(tx.id)
      );

      if (newLargeTransactions.length > 0) {
        // Mark these transactions as seen
        setSeenWhaleTransactions(prev => {
          const newSet = new Set(prev);
          newLargeTransactions.forEach(tx => newSet.add(tx.id));
          return newSet;
        });

        // Create notifications for large whale moves
        const newNotifications: Notification[] = newLargeTransactions.map(tx => {
          const formatUSD = (amount: number): string => {
            if (amount >= 1000000000) return '$' + (amount / 1000000000).toFixed(2) + 'B';
            if (amount >= 1000000) return '$' + (amount / 1000000).toFixed(2) + 'M';
            return '$' + amount.toLocaleString(undefined, { maximumFractionDigits: 0 });
          };

          const formatAmount = (amount: number): string => {
            if (amount >= 1000000) return (amount / 1000000).toFixed(2) + 'M';
            if (amount >= 1000) return (amount / 1000).toFixed(2) + 'K';
            return amount.toFixed(4);
          };

          const getTransferText = (transferType: string) => {
            switch (transferType) {
              case 'wallet_to_exchange':
                return 'moved to exchange';
              case 'exchange_to_wallet':
                return 'moved to wallet';
              default:
                return 'transferred';
            }
          };

          const formatTimeAgo = (timestamp: Date): string => {
            const now = new Date();
            const diffInSeconds = Math.floor((now.getTime() - timestamp.getTime()) / 1000);

            if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
            if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
            if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
            return `${Math.floor(diffInSeconds / 86400)}d ago`;
          };

          return {
            id: Date.now() + Math.random(),
            type: 'whale' as const,
            title: `🐋 Whale Alert: ${formatUSD(tx.usdValue)} ${tx.coin}`,
            message: `${formatAmount(tx.amount)} ${tx.coin} ${getTransferText(tx.transferType)} on ${tx.chain.toUpperCase()}`,
            time: formatTimeAgo(tx.timestamp),
            read: false,
            data: tx,
            action: {
              label: 'View Transaction',
              url: '/alpha-hub'
            }
          };
        });

        // Add new whale notifications to the top
        setNotifications(prev => [...newNotifications, ...prev]);
      }
    } catch (error) {
      console.error('Failed to check whale transactions:', error);
    }
  };

  // Generate realistic notifications based on time and trading activity
  useEffect(() => {
    if (user) {
      const generateNotifications = () => {
        const now = new Date();
        const notifications: Notification[] = [];

        // Market opening notifications
        const hour = now.getHours();
        if (hour === 9 && now.getMinutes() < 30) {
          notifications.push({
            id: Date.now() + 1,
            type: 'market',
            title: 'Market Opening',
            message: 'US markets are now open. Good luck with your trades today!',
            time: 'Just now',
            read: false,
            action: { label: 'View Markets', url: '/alpha-hub' }
          });
        }

        // Performance notifications (weekly)
        if (now.getDay() === 1 && hour === 8) { // Monday morning
          notifications.push({
            id: Date.now() + 2,
            type: 'performance',
            title: 'Weekly Performance Report',
            message: 'Your weekly trading summary is ready for review',
            time: '30 min ago',
            read: false,
            action: { label: 'View Report', url: '/reports' }
          });
        }

        // Goal achievement notifications
        notifications.push({
          id: Date.now() + 3,
          type: 'goal',
          title: 'Monthly Goal Progress',
          message: 'You\'re 75% towards your monthly profit target!',
          time: '2 hours ago',
          read: false,
          action: { label: 'View Progress', url: '/reports' }
        });

        // Strategy performance alerts
        notifications.push({
          id: Date.now() + 4,
          type: 'strategy',
          title: 'Strategy Alert',
          message: 'Momentum Breakout strategy has 85% win rate this week',
          time: '4 hours ago',
          read: false,
          action: { label: 'View Strategy', url: '/strategies' }
        });

        // Trading opportunities
        if (hour >= 9 && hour <= 16) { // Market hours
          notifications.push({
            id: Date.now() + 5,
            type: 'market',
            title: 'Trading Opportunity',
            message: 'AAPL showing strong momentum - matches your breakout strategy',
            time: '1 hour ago',
            read: false,
            action: { label: 'Add Trade', url: '/journal' }
          });
        }

        // System updates
        notifications.push({
          id: Date.now() + 6,
          type: 'system',
          title: 'Feature Update',
          message: 'New live P&L tracking now available for open positions',
          time: '1 day ago',
          read: true,
          action: { label: 'Learn More', url: '/journal' }
        });

        // Risk management alerts
        notifications.push({
          id: Date.now() + 7,
          type: 'trade',
          title: 'Risk Management',
          message: 'You have 3 open positions - consider position sizing',
          time: '6 hours ago',
          read: true,
          action: { label: 'View Positions', url: '/journal' }
        });

        return notifications;
      };

      setNotifications(generateNotifications());

      // Check for whale transactions immediately and then every 2 minutes
      checkWhaleTransactions();
      const whaleInterval = setInterval(checkWhaleTransactions, 2 * 60 * 1000);

      // Update notifications every 5 minutes
      const interval = setInterval(() => {
        setNotifications(generateNotifications());
      }, 5 * 60 * 1000);

      return () => {
        clearInterval(interval);
        clearInterval(whaleInterval);
      };
    }
  }, [user]);

  const markAsRead = (notificationId: number) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const deleteNotification = (notificationId: number) => {
    setNotifications(prev =>
      prev.filter(notification => notification.id !== notificationId)
    );
  };

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now(),
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    addNotification
  };
}
