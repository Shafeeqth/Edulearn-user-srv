import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable } from "@nestjs/common";
import { Cache } from "cache-manager";
import { LoggingService } from "src/infrastructure/observability/logging/logging.service";

@Injectable()
export class RedisService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly logger: LoggingService
  ) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.cacheManager.get<T>(key);
    if (value) {
      this.logger.debug(`Cache get for key: ${key}`);
      try {
        return JSON.parse(value as string);
      } catch (error) {
        throw error;
      }
    }
    return null;
  }

  async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    try {
      const stringValue = JSON.stringify(value);
      await this.cacheManager.set(key, stringValue, ttl);
      this.logger.debug(`Cache set: ${key}`);
    } catch (error) {
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
    this.logger.debug(`Cache delete: ${key}`);
  }

  async delByPattern(pattern: string): Promise<void> {
    try {
      // Access the underlying Redis client from the cache manager store
      const store = (this.cacheManager as any).store;
      if (store && store.client) {
        const keys = await store.client.keys(pattern);
        if (keys.length > 0) {
          await store.client.del(...keys);
          this.logger.debug(
            `Cache delete by pattern: ${pattern}, deleted ${keys.length} keys`
          );
        } else {
          this.logger.debug(
            `Cache delete by pattern: ${pattern}, no keys found`
          );
        }
      } else {
        this.logger.warn("Redis client not available for pattern deletion");
      }
    } catch (error) {
      this.logger.error(`Failed to delete keys by pattern ${pattern}:`, error);
      throw error;
    }
  }
}
