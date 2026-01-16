/**
 * useLighterOrders Hook
 *
 * Manage Lighter DEX orders with real-time WebSocket updates.
 *
 * Features:
 * - Fetch open orders
 * - Place new orders
 * - Cancel orders (single and all)
 * - WebSocket subscription for order status updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { lighterWebSocket } from '../services/lighterWebSocket';
import { logger } from '@/react-app/utils/logger';
import { useAuth } from '../contexts/AuthContext';

export interface LighterOrder {
  id: string;
  clientOrderId?: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  status: 'pending' | 'open' | 'partially_filled' | 'filled' | 'cancelled' | 'rejected';
  price: number;
  quantity: number;
  filledQuantity: number;
  averagePrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  timeInForce: 'gtc' | 'ioc' | 'fok' | 'post_only';
  leverage?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlaceOrderParams {
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  quantity: number;
  price?: number;
  stopPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  leverage?: number;
  timeInForce?: 'gtc' | 'ioc' | 'fok' | 'post_only';
  reduceOnly?: boolean;
  clientOrderId?: string;
}

interface UseLighterOrdersResult {
  orders: LighterOrder[];
  isLoading: boolean;
  error: string | null;
  placeOrder: (params: PlaceOrderParams) => Promise<LighterOrder>;
  cancelOrder: (orderId: string, symbol?: string) => Promise<void>;
  cancelAllOrders: (symbol?: string) => Promise<void>;
  refetch: () => Promise<void>;
}

interface OrderUpdate {
  type: 'order_update';
  order: {
    order_id: string;
    client_order_id?: string;
    market: string;
    side: 'buy' | 'sell';
    order_type: 'market' | 'limit' | 'stop_market' | 'stop_limit';
    status: string;
    price: string;
    size: string;
    filled_size: string;
    avg_fill_price: string;
    time_in_force: string;
    leverage: string;
    created_at: number;
    updated_at: number;
  };
}

const API_BASE = import.meta.env.VITE_API_URL || '';

export function useLighterOrders(symbol?: string): UseLighterOrdersResult {
  const [orders, setOrders] = useState<LighterOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = await user?.getIdToken();
      const url = symbol
        ? `${API_BASE}/api/lighter/orders?symbol=${symbol}`
        : `${API_BASE}/api/lighter/orders`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Account not connected
          setOrders([]);
          return;
        }
        throw new Error(`Failed to fetch orders: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.orders) {
        const mappedOrders: LighterOrder[] = data.orders.map((o: LighterOrder) => ({
          ...o,
          createdAt: new Date(o.createdAt),
          updatedAt: new Date(o.updatedAt)
        }));
        setOrders(mappedOrders);
      }
    } catch (err) {
      logger.error('Error fetching Lighter orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setIsLoading(false);
    }
  }, [user, symbol]);

  const placeOrder = useCallback(
    async (params: PlaceOrderParams): Promise<LighterOrder> => {
      const token = await user?.getIdToken();
      const response = await fetch(`${API_BASE}/api/lighter/place-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          symbol: params.symbol,
          side: params.side,
          type: params.type,
          quantity: params.quantity,
          price: params.price,
          stop_price: params.stopPrice,
          stop_loss: params.stopLoss,
          take_profit: params.takeProfit,
          leverage: params.leverage || 1,
          time_in_force: params.timeInForce || 'gtc',
          reduce_only: params.reduceOnly || false,
          client_order_id: params.clientOrderId
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to place order');
      }

      // Refetch orders after placing
      await fetchOrders();

      return {
        ...data.order,
        createdAt: new Date(data.order.createdAt),
        updatedAt: new Date(data.order.updatedAt)
      };
    },
    [user, fetchOrders]
  );

  const cancelOrder = useCallback(
    async (orderId: string, orderSymbol?: string): Promise<void> => {
      const token = await user?.getIdToken();
      const response = await fetch(`${API_BASE}/api/lighter/cancel-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          order_id: orderId,
          symbol: orderSymbol
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to cancel order');
      }

      // Remove from local state
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    },
    [user]
  );

  const cancelAllOrders = useCallback(
    async (cancelSymbol?: string): Promise<void> => {
      const token = await user?.getIdToken();
      const response = await fetch(`${API_BASE}/api/lighter/cancel-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          symbol: cancelSymbol
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to cancel all orders');
      }

      // Clear local state (or filter by symbol)
      if (cancelSymbol) {
        setOrders((prev) => prev.filter((o) => o.symbol !== cancelSymbol));
      } else {
        setOrders([]);
      }
    },
    [user]
  );

  const handleOrderUpdate = useCallback((data: unknown) => {
    const update = data as OrderUpdate;

    if (update.type !== 'order_update') return;

    const order = update.order;
    const mappedStatus = mapOrderStatus(order.status);

    setOrders((prev) => {
      const existingIndex = prev.findIndex((o) => o.id === order.order_id);

      // If order is filled or cancelled, remove it from open orders
      if (mappedStatus === 'filled' || mappedStatus === 'cancelled') {
        return prev.filter((o) => o.id !== order.order_id);
      }

      const newOrder: LighterOrder = {
        id: order.order_id,
        clientOrderId: order.client_order_id,
        symbol: order.market,
        side: order.side,
        type: mapOrderType(order.order_type),
        status: mappedStatus,
        price: parseFloat(order.price),
        quantity: parseFloat(order.size),
        filledQuantity: parseFloat(order.filled_size),
        averagePrice: parseFloat(order.avg_fill_price) || undefined,
        timeInForce: order.time_in_force.toLowerCase() as LighterOrder['timeInForce'],
        leverage: parseFloat(order.leverage) || undefined,
        createdAt: new Date(order.created_at),
        updatedAt: new Date(order.updated_at)
      };

      if (existingIndex !== -1) {
        const updated = [...prev];
        updated[existingIndex] = newOrder;
        return updated;
      } else {
        return [...prev, newOrder];
      }
    });
  }, []);

  useEffect(() => {
    fetchOrders();

    // Subscribe to order updates
    lighterWebSocket
      .subscribeOrders(handleOrderUpdate)
      .then((unsubscribe) => {
        unsubscribeRef.current = unsubscribe;
      })
      .catch((err) => {
        logger.error('Error subscribing to orders:', err);
      });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [fetchOrders, handleOrderUpdate]);

  return {
    orders,
    isLoading,
    error,
    placeOrder,
    cancelOrder,
    cancelAllOrders,
    refetch: fetchOrders
  };
}

function mapOrderStatus(status: string): LighterOrder['status'] {
  const mapping: Record<string, LighterOrder['status']> = {
    new: 'open',
    open: 'open',
    partially_filled: 'partially_filled',
    filled: 'filled',
    cancelled: 'cancelled',
    rejected: 'rejected',
    pending: 'pending',
    expired: 'cancelled'
  };
  return mapping[status.toLowerCase()] || 'pending';
}

function mapOrderType(type: string): LighterOrder['type'] {
  const mapping: Record<string, LighterOrder['type']> = {
    market: 'market',
    limit: 'limit',
    stop_market: 'stop',
    stop_limit: 'stop_limit'
  };
  return mapping[type] || 'market';
}
