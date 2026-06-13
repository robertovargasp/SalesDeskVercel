import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Rate limiter opcional: solo se activa si Upstash está configurado.
// Sin las env vars (ej. dev local) NO bloquea nada — el flujo sigue igual.
let ratelimit: Ratelimit | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(5, '60 s'),
    analytics: false,
    prefix: 'ratelimit:users-create',
  });
}

/**
 * Devuelve { success } — success=false significa que se excedió el límite.
 * Si Upstash no está configurado, siempre devuelve success=true (no-op).
 */
export async function checkRateLimit(identifier: string): Promise<{ success: boolean }> {
  if (!ratelimit) return { success: true };
  const { success } = await ratelimit.limit(identifier);
  return { success };
}
