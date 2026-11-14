import { Redis } from '@upstash/redis';
import type { PortfolioDocument } from '@/schema/portfolio.schema';

function getRedisClient(): Redis | null {
  // Ưu tiên Vercel KV env vars hoặc Upstash Redis env vars
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    try {
      return new Redis({ url, token });
    } catch {
      return null;
    }
  }
  return null;
}

export async function savePortfolioToCloud(
  slug: string,
  doc: PortfolioDocument
): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  try {
    await redis.set(`portfolio:${slug}`, JSON.stringify(doc));
    return true;
  } catch (err) {
    console.error('Failed to save portfolio to cloud KV:', err);
    return false;
  }
}

export async function getPortfolioFromCloud(
  slug: string
): Promise<PortfolioDocument | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  try {
    const data = await redis.get(`portfolio:${slug}`);
    if (!data) return null;
    if (typeof data === 'string') {
      return JSON.parse(data);
    }
    return data as PortfolioDocument;
  } catch (err) {
    console.error('Failed to get portfolio from cloud KV:', err);
    return null;
  }
}
