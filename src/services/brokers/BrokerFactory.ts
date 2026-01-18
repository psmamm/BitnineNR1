/**
 * Broker Factory
 *
 * Factory for creating broker adapter instances.
 * Supports both crypto exchanges and traditional brokers.
 */

import { IBroker } from './IBroker';
import { BrokerMetadata, BrokerCredentials } from './types';
import { BinanceAdapter } from './adapters/BinanceAdapter';
import { BybitAdapter } from './adapters/BybitAdapter';
import { HyperliquidAdapter } from './adapters/HyperliquidAdapter';
import { InteractiveBrokersAdapter } from './adapters/InteractiveBrokersAdapter';
import { TDAmeritradeAdapter } from './adapters/TDAmeritradeAdapter';

// ============================================================================
// Broker Registry
// ============================================================================

type BrokerConstructor = new () => IBroker;

const brokerRegistry: Map<string, BrokerConstructor> = new Map([
  // Crypto Exchanges (CEX)
  ['binance', BinanceAdapter],
  ['bybit', BybitAdapter],

  // Crypto Exchanges (DEX)
  ['hyperliquid', HyperliquidAdapter],

  // Traditional Brokers
  ['interactive_brokers', InteractiveBrokersAdapter],
  ['td_ameritrade', TDAmeritradeAdapter],
]);

// Active broker instances cache
const activeInstances: Map<string, IBroker> = new Map();

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Get list of all supported brokers
 */
export function getSupportedBrokers(): BrokerMetadata[] {
  const brokers: BrokerMetadata[] = [];

  for (const [_id, BrokerClass] of brokerRegistry) {
    const instance = new BrokerClass();
    brokers.push(instance.metadata);
  }

  return brokers;
}

/**
 * Get metadata for a specific broker
 */
export function getBrokerMetadata(brokerId: string): BrokerMetadata | null {
  const BrokerClass = brokerRegistry.get(brokerId);
  if (!BrokerClass) return null;

  const instance = new BrokerClass();
  return instance.metadata;
}

/**
 * Check if a broker is supported
 */
export function isBrokerSupported(brokerId: string): boolean {
  return brokerRegistry.has(brokerId);
}

/**
 * Create a new broker instance
 * Does not connect - use connect() on the returned instance
 */
export function createBroker(brokerId: string): IBroker {
  const BrokerClass = brokerRegistry.get(brokerId);

  if (!BrokerClass) {
    throw new Error(`Unsupported broker: ${brokerId}`);
  }

  return new BrokerClass();
}

/**
 * Create and connect a broker instance
 * Caches the instance for reuse
 */
export async function connectBroker(
  brokerId: string,
  credentials: BrokerCredentials,
  connectionId?: string
): Promise<IBroker> {
  const cacheKey = connectionId || `${brokerId}_default`;

  // Check if we already have a connected instance
  const existingInstance = activeInstances.get(cacheKey);
  if (existingInstance?.status.isConnected) {
    return existingInstance;
  }

  // Create new instance
  const broker = createBroker(brokerId);

  // Connect
  await broker.connect(credentials);

  // Cache the instance
  activeInstances.set(cacheKey, broker);

  return broker;
}

/**
 * Get an active broker instance by connection ID
 */
export function getActiveBroker(connectionId: string): IBroker | null {
  return activeInstances.get(connectionId) || null;
}

/**
 * Disconnect a broker instance
 */
export async function disconnectBroker(connectionId: string): Promise<void> {
  const broker = activeInstances.get(connectionId);

  if (broker) {
    await broker.disconnect();
    activeInstances.delete(connectionId);
  }
}

/**
 * Disconnect all broker instances
 */
export async function disconnectAllBrokers(): Promise<void> {
  const disconnectPromises: Promise<void>[] = [];

  for (const [id, broker] of activeInstances) {
    disconnectPromises.push(
      broker.disconnect().then(() => {
        activeInstances.delete(id);
      })
    );
  }

  await Promise.all(disconnectPromises);
}

/**
 * Test connection with credentials without creating a persistent instance
 */
export async function testBrokerConnection(
  brokerId: string,
  credentials: BrokerCredentials
) {
  const broker = createBroker(brokerId);
  return broker.testConnection(credentials);
}

// ============================================================================
// Registration (for plugins/extensions)
// ============================================================================

/**
 * Register a new broker adapter
 * Useful for adding custom broker integrations
 */
export function registerBroker(brokerId: string, BrokerClass: BrokerConstructor): void {
  if (brokerRegistry.has(brokerId)) {
    console.warn(`Overwriting existing broker registration: ${brokerId}`);
  }
  brokerRegistry.set(brokerId, BrokerClass);
}

/**
 * Unregister a broker adapter
 */
export function unregisterBroker(brokerId: string): boolean {
  // Disconnect any active instances first
  for (const [key, broker] of activeInstances) {
    if (key.startsWith(brokerId)) {
      broker.disconnect();
      activeInstances.delete(key);
    }
  }

  return brokerRegistry.delete(brokerId);
}

// ============================================================================
// Broker Categories
// ============================================================================

/**
 * Get brokers by category
 */
export function getBrokersByCategory(category: string): BrokerMetadata[] {
  return getSupportedBrokers().filter((b) => b.category === category);
}

/**
 * Get crypto exchange brokers
 */
export function getCryptoExchanges(): BrokerMetadata[] {
  return getSupportedBrokers().filter(
    (b) => b.category === 'crypto_cex' || b.category === 'crypto_dex'
  );
}

/**
 * Get traditional brokers (stocks, forex, etc.)
 */
export function getTraditionalBrokers(): BrokerMetadata[] {
  return getSupportedBrokers().filter(
    (b) => b.category === 'stocks' || b.category === 'forex'
  );
}

// ============================================================================
// Export Types
// ============================================================================

export type { IBroker } from './IBroker';
export * from './types';
