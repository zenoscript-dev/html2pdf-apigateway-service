import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, Repository } from "typeorm";
import { ApiKey, Usage, UsageStatus, User } from "../database/entities";

export interface CreateUsageDto {
  userId: string;
  apiKeyId: string;
  endpoint: string;
  method: string;
  status: UsageStatus;
  statusCode?: number;
  fileSizeBytes?: number;
  pagesGenerated?: number;
  processingTimeMs?: number;
  errorMessage?: string;
  requestMetadata?: Record<string, any>;
  responseMetadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class UsageService {
  constructor(
    @InjectRepository(Usage)
    private readonly usageRepository: Repository<Usage>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>
  ) {}

  // Record usage
  async recordUsage(data: CreateUsageDto): Promise<Usage> {
    const today = this.getTodayString();

    const usage = this.usageRepository.create({
      userId: data.userId,
      apiKeyId: data.apiKeyId,
      endpoint: data.endpoint,
      method: data.method,
      status: data.status,
      statusCode: data.statusCode,
      fileSizeBytes: data.fileSizeBytes,
      pagesGenerated: data.pagesGenerated,
      processingTimeMs: data.processingTimeMs,
      date: today,
      errorMessage: data.errorMessage,
      requestMetadata: data.requestMetadata,
      responseMetadata: data.responseMetadata,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });

    return await this.usageRepository.save(usage);
  }

  // Get usage for a user
  async getUserUsage(
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<Usage[]> {
    const query: any = { userId };

    if (startDate && endDate) {
      return await this.usageRepository.find({
        where: {
          userId,
          date: Between(startDate, endDate),
        },
        order: { createdAt: "DESC" },
        take: 1000, // Limit to 1000 records
      });
    }

    return await this.usageRepository.find({
      where: query,
      order: { createdAt: "DESC" },
      take: 1000,
    });
  }

  // Get usage statistics for a user
  async getUserStatistics(
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    totalBytesProcessed: number;
    totalPagesGenerated: number;
    averageProcessingTime: number;
    byEndpoint: Record<string, number>;
    byDate: Array<{ date: string; count: number }>;
  }> {
    let query = this.usageRepository
      .createQueryBuilder("usage")
      .where("usage.userId = :userId", { userId });

    if (startDate && endDate) {
      query = query
        .andWhere("usage.date >= :startDate", { startDate })
        .andWhere("usage.date <= :endDate", { endDate });
    }

    const usageRecords = await query.getMany();

    const totalRequests = usageRecords.length;
    const successfulRequests = usageRecords.filter(
      (u) => u.status === UsageStatus.SUCCESS
    ).length;
    const failedRequests = usageRecords.filter(
      (u) => u.status === UsageStatus.FAILED
    ).length;

    const totalBytesProcessed = usageRecords.reduce(
      (sum, u) => sum + (u.fileSizeBytes || 0),
      0
    );
    const totalPagesGenerated = usageRecords.reduce(
      (sum, u) => sum + (u.pagesGenerated || 0),
      0
    );

    const processingTimes = usageRecords
      .filter((u) => u.processingTimeMs !== null)
      .map((u) => u.processingTimeMs as number);
    const averageProcessingTime =
      processingTimes.length > 0
        ? processingTimes.reduce((sum, t) => sum + t, 0) /
          processingTimes.length
        : 0;

    // Group by endpoint
    const byEndpoint: Record<string, number> = {};
    usageRecords.forEach((u) => {
      byEndpoint[u.endpoint] = (byEndpoint[u.endpoint] || 0) + 1;
    });

    // Group by date
    const byDateMap: Record<string, number> = {};
    usageRecords.forEach((u) => {
      byDateMap[u.date] = (byDateMap[u.date] || 0) + 1;
    });
    const byDate = Object.entries(byDateMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      totalBytesProcessed,
      totalPagesGenerated,
      averageProcessingTime: Math.round(averageProcessingTime),
      byEndpoint,
      byDate,
    };
  }

  // Get usage for a specific API key
  async getApiKeyUsage(apiKeyId: string): Promise<Usage[]> {
    return await this.usageRepository.find({
      where: { apiKeyId },
      order: { createdAt: "DESC" },
      take: 500,
    });
  }

  // Admin - Get all usage
  async getAllUsage(limit: number = 1000): Promise<Usage[]> {
    return await this.usageRepository.find({
      relations: ["user", "apiKey"],
      order: { createdAt: "DESC" },
      take: limit,
    });
  }

  // Admin - Get system-wide statistics
  async getSystemStatistics(
    startDate?: string,
    endDate?: string
  ): Promise<{
    totalUsers: number;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    totalBytesProcessed: number;
    totalPagesGenerated: number;
    averageProcessingTime: number;
    topUsers: Array<{ userId: string; requestCount: number }>;
    byDate: Array<{ date: string; count: number }>;
  }> {
    let query = this.usageRepository.createQueryBuilder("usage");

    if (startDate && endDate) {
      query = query
        .where("usage.date >= :startDate", { startDate })
        .andWhere("usage.date <= :endDate", { endDate });
    }

    const usageRecords = await query.getMany();

    const uniqueUsers = new Set(usageRecords.map((u) => u.userId));
    const totalUsers = uniqueUsers.size;

    const totalRequests = usageRecords.length;
    const successfulRequests = usageRecords.filter(
      (u) => u.status === UsageStatus.SUCCESS
    ).length;
    const failedRequests = usageRecords.filter(
      (u) => u.status === UsageStatus.FAILED
    ).length;

    const totalBytesProcessed = usageRecords.reduce(
      (sum, u) => sum + (u.fileSizeBytes || 0),
      0
    );
    const totalPagesGenerated = usageRecords.reduce(
      (sum, u) => sum + (u.pagesGenerated || 0),
      0
    );

    const processingTimes = usageRecords
      .filter((u) => u.processingTimeMs !== null)
      .map((u) => u.processingTimeMs as number);
    const averageProcessingTime =
      processingTimes.length > 0
        ? processingTimes.reduce((sum, t) => sum + t, 0) /
          processingTimes.length
        : 0;

    // Top users
    const userCounts: Record<string, number> = {};
    usageRecords.forEach((u) => {
      userCounts[u.userId] = (userCounts[u.userId] || 0) + 1;
    });
    const topUsers = Object.entries(userCounts)
      .map(([userId, requestCount]) => ({ userId, requestCount }))
      .sort((a, b) => b.requestCount - a.requestCount)
      .slice(0, 10);

    // Group by date
    const byDateMap: Record<string, number> = {};
    usageRecords.forEach((u) => {
      byDateMap[u.date] = (byDateMap[u.date] || 0) + 1;
    });
    const byDate = Object.entries(byDateMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalUsers,
      totalRequests,
      successfulRequests,
      failedRequests,
      totalBytesProcessed,
      totalPagesGenerated,
      averageProcessingTime: Math.round(averageProcessingTime),
      topUsers,
      byDate,
    };
  }

  // Helper method
  private getTodayString(): string {
    const today = new Date();
    return today.toISOString().split("T")[0]; // YYYY-MM-DD
  }
}
