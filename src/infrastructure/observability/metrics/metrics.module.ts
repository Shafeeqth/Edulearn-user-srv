import { Global, Module } from "@nestjs/common";
import { MetricsService } from "./metrics.service";
import { PrometheusModule } from "@willsoto/nestjs-prometheus";

@Global()
@Module({
  imports: [
    PrometheusModule.register({
      defaultMetrics: { enabled: true, config: {} },
      path: "/metrics",
    }),
  ],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
