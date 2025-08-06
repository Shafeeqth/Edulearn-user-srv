import { Module, Global } from "@nestjs/common";
import { LoggingService } from "./logging.service";
import { WinstonModule } from "nest-winston";
import winston, { format } from "winston";
import LokiTransport from "winston-loki";
import DailyRotateFile from "winston-daily-rotate-file";
import { AppConfigService } from "src/infrastructure/config/config.service";

@Global()
@Module({
  imports: [
    WinstonModule.forRootAsync({
      useFactory: async (configService: AppConfigService) => {
        const { lokiUrl, serviceName, nodeEnv, logLevel } = configService;
        const lokiTransport = new LokiTransport({
          host: lokiUrl,
          labels: { app: serviceName, env: nodeEnv },
          json: true,
          batching: true,
          interval: 5000,
        });

        const dailyRotateFileTransport = new DailyRotateFile({
          filename: `logs/${serviceName}-%DATE%-combined.log`,
          datePattern: "YYYY-MM-DD",
          zippedArchive: true,
          maxSize: "20m",
          maxFiles: "14d",
          format: format.json(),
        });

        const consoleTransport = new winston.transports.Console({
          handleExceptions: true,
          format: format.combine(format.colorize(), format.simple()),
        });

        const transportToUse = [consoleTransport, dailyRotateFileTransport];
        if (lokiUrl) {
          transportToUse.push(lokiTransport as any);
        }

        return {
          level: logLevel,
          format:
            nodeEnv === "development"
              ? format.json()
              : format.combine(
                  format.timestamp({ format: "YYYY-MM-DDTHH:mm:ss:SSSZ" }),
                  format.errors({ stack: true }),
                  format.metadata({
                    fillExcept: ["timestamp", "level", "message", "stack"],
                  }),
                  format.printf(
                    ({ timestamp, level, message, stack, ...meta }) => {
                      const colorize = format.colorize();
                      const colorLevel = colorize.colorize(
                        level,
                        level.toUpperCase()
                      );
                      const msg = stack ? `${message}\n${stack}` : message;
                      const metaString =
                        meta.metadata && Object.keys(meta.metadata).length > 0
                          ? `${JSON.stringify(meta.metadata)}`
                          : "";
                      return `[${timestamp}] [${colorLevel}]: ${msg}${metaString}`;
                    }
                  )
                ),
          transports: transportToUse,
        };
      },
      inject: [AppConfigService],
    }),
  ],
  providers: [LoggingService],
  exports: [LoggingService],
})
export class LoggingModule {}
