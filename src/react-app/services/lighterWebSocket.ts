/**
 * Lighter DEX WebSocket Service
 *
 * Centralized WebSocket manager for Lighter DEX real-time data.
 * Handles:
 * - Single connection with channel multiplexing
 * - Orderbook updates
 * - Position updates
 * - Order status updates
 * - Auto-reconnect with exponential backoff
 *
 * WebSocket URL: wss://mainnet.zklighter.elliot.ai/ws
 */

type MessageHandler = (data: unknown) => void;

interface Subscription {
  channel: string;
  symbol?: string;
  handlers: Set<MessageHandler>;
}

interface LighterWebSocketMessage {
  type: string;
  channel?: string;
  symbol?: string;
  data?: unknown;
  success?: boolean;
  error?: string;
}

const WS_URL = 'wss://mainnet.zklighter.elliot.ai/ws';
const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000];
const MAX_RECONNECT_ATTEMPTS = 5;
const PING_INTERVAL = 30000;
const CONNECTION_TIMEOUT = 10000; // 10 second connection timeout

class LighterWebSocketService {
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, Subscription> = new Map();
  private reconnectAttempt = 0;
  private reconnectTimer: number | null = null;
  private pingTimer: number | null = null;
  private connectionTimeoutTimer: number | null = null;
  private isConnecting = false;
  private connectionPromise: Promise<void> | null = null;
  private connectionFailed = false;
  private errorCallbacks: Set<(error: string) => void> = new Set();

  /**
   * Get subscription key for a channel/symbol combination
   */
  private getSubscriptionKey(channel: string, symbol?: string): string {
    return symbol ? `${channel}:${symbol}` : channel;
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    // If connection has permanently failed, don't retry
    if (this.connectionFailed) {
      console.log('[LighterWS] Connection previously failed, using fallback mode');
      return Promise.resolve();
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    if (this.isConnecting && this.connectionPromise) {
      return this.connectionPromise;
    }

    this.isConnecting = true;
    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        console.log('[LighterWS] Connecting to', WS_URL);
        this.ws = new WebSocket(WS_URL);

        // Set connection timeout
        this.connectionTimeoutTimer = window.setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            console.error('[LighterWS] Connection timeout after', CONNECTION_TIMEOUT, 'ms');
            this.ws?.close();
            this.isConnecting = false;
            this.notifyError('Connection timeout - server may be unreachable');
            reject(new Error('Connection timeout'));
          }
        }, CONNECTION_TIMEOUT);

        this.ws.onopen = () => {
          console.log('[LighterWS] Connected');
          this.clearConnectionTimeout();
          this.isConnecting = false;
          this.reconnectAttempt = 0;
          this.connectionFailed = false;

          // Start ping interval
          this.startPing();

          // Resubscribe to all channels
          this.resubscribeAll();

          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: LighterWebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (err) {
            console.error('[LighterWS] Error parsing message:', err);
          }
        };

        this.ws.onerror = (err) => {
          console.error('[LighterWS] Error:', err);
          this.clearConnectionTimeout();
          this.isConnecting = false;
          this.notifyError('WebSocket connection error');
          reject(err);
        };

        this.ws.onclose = () => {
          console.log('[LighterWS] Disconnected');
          this.clearConnectionTimeout();
          this.isConnecting = false;
          this.stopPing();
          this.scheduleReconnect();
        };
      } catch (err) {
        this.clearConnectionTimeout();
        this.isConnecting = false;
        reject(err);
      }
    });

    return this.connectionPromise;
  }

  /**
   * Clear connection timeout timer
   */
  private clearConnectionTimeout(): void {
    if (this.connectionTimeoutTimer) {
      clearTimeout(this.connectionTimeoutTimer);
      this.connectionTimeoutTimer = null;
    }
  }

  /**
   * Notify error callbacks
   */
  private notifyError(message: string): void {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(message);
      } catch (err) {
        console.error('[LighterWS] Error callback failed:', err);
      }
    });
  }

  /**
   * Register error callback
   */
  onError(callback: (error: string) => void): () => void {
    this.errorCallbacks.add(callback);
    return () => {
      this.errorCallbacks.delete(callback);
    };
  }

  /**
   * Check if connection has failed permanently
   */
  hasConnectionFailed(): boolean {
    return this.connectionFailed;
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopPing();
    this.reconnectAttempt = MAX_RECONNECT_ATTEMPTS; // Prevent reconnection

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.subscriptions.clear();
  }

  /**
   * Subscribe to a channel
   */
  async subscribe(
    channel: string,
    handler: MessageHandler,
    symbol?: string
  ): Promise<() => void> {
    await this.connect();

    const key = this.getSubscriptionKey(channel, symbol);
    let subscription = this.subscriptions.get(key);

    if (!subscription) {
      subscription = {
        channel,
        symbol,
        handlers: new Set()
      };
      this.subscriptions.set(key, subscription);

      // Send subscribe message
      this.sendSubscribe(channel, symbol);
    }

    subscription.handlers.add(handler);

    // Return unsubscribe function
    return () => {
      this.unsubscribe(channel, handler, symbol);
    };
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(channel: string, handler: MessageHandler, symbol?: string): void {
    const key = this.getSubscriptionKey(channel, symbol);
    const subscription = this.subscriptions.get(key);

    if (!subscription) return;

    subscription.handlers.delete(handler);

    // If no more handlers, fully unsubscribe
    if (subscription.handlers.size === 0) {
      this.subscriptions.delete(key);
      this.sendUnsubscribe(channel, symbol);
    }
  }

  /**
   * Subscribe to orderbook updates
   */
  async subscribeOrderbook(
    symbol: string,
    handler: MessageHandler
  ): Promise<() => void> {
    return this.subscribe('orderbook', handler, symbol);
  }

  /**
   * Subscribe to position updates (requires auth)
   */
  async subscribePositions(handler: MessageHandler): Promise<() => void> {
    return this.subscribe('positions', handler);
  }

  /**
   * Subscribe to order updates (requires auth)
   */
  async subscribeOrders(handler: MessageHandler): Promise<() => void> {
    return this.subscribe('orders', handler);
  }

  /**
   * Subscribe to trade updates
   */
  async subscribeTrades(
    symbol: string,
    handler: MessageHandler
  ): Promise<() => void> {
    return this.subscribe('trades', handler, symbol);
  }

  /**
   * Subscribe to ticker updates
   */
  async subscribeTicker(
    symbol: string,
    handler: MessageHandler
  ): Promise<() => void> {
    return this.subscribe('ticker', handler, symbol);
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(message: LighterWebSocketMessage): void {
    // Handle pong
    if (message.type === 'pong') {
      return;
    }

    // Handle subscription confirmation
    if (message.type === 'subscribed' || message.type === 'unsubscribed') {
      console.log(`[LighterWS] ${message.type}:`, message.channel, message.symbol);
      return;
    }

    // Handle errors
    if (message.type === 'error') {
      console.error('[LighterWS] Server error:', message.error);
      return;
    }

    // Route message to subscribers
    if (message.channel) {
      const key = this.getSubscriptionKey(message.channel, message.symbol);
      const subscription = this.subscriptions.get(key);

      if (subscription) {
        subscription.handlers.forEach((handler) => {
          try {
            handler(message.data);
          } catch (err) {
            console.error('[LighterWS] Handler error:', err);
          }
        });
      }
    }
  }

  /**
   * Send subscribe message
   */
  private sendSubscribe(channel: string, symbol?: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message: Record<string, string> = {
      type: 'subscribe',
      channel
    };
    if (symbol) {
      message.symbol = symbol;
    }

    this.ws.send(JSON.stringify(message));
    console.log('[LighterWS] Subscribed to:', channel, symbol || '');
  }

  /**
   * Send unsubscribe message
   */
  private sendUnsubscribe(channel: string, symbol?: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message: Record<string, string> = {
      type: 'unsubscribe',
      channel
    };
    if (symbol) {
      message.symbol = symbol;
    }

    this.ws.send(JSON.stringify(message));
    console.log('[LighterWS] Unsubscribed from:', channel, symbol || '');
  }

  /**
   * Resubscribe to all channels after reconnection
   */
  private resubscribeAll(): void {
    this.subscriptions.forEach((subscription) => {
      this.sendSubscribe(subscription.channel, subscription.symbol);
    });
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
      console.error('[LighterWS] Max reconnect attempts reached, switching to fallback mode');
      this.connectionFailed = true;
      this.notifyError('WebSocket connection failed - using limited connectivity mode');
      return;
    }

    const delay =
      RECONNECT_DELAYS[this.reconnectAttempt] ||
      RECONNECT_DELAYS[RECONNECT_DELAYS.length - 1];

    console.log(`[LighterWS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempt + 1}/${MAX_RECONNECT_ATTEMPTS})`);

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectAttempt++;
      this.connect().catch((err) => {
        console.error('[LighterWS] Reconnect failed:', err);
      });
    }, delay);
  }

  /**
   * Reset connection failure state to allow retry
   */
  resetConnectionFailure(): void {
    this.connectionFailed = false;
    this.reconnectAttempt = 0;
  }

  /**
   * Start ping interval to keep connection alive
   */
  private startPing(): void {
    this.stopPing();
    this.pingTimer = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, PING_INTERVAL);
  }

  /**
   * Stop ping interval
   */
  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get number of active subscriptions
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }
}

// Export singleton instance
export const lighterWebSocket = new LighterWebSocketService();

// Export types
export type { MessageHandler, LighterWebSocketMessage };
