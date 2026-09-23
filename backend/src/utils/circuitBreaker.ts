/**
 * Circuit Breaker Pattern Implementation for External Service Calls.
 * Provides fail-fast resilience, graceful degradation, and prevents cascading failures.
 * 
 * States:
 * - CLOSED: Calls execute normally. Failures increment failure counter.
 * - OPEN: Downstream service considered unavailable. Fails fast immediately without calling downstream.
 * - HALF_OPEN: Cooldown period elapsed. Permits trial probe to test downstream recovery.
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  name?: string;
  failureThreshold?: number; // Number of consecutive failures before opening circuit
  cooldownMs?: number;       // Time in ms before attempting HALF_OPEN probe (default: 30s)
  timeoutMs?: number;        // Individual call timeout in ms (default: 10s)
}

export interface CircuitBreakerMetrics {
  name: string;
  state: CircuitState;
  failureCount: number;
  successCount: number;
  consecutiveFailures: number;
  lastFailureTime: string | null;
  lastSuccessTime: string | null;
  nextAttemptTime: string | null;
  failureThreshold: number;
  cooldownMs: number;
  timeoutMs: number;
}

export class CircuitBreakerOpenError extends Error {
  public readonly retryAfterSeconds: number;
  public readonly isCircuitBreakerOpen = true;

  constructor(message: string, retryAfterSeconds: number = 30) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
    this.retryAfterSeconds = Math.max(1, retryAfterSeconds);
  }
}

export class CircuitBreaker {
  private readonly name: string;
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;
  private readonly timeoutMs: number;

  private state: CircuitState = 'CLOSED';
  private consecutiveFailures: number = 0;
  private totalFailures: number = 0;
  private totalSuccesses: number = 0;
  private lastFailureTime: Date | null = null;
  private lastSuccessTime: Date | null = null;
  private nextAttemptTime: Date | null = null;

  constructor(options: CircuitBreakerOptions = {}) {
    this.name = options.name || 'default-circuit';
    this.failureThreshold = options.failureThreshold ?? 3;
    this.cooldownMs = options.cooldownMs ?? 30000; // 30s default
    this.timeoutMs = options.timeoutMs ?? 10000;   // 10s timeout
  }

  public getState(): CircuitState {
    this.evaluateState();
    return this.state;
  }

  public isOpen(): boolean {
    return this.getState() === 'OPEN';
  }

  private evaluateState(): void {
    if (this.state === 'OPEN' && this.nextAttemptTime) {
      const now = new Date();
      if (now >= this.nextAttemptTime) {
        this.state = 'HALF_OPEN';
      }
    }
  }

  public async execute<T>(
    action: (signal: AbortSignal) => Promise<T>,
    fallback?: (error: Error) => Promise<T> | T
  ): Promise<T> {
    this.evaluateState();

    if (this.state === 'OPEN') {
      const remainingSeconds = this.nextAttemptTime
        ? Math.ceil((this.nextAttemptTime.getTime() - Date.now()) / 1000)
        : Math.ceil(this.cooldownMs / 1000);

      const openError = new CircuitBreakerOpenError(
        `[CircuitBreaker:${this.name}] Circuit is OPEN. External service is unavailable. Fail-fast active.`,
        remainingSeconds
      );

      if (fallback) {
        return fallback(openError);
      }
      throw openError;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.timeoutMs);

    try {
      const result = await action(controller.signal);
      clearTimeout(timeoutId);
      this.recordSuccess();
      return result;
    } catch (err: any) {
      clearTimeout(timeoutId);
      const error = controller.signal.aborted
        ? new Error(`[CircuitBreaker:${this.name}] Call timed out after ${this.timeoutMs}ms`)
        : (err instanceof Error ? err : new Error(String(err)));

      this.recordFailure(error);

      if (fallback) {
        return fallback(error);
      }
      throw error;
    }
  }

  public recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.totalSuccesses++;
    this.lastSuccessTime = new Date();

    if (this.state === 'HALF_OPEN') {
      console.log(`[CircuitBreaker:${this.name}] Probe succeeded. Circuit transitioned to CLOSED.`);
      this.state = 'CLOSED';
      this.nextAttemptTime = null;
    }
  }

  public recordFailure(error?: Error): void {
    this.consecutiveFailures++;
    this.totalFailures++;
    this.lastFailureTime = new Date();

    console.warn(
      `[CircuitBreaker:${this.name}] Failure recorded (${this.consecutiveFailures}/${this.failureThreshold}): ${error?.message || 'Unknown error'}`
    );

    if (this.state === 'CLOSED' && this.consecutiveFailures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttemptTime = new Date(Date.now() + this.cooldownMs);
      console.error(
        `[CircuitBreaker:${this.name}] Threshold breached (${this.consecutiveFailures} consecutive failures). Circuit tripped to OPEN. Cooldown until ${this.nextAttemptTime.toISOString()}`
      );
    } else if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.nextAttemptTime = new Date(Date.now() + this.cooldownMs);
      console.warn(
        `[CircuitBreaker:${this.name}] Probe failed in HALF_OPEN. Circuit returned to OPEN. Cooldown until ${this.nextAttemptTime.toISOString()}`
      );
    }
  }

  public reset(): void {
    this.state = 'CLOSED';
    this.consecutiveFailures = 0;
    this.nextAttemptTime = null;
    console.log(`[CircuitBreaker:${this.name}] Circuit manually reset to CLOSED.`);
  }

  public forceOpen(cooldownMs?: number): void {
    this.state = 'OPEN';
    this.nextAttemptTime = new Date(Date.now() + (cooldownMs ?? this.cooldownMs));
    console.log(`[CircuitBreaker:${this.name}] Circuit forced to OPEN.`);
  }

  public getMetrics(): CircuitBreakerMetrics {
    this.evaluateState();
    return {
      name: this.name,
      state: this.state,
      failureCount: this.totalFailures,
      successCount: this.totalSuccesses,
      consecutiveFailures: this.consecutiveFailures,
      lastFailureTime: this.lastFailureTime ? this.lastFailureTime.toISOString() : null,
      lastSuccessTime: this.lastSuccessTime ? this.lastSuccessTime.toISOString() : null,
      nextAttemptTime: this.nextAttemptTime ? this.nextAttemptTime.toISOString() : null,
      failureThreshold: this.failureThreshold,
      cooldownMs: this.cooldownMs,
      timeoutMs: this.timeoutMs,
    };
  }
}

// Global instance for AI service
export const aiCircuitBreaker = new CircuitBreaker({
  name: 'ai-analysis-service',
  failureThreshold: 4,
  cooldownMs: 20000,
  timeoutMs: 30000,
});
