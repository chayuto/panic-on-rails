/**
 * Unit Tests for Logger Utility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger, type LogLevel } from '../logger';

describe('logger', () => {
    // Store original console methods
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    beforeEach(() => {
        // Mock console methods
        console.log = vi.fn();
        console.warn = vi.fn();
        console.error = vi.fn();

        // Reset logger to debug level for tests
        logger.setMinLevel('debug');
    });

    afterEach(() => {
        // Restore console methods
        console.log = originalLog;
        console.warn = originalWarn;
        console.error = originalError;

        vi.restoreAllMocks();
    });

    describe('debug', () => {
        it('formats prefix correctly', () => {
            logger.debug('TestModule', 'Test message');
            expect(console.log).toHaveBeenCalledWith('[TestModule]', 'Test message');
        });

        it('passes additional arguments', () => {
            logger.debug('Module', 'Message', { data: 123 }, 'extra');
            expect(console.log).toHaveBeenCalledWith('[Module]', 'Message', { data: 123 }, 'extra');
        });

        it('is hidden when minLevel is info', () => {
            logger.setMinLevel('info');
            logger.debug('Module', 'Should not appear');
            expect(console.log).not.toHaveBeenCalled();
        });
    });

    describe('info', () => {
        it('formats prefix correctly', () => {
            logger.info('InfoModule', 'Info message');
            expect(console.log).toHaveBeenCalledWith('[InfoModule]', 'Info message');
        });

        it('is hidden when minLevel is warn', () => {
            logger.setMinLevel('warn');
            logger.info('Module', 'Should not appear');
            expect(console.log).not.toHaveBeenCalled();
        });
    });

    describe('warn', () => {
        it('uses console.warn', () => {
            logger.warn('WarnModule', 'Warning message');
            expect(console.warn).toHaveBeenCalledWith('[WarnModule]', 'Warning message');
        });

        it('is visible when minLevel is warn', () => {
            logger.setMinLevel('warn');
            logger.warn('Module', 'Warning');
            expect(console.warn).toHaveBeenCalled();
        });

        it('is hidden when minLevel is error', () => {
            logger.setMinLevel('error');
            logger.warn('Module', 'Should not appear');
            expect(console.warn).not.toHaveBeenCalled();
        });
    });

    describe('error', () => {
        it('uses console.error', () => {
            logger.error('ErrorModule', 'Error message');
            expect(console.error).toHaveBeenCalledWith('[ErrorModule]', 'Error message');
        });

        it('is always visible at error level', () => {
            logger.setMinLevel('error');
            logger.error('Module', 'Error');
            expect(console.error).toHaveBeenCalled();
        });
    });

    describe('scope', () => {
        it('creates a scoped logger', () => {
            const log = logger.scope('ScopedModule');
            expect(typeof log.debug).toBe('function');
            expect(typeof log.info).toBe('function');
            expect(typeof log.warn).toBe('function');
            expect(typeof log.error).toBe('function');
        });

        it('scoped debug uses correct prefix', () => {
            const log = logger.scope('ScopedModule');
            log.debug('Debug message');
            expect(console.log).toHaveBeenCalledWith('[ScopedModule]', 'Debug message');
        });

        it('scoped warn uses correct prefix', () => {
            const log = logger.scope('ScopedModule');
            log.warn('Scoped warning');
            expect(console.warn).toHaveBeenCalledWith('[ScopedModule]', 'Scoped warning');
        });

        it('scoped error uses correct prefix', () => {
            const log = logger.scope('ScopedModule');
            log.error('Scoped error');
            expect(console.error).toHaveBeenCalledWith('[ScopedModule]', 'Scoped error');
        });

        it('scoped logger respects minLevel', () => {
            logger.setMinLevel('warn');
            const log = logger.scope('Module');

            log.debug('Should not appear');
            log.info('Should not appear');
            log.warn('Should appear');

            expect(console.log).not.toHaveBeenCalled();
            expect(console.warn).toHaveBeenCalledTimes(1);
        });
    });

    describe('configuration', () => {
        it('getMinLevel returns current level', () => {
            logger.setMinLevel('warn');
            expect(logger.getMinLevel()).toBe('warn');
        });

        it('setMinLevel updates filtering', () => {
            // Start at debug
            logger.setMinLevel('debug');
            logger.debug('Module', 'Should appear');
            expect(console.log).toHaveBeenCalledTimes(1);

            // Change to error
            logger.setMinLevel('error');
            logger.debug('Module', 'Should not appear');
            logger.info('Module', 'Should not appear');
            logger.warn('Module', 'Should not appear');

            // Still only 1 call from before
            expect(console.log).toHaveBeenCalledTimes(1);
            expect(console.warn).not.toHaveBeenCalled();
        });
    });

    describe('log levels', () => {
        const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];

        it.each(levels)('level %s filters correctly', (minLevel) => {
            logger.setMinLevel(minLevel);

            // All levels at or above minLevel should work
            // Levels below should be filtered
            const levelOrder = ['debug', 'info', 'warn', 'error'];
            const minIndex = levelOrder.indexOf(minLevel);

            if (minIndex <= 0) {
                logger.debug('M', 'msg');
                expect(console.log).toHaveBeenCalled();
            }
            if (minIndex <= 1) {
                logger.info('M', 'msg');
            }
            if (minIndex <= 2) {
                logger.warn('M', 'msg');
                expect(console.warn).toHaveBeenCalled();
            }
            if (minIndex <= 3) {
                logger.error('M', 'msg');
                expect(console.error).toHaveBeenCalled();
            }
        });
    });
});
