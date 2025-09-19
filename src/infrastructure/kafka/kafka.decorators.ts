import { applyDecorators, SetMetadata } from "@nestjs/common";
import { MessagePattern } from "@nestjs/microservices";
import { KAFKA_EVENT_PATTERN } from "./kafka.constants";
import { EventPatternMetadata } from "./kafka.types";

export function EventPattern(
  metadata: string | EventPatternMetadata
): MethodDecorator {
  if (typeof metadata === "string") {
    return applyDecorators(
      SetMetadata(KAFKA_EVENT_PATTERN, { topic: metadata }),
      MessagePattern(metadata)
    );
  }

  return applyDecorators(
    SetMetadata(KAFKA_EVENT_PATTERN, metadata),
    MessagePattern(metadata.topic)
  );
}
