/**
 * Structured Logger Utility
 *
 * Provides consistent logging across the application with:
 * - Environment-aware logging (silent in production for non-errors)
 * - Namespaced loggers for different modules
 * - Structured output with timestamps
 * - Error tracking integration ready
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  namespace: string;
  message: string;
  data?: unknown;
  timestamp: string;
}

const isProduction = process.env.NODE_ENV === 'production';
const isBrowser = typeof window !== 'undefined';

/**
 * Format log entry for console output
 */
function formatLogEntry(entry: LogEntry): string {
  const prefix = `[${entry.timestamp}] [${entry.namespace}]`;
  return `${prefix} ${entry.message}`;
}

/**
 * Core logging function
 */
function log(level: LogLevel, namespace: string, message: string, data?: unknown): void {
  // In production, only log warnings and errors
  if (isProduction && level !== 'warn' && level !== 'error') {
    return;
  }

  const entry: LogEntry = {
    level,
    namespace,
    message,
    data,
    timestamp: new Date().toISOString(),
  };

  const formattedMessage = formatLogEntry(entry);

  switch (level) {
    case 'debug':
      if (data !== undefined) {
        console.debug(formattedMessage, data);
      } else {
        console.debug(formattedMessage);
      }
      break;
    case 'info':
      if (data !== undefined) {
        console.info(formattedMessage, data);
      } else {
        console.info(formattedMessage);
      }
      break;
    case 'warn':
      if (data !== undefined) {
        console.warn(formattedMessage, data);
      } else {
        console.warn(formattedMessage);
      }
      break;
    case 'error':
      if (data !== undefined) {
        console.error(formattedMessage, data);
      } else {
        console.error(formattedMessage);
      }
      // In production, could send to error tracking service here
      break;
  }
}

/**
 * Create a namespaced logger
 *
 * @param namespace - The namespace for this logger (e.g., 'stripe:webhook', 'auth')
 * @returns Logger instance with debug, info, warn, error methods
 *
 * @example
 * ```typescript
 * const logger = createLogger('stripe:webhook');
 * logger.info('Processing event', { eventId: 'evt_123' });
 * logger.error('Failed to process', error);
 * ```
 */
export function createLogger(namespace: string) {
  return {
    debug: (message: string, data?: unknown) => log('debug', namespace, message, data),
    info: (message: string, data?: unknown) => log('info', namespace, message, data),
    warn: (message: string, data?: unknown) => log('warn', namespace, message, data),
    error: (message: string, data?: unknown) => log('error', namespace, message, data),
  };
}

// Pre-configured loggers for common use cases
export const logger = createLogger('app');
export const authLogger = createLogger('auth');
export const stripeLogger = createLogger('stripe');
export const webhookLogger = createLogger('stripe:webhook');
export const usageLogger = createLogger('usage');
export const editorLogger = createLogger('editor');
export const canvasLogger = createLogger('canvas');
export const poseLogger = createLogger('mediapipe:pose');

/**
 * Log a performance measurement
 */
export function logPerformance(namespace: string, operation: string, durationMs: number): void {
  const perfLogger = createLogger(`perf:${namespace}`);
  perfLogger.debug(`${operation} completed`, { durationMs });
}

/**
 * Create a performance timer
 *
 * @example
 * ```typescript
 * const timer = startTimer('export');
 * await doExpensiveOperation();
 * timer.end('Image exported'); // Logs duration
 * ```
 */
export function startTimer(namespace: string) {
  const start = performance.now();
  return {
    end: (message: string) => {
      const duration = performance.now() - start;
      logPerformance(namespace, message, Math.round(duration));
      return duration;
    },
  };
}
