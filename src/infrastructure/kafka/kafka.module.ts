import { Module, DynamicModule, Global } from "@nestjs/common";
import { DiscoveryModule, DiscoveryService } from "@nestjs/core";
import { KAFKA_MODULE_OPTIONS } from "./kafka.constants";
import { KafkaModuleOptions } from "./kafka.types";
import { KafkaService } from "./kafka.service";
import { KafkaClient } from "./kafka.client";
import { KafkaExplorer } from "./kafka.explorer";
import { LoggingService } from "../observability/logging/logging.service";

@Global()
@Module({})
export class KafkaModule {
  static forRoot(
    options: KafkaModuleOptions,
    logger: LoggingService
  ): DynamicModule {
    return {
      module: KafkaModule,
      imports: [DiscoveryModule],
      providers: [
        {
          provide: KAFKA_MODULE_OPTIONS,
          useValue: options,
        },
        {
          provide: KafkaClient,
          useFactory: () => new KafkaClient(options, logger),
        },
        KafkaService,
        KafkaExplorer,
      ],
      exports: [KafkaService, KafkaClient],
    };
  }

  static forRootAsync(options: {
    imports?: any[];
    useFactory: (
      ...args: any[]
    ) => Promise<KafkaModuleOptions> | KafkaModuleOptions;
    inject?: any[];
  }): DynamicModule {
    return {
      module: KafkaModule,
      imports: [DiscoveryModule, ...(options.imports || [])],
      providers: [
        {
          provide: KAFKA_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject,
        },
        {
          provide: KafkaClient,
          useFactory: (
            moduleOptions: KafkaModuleOptions,
            logger: LoggingService
          ) => new KafkaClient(moduleOptions, logger),
          inject: [KAFKA_MODULE_OPTIONS, LoggingService],
        },
        KafkaService,
        KafkaExplorer,
      ],
      exports: [KafkaService, KafkaClient],
    };
  }
}
