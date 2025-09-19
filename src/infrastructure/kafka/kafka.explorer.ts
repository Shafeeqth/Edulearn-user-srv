import { Injectable, OnModuleInit } from "@nestjs/common";
import { DiscoveryService, MetadataScanner, Reflector } from "@nestjs/core";
import { KAFKA_EVENT_PATTERN } from "./kafka.constants";
import { EventPatternMetadata } from "./kafka.types";
import { KafkaClient } from "./kafka.client";

@Injectable()
export class KafkaExplorer implements OnModuleInit {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
    private readonly kafkaClient: KafkaClient
  ) {}

  async onModuleInit() {
    await this.explore();
  }

  private async explore() {
    const providers = this.discoveryService.getProviders();
    const controllers = this.discoveryService.getControllers();

    const instances = [...providers, ...controllers]
      .filter((wrapper) => wrapper.isDependencyTreeStatic())
      .filter((wrapper) => wrapper.instance);

    for (const { instance } of instances) {
      const prototype = Object.getPrototypeOf(instance);
      const methodNames = this.metadataScanner.scanFromPrototype(
        instance,
        prototype,
        (method) => method
      );

      for (const methodName of methodNames) {
        const methodRef = instance[methodName];
        const metadata = this.reflector.get<EventPatternMetadata>(
          KAFKA_EVENT_PATTERN,
          methodRef
        );

        if (metadata) {
          await this.kafkaClient.subscribe(metadata, methodRef.bind(instance));
        }
      }
    }
  }
}
