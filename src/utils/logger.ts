/**
 * Centralized Logger for PanicOnRails
 * 
 * Provides environment-aware logging with consistent formatting.
 * In production, only warnings and errors are logged.
 * In development, all levels are logged.
 * 
 * @example
 * import { logger } from '../utils/logger';
 * 
 * // Direct logging with module name
 * logger.debug('TrackStore', 'Loading layout...');
 * logger.info('BudgetStore', 'Spent:', { amount: 500 });
 * logger.warn('Connection', 'Node not found:', nodeId);
 * logger.error('Validation', 'Layout integrity check failed');
 * 
 * // Scoped logger for repeated use in a module
 * const log = logger.scope('ConnectionSlice');
 * log.debug('Starting node merge:', { ... });
 * log.warn('Node not found:', { ... });
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LoggerConfig {
    minLevel: LogLevel;
}

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

// Determine default min level based on environment
// In production, only show warnings and errors
// In development, show all levels
const getDefaultMinLevel = (): LogLevel => {
    // Vite sets import.meta.env.PROD in production builds
    if (typeof import.meta !== 'undefined' && import.meta.env?.PROD) {
        return 'warn';
    }
    // For tests and development, show all logs
    return 'debug';
};

const DEFAULT_CONFIG: LoggerConfig = {
    minLevel: getDefaultMinLevel(),
};

/**
 * Scoped logger interface for a specific module
 */
export interface ScopedLogger {
    debug: (message: string, ...args: unknown[]) => void;
    info: (message: string, ...args: unknown[]) => void;
    warn: (message: string, ...args: unknown[]) => void;
    error: (message: string, ...args: unknown[]) => void;
}

/**
 * Logger class with environment-aware log levels
 */
class Logger {
    private config: LoggerConfig;

    constructor(config: LoggerConfig = DEFAULT_CONFIG) {
        this.config = config;
    }

    /**
     * Check if a given log level should be logged based on config
     */
    private shouldLog(level: LogLevel): boolean {
        return LOG_LEVELS[level] >= LOG_LEVELS[this.config.minLevel];
    }

    /**
     * Format the module prefix for consistent output
     */
    private formatPrefix(module: string): string {
        return `[${module}]`;
    }

    /**
     * Log a debug message (lowest priority, hidden in production)
     */
    debug(module: string, message: string, ...args: unknown[]): void {
        if (this.shouldLog('debug')) {
            console.log(this.formatPrefix(module), message, ...args);
        }
    }

    /**
     * Log an info message (normal priority, hidden in production)
     */
    info(module: string, message: string, ...args: unknown[]): void {
        if (this.shouldLog('info')) {
            console.log(this.formatPrefix(module), message, ...args);
        }
    }

    /**
     * Log a warning message (shown in production)
     */
    warn(module: string, message: string, ...args: unknown[]): void {
        if (this.shouldLog('warn')) {
            console.warn(this.formatPrefix(module), message, ...args);
        }
    }

    /**
     * Log an error message (always shown)
     */
    error(module: string, message: string, ...args: unknown[]): void {
        if (this.shouldLog('error')) {
            console.error(this.formatPrefix(module), message, ...args);
        }
    }

    /**
     * Create a scoped logger for a specific module.
     * Reduces boilerplate when logging multiple times from the same module.
     * 
     * @param module - Module name to prefix all log messages with
     * @returns Scoped logger object with debug, info, warn, error methods
     * 
     * @example
     * const log = logger.scope('ConnectionSlice');
     * log.debug('Starting operation...');
     * log.warn('Validation failed');
     */
    scope(module: string): ScopedLogger {
        return {
            debug: (message: string, ...args: unknown[]) =>
                this.debug(module, message, ...args),
            info: (message: string, ...args: unknown[]) =>
                this.info(module, message, ...args),
            warn: (message: string, ...args: unknown[]) =>
                this.warn(module, message, ...args),
            error: (message: string, ...args: unknown[]) =>
                this.error(module, message, ...args),
        };
    }

    /**
     * Update logger configuration at runtime
     * Useful for enabling debug logs during development
     */
    setMinLevel(level: LogLevel): void {
        this.config.minLevel = level;
    }

    /**
     * Get current minimum log level
     */
    getMinLevel(): LogLevel {
        return this.config.minLevel;
    }
}

// Singleton instance
export const logger = new Logger();
