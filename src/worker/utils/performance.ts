/**
 * Performance Monitoring Utility
 * 
 * Provides request timing and sub-millisecond latency metrics for Edge optimization.
 * Used for monitoring critical endpoints and identifying performance bottlenecks.
 */

export interface PerformanceMetrics {
  requestId: string;
  endpoint: string;
  method: string;
  duration: number; // milliseconds
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Performance monitoring middleware for Hono
 * Tracks request duration and logs metrics
 */
export function performanceMiddleware() {
  return async (c: unknown, next: () => Promise<void>) => {
    const startTime = performance.now();
    const requestId = crypto.randomUUID();
    
    // Type assertion for Hono context
    const context = c as {
      set: (key: string, value: string) => void;
      req: { path: string; method: string };
      res: { status: number; headers: Headers };
    };
    
    // Add request ID to context for tracing
    context.set('requestId', requestId);
    
    await next();
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    const metrics: PerformanceMetrics = {
      requestId,
      endpoint: context.req.path,
      method: context.req.method,
      duration,
      timestamp: Date.now(),
      metadata: {
        statusCode: context.res.status,
      },
    };
    
    // Log metrics for sub-millisecond endpoints
    if (duration < 1) {
      console.log(`[PERF] Sub-millisecond request: ${metrics.endpoint} (${duration.toFixed(3)}ms)`, metrics);
    } else if (duration < 10) {
      console.log(`[PERF] Fast request: ${metrics.endpoint} (${duration.toFixed(2)}ms)`, metrics);
    } else {
      console.log(`[PERF] Request: ${metrics.endpoint} (${duration.toFixed(2)}ms)`, metrics);
    }
    
    // Add performance header to response
    context.res.headers.set('X-Request-Duration', duration.toFixed(3));
    context.res.headers.set('X-Request-Id', requestId);
  };
}

/**
 * Measure execution time of an async function
 * 
 * @param fn - Async function to measure
 * @param label - Label for logging
 * @returns Result and duration
 */
export async function measureExecution<T>(
  fn: () => Promise<T>,
  label: string
): Promise<{ result: T; duration: number }> {
  const startTime = performance.now();
  const result = await fn();
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  if (duration < 1) {
    console.log(`[PERF] ${label}: ${duration.toFixed(3)}ms (sub-millisecond)`);
  } else {
    console.log(`[PERF] ${label}: ${duration.toFixed(2)}ms`);
  }
  
  return { result, duration };
}

/**
 * Create a performance timer for manual measurement
 * 
 * @param label - Label for the timer
 * @returns Timer object with start/end methods
 */
export function createTimer(label: string) {
  let startTime: number | null = null;
  
  return {
    start() {
      startTime = performance.now();
    },
    end(): number {
      if (startTime === null) {
        throw new Error('Timer not started');
      }
      const duration = performance.now() - startTime;
      console.log(`[PERF] ${label}: ${duration.toFixed(3)}ms`);
      return duration;
    },
    getDuration(): number | null {
      if (startTime === null) return null;
      return performance.now() - startTime;
    },
  };
}
