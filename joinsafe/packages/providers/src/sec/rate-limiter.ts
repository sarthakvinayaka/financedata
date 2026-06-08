// Token bucket rate limiter for EDGAR API compliance.
//
// The SEC states a rate limit of 10 requests/second per IP address.
// We target 8 req/s (80% of limit) to provide a comfortable safety margin
// and avoid 429 responses that require backoff handling.
//
// The limiter is a module-level singleton so it's shared across all provider
// instances in a single process — preventing inadvertent over-requesting
// if the user creates multiple OfficialSecEdgarProvider instances.

const TARGET_RPS = 8                         // Requests per second — 80% of SEC limit
const CAPACITY   = TARGET_RPS                 // Burst capacity = steady-state rate
const REFILL_MS  = 1000 / TARGET_RPS          // ms between token refills (125ms)

class TokenBucket {
  private tokens: number
  private lastRefillAt: number
  private readonly capacity: number
  private readonly refillPerMs: number

  constructor(rps: number) {
    this.capacity   = rps
    this.tokens     = rps
    this.refillPerMs = rps / 1000
    this.lastRefillAt = Date.now()
  }

  async acquire(): Promise<void> {
    this.refill()

    if (this.tokens >= 1) {
      this.tokens -= 1
      return
    }

    // Calculate exact wait time to have one token available
    const deficit  = 1 - this.tokens
    const waitMs   = Math.ceil(deficit / this.refillPerMs)

    await sleep(waitMs)
    this.refill()
    this.tokens = Math.max(0, this.tokens - 1)
  }

  private refill(): void {
    const now     = Date.now()
    const elapsed = now - this.lastRefillAt
    this.tokens   = Math.min(this.capacity, this.tokens + elapsed * this.refillPerMs)
    this.lastRefillAt = now
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Module-level singleton — shared across all provider instances
export const edgarRateLimiter = new TokenBucket(TARGET_RPS)
