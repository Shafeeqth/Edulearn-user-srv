import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import {
  Kafka,
  Consumer,
  Producer,
  EachMessagePayload,
  SASLOptions,
  KafkaMessage,
} from "kafkajs";
import { SchemaRegistry } from "@kafkajs/confluent-schema-registry";
import {
  EventPatternMetadata,
  KafkaModuleOptions,
  PublishOptions,
} from "./kafka.types";
import { LoggingService } from "../observability/logging/logging.service";

@Injectable()
export class KafkaClient implements OnModuleInit, OnModuleDestroy {
//   private readonly logger = new Logger(KafkaClient.name);
  private kafka: Kafka;
  private producer: Producer;
  private consumers: Map<string, Consumer> = new Map();
  private schemaRegistry: SchemaRegistry | null = null;
  private readonly messageHandlers: Map<string, Function> = new Map();

  constructor(private readonly options: KafkaModuleOptions, private readonly logger: LoggingService) {
    this.kafka = new Kafka({
      clientId: options.clientId,
      brokers: options.brokers,
      ssl: options.ssl,
      sasl: options.sasl as SASLOptions,
    });

    this.producer = this.kafka.producer({
      maxInFlightRequests: options.producer?.maxInFlightRequests || 1,
      idempotent: options.producer?.idempotent || true,
      transactionTimeout: options.producer?.transactionTimeout || 30000,
      retry: options.producer?.retry,
    });

    if (options.schemaRegistry) {
      this.schemaRegistry = new SchemaRegistry({
        host: options.schemaRegistry.host,
        auth: options.schemaRegistry.auth,
      });
    }
  }

  async onModuleInit() {
    try {
      await this.producer.connect();
      this.logger.log("Kafka producer connected successfully");
    } catch (error) {
      this.logger.error("Failed to connect Kafka producer", error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.producer.disconnect();

      for (const [groupId, consumer] of this.consumers) {
        await consumer.disconnect();
        this.logger.log(`Consumer ${groupId} disconnected`);
      }

      this.logger.log("Kafka connections closed successfully");
    } catch (error) {
      this.logger.error("Error closing Kafka connections", error);
    }
  }

  async publish<T = any>(data: T, options: PublishOptions): Promise<void> {
    try {
      let serializedKey: Buffer<ArrayBufferLike> | string = options.key;
      let serializedValue: Buffer<ArrayBufferLike> | string =
        JSON.stringify(data);

      if (this.schemaRegistry && options.schema) {
        if (options.schema.key && options.key) {
          const keyId = await this.schemaRegistry.getLatestSchemaId(
            options.schema.key
          );
          serializedKey = await this.schemaRegistry.encode(keyId, options.key);
        }

        if (options.schema.value) {
          const valueId = await this.schemaRegistry.getLatestSchemaId(
            options.schema.value
          );
          serializedValue = await this.schemaRegistry.encode(valueId, data);
        }
      }

      await this.producer.send({
        topic: options.topic,
        messages: [
          {
            key: serializedKey,
            value: serializedValue,
            partition: options.partition,
            headers: options.headers,
            timestamp: options.timestamp,
          },
        ],
      });

      this.logger.debug(`Message published to topic ${options.topic}`);
    } catch (error) {
      this.logger.error(
        `Failed to publish message to topic ${options.topic}`,
        error
      );
      throw error;
    }
  }

  async subscribe(
    pattern: EventPatternMetadata,
    handler: Function
  ): Promise<void> {
    const groupId =
      pattern.groupId ||
      this.options.consumer?.groupId ||
      `${this.options.clientId}-group`;

    let consumer = this.consumers.get(groupId);

    if (!consumer) {
      consumer = this.kafka.consumer({
        groupId,
        sessionTimeout: this.options.consumer?.sessionTimeout || 30000,
        rebalanceTimeout: this.options.consumer?.rebalanceTimeout || 60000,
        heartbeatInterval: this.options.consumer?.heartbeatInterval || 3000,
        maxBytesPerPartition:
          this.options.consumer?.maxBytesPerPartition || 1048576,
        minBytes: this.options.consumer?.minBytes || 1,
        maxBytes: this.options.consumer?.maxBytes || 10485760,
        maxWaitTimeInMs: this.options.consumer?.maxWaitTimeInMs || 5000,
        retry: this.options.consumer?.retry,
      });

      await consumer.connect();
      this.consumers.set(groupId, consumer);
      this.logger.log(`Consumer ${groupId} connected successfully`);
    }

    await consumer.subscribe({ topic: pattern.topic, fromBeginning: false });

    const handlerKey = `${groupId}-${pattern.topic}`;
    this.messageHandlers.set(handlerKey, handler);

    await consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        await this.handleMessage(payload, pattern, handler);
      },
    });

    this.logger.log(
      `Subscribed to topic ${pattern.topic} with group ${groupId}`
    );
  }

  private async handleMessage(
    payload: EachMessagePayload,
    pattern: EventPatternMetadata,
    handler: Function
  ): Promise<void> {
    try {
      const { topic, partition, message } = payload;

      let deserializedKey: string | Buffer<ArrayBufferLike> =
        message.key?.toString();
      let deserializedValue: any = message.value?.toString();

      // Deserialize with schema registry if configured
      if (this.schemaRegistry && pattern.schema) {
        if (pattern.schema.key && message.key) {
          deserializedKey = await this.schemaRegistry.decode(message.key);
        }

        if (pattern.schema.value && message.value) {
          deserializedValue = await this.schemaRegistry.decode(message.value);
        } else if (message.value) {
          try {
            deserializedValue = JSON.parse(message.value.toString());
          } catch {
            // Keep as string if not valid JSON
          }
        }
      } else if (message.value) {
        try {
          deserializedValue = JSON.parse(message.value.toString());
        } catch {
          // Keep as string if not valid JSON
        }
      }

      const kafkaMessage: KafkaMessage | any = {
        topic,
        partition,
        offset: message.offset,
        timestamp: message.timestamp,
        key: deserializedKey as Buffer,
        value: deserializedValue,
        headers: message.headers
          ? Object.fromEntries(
              Object.entries(message.headers).map(([k, v]) => [
                k,
                v?.toString() || "",
              ])
            )
          : undefined,
      };

      await handler(kafkaMessage);

      this.logger.debug(
        `Message processed successfully: topic=${topic}, partition=${partition}, offset=${message.offset}`
      );
    } catch (error) {
      this.logger.error(
        `Error processing message: topic=${payload.topic}, partition=${payload.partition}, offset=${payload.message.offset}`,
        error
      );

      // Implement dead letter queue or retry logic here if needed
      throw error;
    }
  }
}
