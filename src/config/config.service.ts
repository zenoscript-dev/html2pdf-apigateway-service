import { Injectable } from "@nestjs/common";
import { config } from "dotenv";

@Injectable()
export class ConfigService {
  constructor() {
    config();
  }

  get port(): number {
    return parseInt(process.env.PORT || "6100", 10);
  }

  get nodeEnv(): string {
    return process.env.NODE_ENV || "development";
  }

  get corsOrigin(): string {
    return process.env.CORS_ORIGIN || "*";
  }

  get rateLimitTtl(): number {
    return parseInt(process.env.RATE_LIMIT_TTL || "60", 10); // 1 minute default
  }

  get rateLimitMax(): number {
    return parseInt(process.env.RATE_LIMIT_MAX || "10", 10); // 10 requests per minute default
  }

  get maxConcurrentJobs(): number {
    return parseInt(process.env.MAX_CONCURRENT_JOBS || "5", 10);
  }

  // Service URLs for routing
  get pdfServiceUrl(): string {
    return process.env.PDF_SERVICE_URL || "http://localhost:5000";
  }

  get authServiceUrl(): string {
    return process.env.AUTH_SERVICE_URL || "http://localhost:5001";
  }
}
