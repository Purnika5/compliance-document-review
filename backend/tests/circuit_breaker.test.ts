import { CircuitBreaker, CircuitBreakerOpenError } from '../src/utils/circuitBreaker';

describe('CircuitBreaker Utility', () => {
  it('should execute action successfully when CLOSED', async () => {
    const breaker = new CircuitBreaker({
      name: 'test-service',
      failureThreshold: 2,
      cooldownMs: 1000,
      timeoutMs: 500,
    });

    const result = await breaker.execute(async () => 'success');
    expect(result).toBe('success');
    expect(breaker.getState()).toBe('CLOSED');
    expect(breaker.getMetrics().failureCount).toBe(0);
    expect(breaker.getMetrics().successCount).toBe(1);
  });

  it('should trip to OPEN after consecutive failures meet threshold', async () => {
    const breaker = new CircuitBreaker({
      name: 'test-service',
      failureThreshold: 2,
      cooldownMs: 200,
      timeoutMs: 500,
    });

    const failingAction = async () => {
      throw new Error('Connection refused');
    };

    // First failure
    await expect(breaker.execute(failingAction)).rejects.toThrow('Connection refused');
    expect(breaker.getState()).toBe('CLOSED');
    expect(breaker.getMetrics().consecutiveFailures).toBe(1);

    // Second failure: breaches threshold (2) -> OPEN
    await expect(breaker.execute(failingAction)).rejects.toThrow('Connection refused');
    expect(breaker.getState()).toBe('OPEN');
    expect(breaker.isOpen()).toBe(true);

    // Third call should fail fast without executing action
    let actionExecuted = false;
    const probe = async () => {
      actionExecuted = true;
      return 'ok';
    };

    await expect(breaker.execute(probe)).rejects.toThrow(CircuitBreakerOpenError);
    expect(actionExecuted).toBe(false);
  });

  it('should invoke fallback when circuit is OPEN or action fails', async () => {
    const breaker = new CircuitBreaker({
      name: 'test-service',
      failureThreshold: 1,
      cooldownMs: 1000,
    });

    breaker.forceOpen();
    expect(breaker.isOpen()).toBe(true);

    const fallbackResult = await breaker.execute(
      async () => 'never reached',
      (err) => `degraded: ${err.message}`
    );

    expect(fallbackResult).toContain('degraded:');
    expect(fallbackResult).toContain('Circuit is OPEN');
  });

  it('should transition from OPEN to HALF_OPEN after cooldown and recover on success', async () => {
    const breaker = new CircuitBreaker({
      name: 'test-service',
      failureThreshold: 1,
      cooldownMs: 100, // 100ms cooldown for fast test
    });

    await expect(breaker.execute(async () => { throw new Error('fail'); })).rejects.toThrow();
    expect(breaker.getState()).toBe('OPEN');

    // Wait for cooldown
    await new Promise((resolve) => setTimeout(resolve, 120));

    expect(breaker.getState()).toBe('HALF_OPEN');

    // Successful probe should reset to CLOSED
    const result = await breaker.execute(async () => 'recovered');
    expect(result).toBe('recovered');
    expect(breaker.getState()).toBe('CLOSED');
    expect(breaker.getMetrics().consecutiveFailures).toBe(0);
  });

  it('should abort and record failure on timeout', async () => {
    const breaker = new CircuitBreaker({
      name: 'test-timeout',
      failureThreshold: 1,
      timeoutMs: 50, // 50ms timeout
    });

    const hangingAction = (signal: AbortSignal) =>
      new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => resolve('done'), 200);
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new Error('Aborted'));
        });
      });

    await expect(breaker.execute(hangingAction)).rejects.toThrow(/timed out/i);
    expect(breaker.getState()).toBe('OPEN');
  });
});
