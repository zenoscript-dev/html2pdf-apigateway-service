import { Injectable } from "@nestjs/common";
import { config } from "dotenv";
import {
  DEFAULT_AUTH_SERVICE_URL,
  DEFAULT_MAX_CONCURRENT_JOBS,
  DEFAULT_PDF_SERVICE_URL,
  DEFAULT_PORT,
  DEFAULT_RATE_LIMIT_MAX,
  DEFAULT_RATE_LIMIT_TTL,
} from "../constants/config.constants";
import { Config } from "../interfaces/config.interface";

@Injectable()
export class ConfigService implements Config {
  constructor() {
    config();
  }

  // Server Configuration
  get port(): number {
    return parseInt(process.env.PORT || String(DEFAULT_PORT), 10);
  }

  get nodeEnv(): string {
    return process.env.NODE_ENV || "development";
  }

  get corsOrigin(): string {
    return process.env.CORS_ORIGIN || "*";
  }

  get apiPrefix(): string {
    return process.env.API_PREFIX || "api/v1";
  }

  // Database Configuration
  get dbHost(): string {
    return process.env.DB_HOST || "localhost";
  }

  get dbPort(): number {
    return parseInt(process.env.DB_PORT || "3306", 10);
  }

  get dbUsername(): string {
    return process.env.DB_USERNAME || "root";
  }

  get dbPassword(): string {
    return process.env.DB_PASSWORD || "";
  }

  get dbDatabase(): string {
    return process.env.DB_DATABASE || "html2pdf_gateway";
  }

  get dbSynchronize(): boolean {
    return process.env.DB_SYNCHRONIZE === "true";
  }

  // Redis Configuration
  get redisHost(): string {
    return process.env.REDIS_HOST || "localhost";
  }

  get redisPort(): number {
    return parseInt(process.env.REDIS_PORT || "6379", 10);
  }

  get redisPassword(): string | undefined {
    return process.env.REDIS_PASSWORD || undefined;
  }

  // JWT Configuration
  get jwtSecret(): string {
    return process.env.JWT_SECRET || "your-super-secret-jwt-key";
  }

  get jwtAccessTokenExpiration(): string {
    return process.env.JWT_ACCESS_TOKEN_EXPIRATION || "15m";
  }

  get jwtRefreshTokenExpiration(): string {
    return process.env.JWT_REFRESH_TOKEN_EXPIRATION || "7d";
  }

  // Password Security
  get passwordPepper(): string {
    return process.env.PASSWORD_PEPPER || "default-pepper-change-this";
  }

  // Email Configuration
  get smtpHost(): string {
    return process.env.SMTP_HOST || "localhost";
  }

  get smtpPort(): number {
    return parseInt(process.env.SMTP_PORT || "587", 10);
  }

  get smtpUser(): string {
    return process.env.SMTP_USER || "";
  }

  get smtpPass(): string {
    return process.env.SMTP_PASS || "";
  }

  get smtpFromEmail(): string {
    return process.env.SMTP_FROM_EMAIL || "noreply@html2pdf.com";
  }

  get smtpFromName(): string {
    return process.env.SMTP_FROM_NAME || "HTML2PDF Service";
  }

  // Rate Limiting
  get rateLimitTtl(): number {
    return parseInt(
      process.env.RATE_LIMIT_TTL || String(DEFAULT_RATE_LIMIT_TTL),
      10
    );
  }

  get rateLimitMax(): number {
    return parseInt(
      process.env.RATE_LIMIT_MAX || String(DEFAULT_RATE_LIMIT_MAX),
      10
    );
  }

  // API Key Configuration
  get apiKeyPrefix(): string {
    return process.env.API_KEY_PREFIX || "pdf";
  }

  // Service URLs
  get pdfServiceUrl(): string {
    return process.env.PDF_SERVICE_URL || DEFAULT_PDF_SERVICE_URL;
  }

  get authServiceUrl(): string {
    return process.env.AUTH_SERVICE_URL || DEFAULT_AUTH_SERVICE_URL;
  }

  get frontendUrl(): string {
    return process.env.FRONTEND_URL || "http://localhost:3000";
  }

  // Admin Configuration
  get adminEmail(): string {
    return process.env.ADMIN_EMAIL || "admin@html2pdf.com";
  }

  get adminPassword(): string {
    return process.env.ADMIN_PASSWORD || "admin123";
  }

  // Feature Flags
  get enableEmailVerification(): boolean {
    return process.env.ENABLE_EMAIL_VERIFICATION !== "false";
  }

  get enableSandboxKeys(): boolean {
    return process.env.ENABLE_SANDBOX_KEYS !== "false";
  }

  // Quota Configuration
  get enforceDailyQuota(): boolean {
    return process.env.ENFORCE_DAILY_QUOTA !== "false";
  }

  get enforceMonthlyQuota(): boolean {
    return process.env.ENFORCE_MONTHLY_QUOTA !== "false";
  }

  get maxConcurrentJobs(): number {
    return parseInt(
      process.env.MAX_CONCURRENT_JOBS || String(DEFAULT_MAX_CONCURRENT_JOBS),
      10
    );
  }

  // File Upload Limits
  get maxFileSizeMB(): number {
    return parseInt(process.env.MAX_FILE_SIZE_MB || "100", 10);
  }

  // Logging
  get logLevel(): string {
    return process.env.LOG_LEVEL || "debug";
  }

  // Session
  get sessionSecret(): string {
    return process.env.SESSION_SECRET || "your-session-secret";
  }
}
