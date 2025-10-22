import { Controller, Get } from "@nestjs/common";
import { register } from "prom-client";
import { Public } from "../auth/decorators";
import { PrometheusService } from "./prometheus.service";

@Controller("metrics")
export class PrometheusController {
  constructor(private prometheusService: PrometheusService) {}

  @Public()
  @Get()
  async getMetrics(): Promise<string> {
    return await register.metrics();
  }
}
