import { Injectable, OnModuleInit } from "@nestjs/common";
import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from "prom-client";

@Injectable()
export class PrometheusService implements OnModuleInit {
  private readonly registry: Registry;
  private readonly httpRequestDuration: Histogram;
  private readonly httpRequestTotal: Counter;
  private readonly httpRequestErrors: Counter;
  private readonly activeRequests: Gauge;

  constructor() {
    this.registry = new Registry();

    // Add default metrics (CPU, memory, etc.)
    collectDefaultMetrics({ register: this.registry });

    // HTTP request duration histogram
    this.httpRequestDuration = new Histogram({
      name: "http_request_duration_seconds",
      help: "Duration of HTTP requests in seconds",
      labelNames: ["method", "route", "status_code"],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
      registers: [this.registry],
    });

    // Total HTTP requests counter
    this.httpRequestTotal = new Counter({
      name: "http_request_total",
      help: "Total number of HTTP requests",
      labelNames: ["method", "route", "status_code"],
      registers: [this.registry],
    });

    // HTTP request errors counter
    this.httpRequestErrors = new Counter({
      name: "http_request_errors_total",
      help: "Total number of HTTP request errors",
      labelNames: ["method", "route", "error_type"],
      registers: [this.registry],
    });

    // Active requests gauge
    this.activeRequests = new Gauge({
      name: "http_active_requests",
      help: "Number of active HTTP requests",
      registers: [this.registry],
    });
  }

  onModuleInit() {
    // Initialize metrics
    this.activeRequests.set(0);
  }

  startConversion(type: string) {
    this.activeRequests.inc();
    return this.httpRequestDuration.startTimer({ method: "POST", route: type });
  }

  endConversion(timer: () => number, status: "success" | "error") {
    this.activeRequests.dec();
    timer();
    this.httpRequestTotal.inc({
      method: "POST",
      route: "gateway",
      status_code: status === "success" ? "200" : "500",
    });
  }

  recordError(type: string, error: string) {
    this.httpRequestErrors.inc({
      method: "POST",
      route: type,
      error_type: error,
    });
  }

  getRegistry(): Registry {
    return this.registry;
  }
}
