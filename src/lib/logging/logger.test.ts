// src/lib/logging/logger.test.ts
import { logger, initLogger } from './logger';

describe('Logger', () => {
  it('should be initialized without errors', () => {
    expect(() => initLogger({ level: 'info' })).not.toThrow();
  });

  it('should have a log method', () => {
    expect(logger).toHaveProperty('info');
  });
});
