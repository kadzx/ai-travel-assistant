interface CacheEntry<T> {
  data: T;
  expireAt: number;
}

const store = new Map<string, CacheEntry<any>>();

const DEFAULT_TTL = 60 * 1000; // 1 min

export function getCached<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expireAt) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

export function setCache<T>(key: string, data: T, ttl = DEFAULT_TTL): void {
  store.set(key, { data, expireAt: Date.now() + ttl });
}

export function clearCache(prefix?: string): void {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

/**
 * Wrap an async fetcher with caching.
 * Returns cached data if available, otherwise calls fetcher and caches the result.
 */
export function withCache<T>(key: string, fetcher: () => Promise<T>, ttl = DEFAULT_TTL): Promise<T> {
  const cached = getCached<T>(key);
  if (cached !== null) return Promise.resolve(cached);
  return fetcher().then((data) => {
    setCache(key, data, ttl);
    return data;
  });
}
