export interface Config {
  port: number;
  nodeEnv: string;
  corsOrigin: string;
  rateLimitTtl: number;
  rateLimitMax: number;
  maxConcurrentJobs: number;
  pdfServiceUrl: string;
  authServiceUrl: string;
}
