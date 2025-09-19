export interface KafkaModuleOptions {
  clientId: string;
  brokers: string[];
  consumer?: {
    groupId: string;
    sessionTimeout?: number;
    rebalanceTimeout?: number;
    heartbeatInterval?: number;
    maxBytesPerPartition?: number;
    minBytes?: number;
    maxBytes?: number;
    maxWaitTimeInMs?: number;
    retry?: {
      retries?: number;
      initialRetryTime?: number;
      maxRetryTime?: number;
    };
  };
  producer?: {
    maxInFlightRequests?: number;
    idempotent?: boolean;
    transactionTimeout?: number;
    retry?: {
      retries?: number;
      initialRetryTime?: number;
      maxRetryTime?: number;
    };
  };
  schemaRegistry?: {
    host: string;
    auth?: {
      username: string;
      password: string;
    };
  };
  ssl?: boolean | object;
  sasl?: {
    mechanism: "plain" | "scram-sha-256" | "scram-sha-512";
    username: string;
    password: string;
  };
}

export interface EventPatternMetadata {
  topic: string;
  groupId?: string;
  partition?: number;
  offset?: string;
  schema?: {
    key?: string;
    value?: string;
  };
}

export interface KafkaMessage<T = any> {
  topic: string;
  partition: number;
  offset: string;
  timestamp: string;
  key: string | null;
  value: T;
  headers?: Record<string, string>;
}

export interface PublishOptions {
  topic: string;
  key?: string;
  partition?: number;
  headers?: Record<string, string>;
  timestamp?: string;
  schema?: {
    key?: string;
    value?: string;
  };
}
