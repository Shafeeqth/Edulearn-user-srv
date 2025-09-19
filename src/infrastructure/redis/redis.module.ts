import { Module } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { AppConfigService } from "../config/config.service";
import { redisStore } from "cache-manager-redis-store";
import { RedisService } from "./redis.service";

@Module({
  imports: [
    CacheModule.registerAsync({
      useFactory: async (configService: AppConfigService) => ({
        store: await redisStore({ url: configService.redisUrl, ttl: 3600, }),
      }),
      inject: [AppConfigService],
    }),
  ],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
