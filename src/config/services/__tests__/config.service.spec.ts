import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "../config.service";

describe("ConfigService", () => {
  let service: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConfigService],
    }).compile();

    service = module.get<ConfigService>(ConfigService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("port", () => {
    it("should return default port when not set", () => {
      delete process.env.PORT;
      expect(service.port).toBe(6100);
    });

    it("should return configured port", () => {
      process.env.PORT = "3000";
      expect(service.port).toBe(3000);
    });
  });

  describe("nodeEnv", () => {
    it("should return default environment when not set", () => {
      delete process.env.NODE_ENV;
      expect(service.nodeEnv).toBe("development");
    });

    it("should return configured environment", () => {
      process.env.NODE_ENV = "production";
      expect(service.nodeEnv).toBe("production");
    });
  });

  describe("pdfServiceUrl", () => {
    it("should return default URL when not set", () => {
      delete process.env.PDF_SERVICE_URL;
      expect(service.pdfServiceUrl).toBe("http://localhost:5000");
    });

    it("should return configured URL", () => {
      process.env.PDF_SERVICE_URL = "http://pdf-service:5000";
      expect(service.pdfServiceUrl).toBe("http://pdf-service:5000");
    });
  });

  describe("authServiceUrl", () => {
    it("should return default URL when not set", () => {
      delete process.env.AUTH_SERVICE_URL;
      expect(service.authServiceUrl).toBe("http://localhost:5001");
    });

    it("should return configured URL", () => {
      process.env.AUTH_SERVICE_URL = "http://auth-service:5001";
      expect(service.authServiceUrl).toBe("http://auth-service:5001");
    });
  });

  describe("corsOrigin", () => {
    it("should return default origin when not set", () => {
      delete process.env.CORS_ORIGIN;
      expect(service.corsOrigin).toBe("*");
    });

    it("should return configured origin", () => {
      process.env.CORS_ORIGIN = "https://example.com";
      expect(service.corsOrigin).toBe("https://example.com");
    });
  });

  describe("rateLimitTtl", () => {
    it("should return default TTL when not set", () => {
      delete process.env.RATE_LIMIT_TTL;
      expect(service.rateLimitTtl).toBe(60); // 1 minute
    });

    it("should return configured TTL", () => {
      process.env.RATE_LIMIT_TTL = "120";
      expect(service.rateLimitTtl).toBe(120);
    });
  });

  describe("rateLimitMax", () => {
    it("should return default limit when not set", () => {
      delete process.env.RATE_LIMIT_MAX;
      expect(service.rateLimitMax).toBe(10); // 10 requests
    });

    it("should return configured limit", () => {
      process.env.RATE_LIMIT_MAX = "20";
      expect(service.rateLimitMax).toBe(20);
    });
  });

  describe("maxConcurrentJobs", () => {
    it("should return default limit when not set", () => {
      delete process.env.MAX_CONCURRENT_JOBS;
      expect(service.maxConcurrentJobs).toBe(5);
    });

    it("should return configured limit", () => {
      process.env.MAX_CONCURRENT_JOBS = "10";
      expect(service.maxConcurrentJobs).toBe(10);
    });
  });
});
