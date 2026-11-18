import type { Request, Response, NextFunction } from 'express';

type Bucket = {
  timestamps: number[];
};

const buckets = new Map<string, Bucket>();

export function createRateLimiter(options: {
  name: string;
  windowMs: number;
  maxRequests: number;
  message?: string;
}) {
  const { name, windowMs, maxRequests, message } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const ip =
      (typeof req.headers['x-forwarded-for'] === 'string'
        ? req.headers['x-forwarded-for'].split(',')[0]?.trim()
        : undefined) ||
      req.ip ||
      'unknown';
    const key = `${name}:${ip}`;
    const existing = buckets.get(key) ?? { timestamps: [] };
    const cutoff = now - windowMs;
    existing.timestamps = existing.timestamps.filter((ts) => ts > cutoff);

    if (existing.timestamps.length >= maxRequests) {
      const oldest = existing.timestamps[0] ?? now;
      const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        detail: message || 'Too many requests. Please wait a moment and try again.',
        retry_after_seconds: retryAfterSec,
      });
    }

    existing.timestamps.push(now);
    buckets.set(key, existing);

    if (buckets.size > 5000) {
      for (const [k, b] of buckets.entries()) {
        if (b.timestamps.every((ts) => ts <= cutoff)) {
          buckets.delete(k);
        }
      }
    }

    return next();
  };
}
