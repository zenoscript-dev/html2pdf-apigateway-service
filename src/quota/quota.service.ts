import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "../config/services/config.service";
import { ApiKeyType, Usage, User } from "../database/entities";
import { RedisService } from "../redis/redis.service";

export interface QuotaCheck {
  allowed: boolean;
  reason?: string;
  quotaInfo: {
    dailyUsed: number;
    dailyLimit: number | null;
    monthlyUsed: number;
    monthlyLimit: number | null;
    remainingDaily: number | null;
    remainingMonthly: number | null;
  };
}

@Injectable()
export class QuotaService {
  constructor(
    @InjectRepository(Usage)
    private readonly usageRepository: Repository<Usage>,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService
  ) {}

  // Check if user has exceeded their quotas
  async checkQuota(
    userId: string,
    apiKeyType: ApiKeyType,
    user: User
  ): Promise<QuotaCheck> {
    // Test/sandbox keys don't count toward quota
    if (apiKeyType === ApiKeyType.TEST) {
      return {
        allowed: true,
        quotaInfo: {
          dailyUsed: 0,
          dailyLimit: null,
          monthlyUsed: 0,
          monthlyLimit: null,
          remainingDaily: null,
          remainingMonthly: null,
        },
      };
    }

    const plan = user.plan;

    // Get current usage from Redis (fast) or fallback to DB
    const dailyUsage = await this.getDailyUsage(userId);
    const monthlyUsage = await this.getMonthlyUsage(userId);

    // Check daily quota
    if (
      this.configService.enforceDailyQuota &&
      plan.dailyRequestLimit !== null
    ) {
      if (dailyUsage >= plan.dailyRequestLimit) {
        return {
          allowed: false,
          reason: `Daily quota exceeded. Limit: ${plan.dailyRequestLimit} requests per day.`,
          quotaInfo: {
            dailyUsed: dailyUsage,
            dailyLimit: plan.dailyRequestLimit,
            monthlyUsed: monthlyUsage,
            monthlyLimit: plan.monthlyRequestLimit,
            remainingDaily: 0,
            remainingMonthly: plan.monthlyRequestLimit
              ? plan.monthlyRequestLimit - monthlyUsage
              : null,
          },
        };
      }
    }

    // Check monthly quota
    if (
      this.configService.enforceMonthlyQuota &&
      plan.monthlyRequestLimit !== null
    ) {
      if (monthlyUsage >= plan.monthlyRequestLimit) {
        return {
          allowed: false,
          reason: `Monthly quota exceeded. Limit: ${plan.monthlyRequestLimit} requests per month.`,
          quotaInfo: {
            dailyUsed: dailyUsage,
            dailyLimit: plan.dailyRequestLimit,
            monthlyUsed: monthlyUsage,
            monthlyLimit: plan.monthlyRequestLimit,
            remainingDaily: plan.dailyRequestLimit
              ? plan.dailyRequestLimit - dailyUsage
              : null,
            remainingMonthly: 0,
          },
        };
      }
    }

    // Quota check passed
    return {
      allowed: true,
      quotaInfo: {
        dailyUsed: dailyUsage,
        dailyLimit: plan.dailyRequestLimit,
        monthlyUsed: monthlyUsage,
        monthlyLimit: plan.monthlyRequestLimit,
        remainingDaily:
          plan.dailyRequestLimit !== null
            ? plan.dailyRequestLimit - dailyUsage
            : null,
        remainingMonthly:
          plan.monthlyRequestLimit !== null
            ? plan.monthlyRequestLimit - monthlyUsage
            : null,
      },
    };
  }

  // Increment usage counters
  async incrementUsage(userId: string): Promise<void> {
    const today = this.getTodayString();
    const currentMonth = this.getCurrentMonthString();

    // Increment daily counter in Redis
    const dailyKey = `quota:daily:${userId}:${today}`;
    await this.redisService.incrementCounter(dailyKey, 86400); // Expire after 24 hours

    // Increment monthly counter in Redis
    const monthlyKey = `quota:monthly:${userId}:${currentMonth}`;
    const daysInMonth = this.getDaysInCurrentMonth();
    await this.redisService.incrementCounter(monthlyKey, daysInMonth * 86400);
  }

  // Get daily usage
  async getDailyUsage(userId: string): Promise<number> {
    const today = this.getTodayString();
    const key = `quota:daily:${userId}:${today}`;

    const cached = await this.redisService.getCounter(key);
    if (cached > 0) {
      return cached;
    }

    // Fallback to database if not in Redis
    const count = await this.usageRepository.count({
      where: {
        userId,
        date: today,
      },
    });

    // Cache the result
    if (count > 0) {
      await this.redisService.set(key, count.toString(), 86400);
    }

    return count;
  }

  // Get monthly usage
  async getMonthlyUsage(userId: string): Promise<number> {
    const currentMonth = this.getCurrentMonthString();
    const key = `quota:monthly:${userId}:${currentMonth}`;

    const cached = await this.redisService.getCounter(key);
    if (cached > 0) {
      return cached;
    }

    // Fallback to database if not in Redis
    const startDate = `${currentMonth}-01`;
    const endDate = this.getEndOfMonthString();

    const count = await this.usageRepository
      .createQueryBuilder("usage")
      .where("usage.userId = :userId", { userId })
      .andWhere("usage.date >= :startDate", { startDate })
      .andWhere("usage.date <= :endDate", { endDate })
      .getCount();

    // Cache the result
    if (count > 0) {
      const daysInMonth = this.getDaysInCurrentMonth();
      await this.redisService.set(key, count.toString(), daysInMonth * 86400);
    }

    return count;
  }

  // Get user's current quota status
  async getQuotaStatus(
    userId: string,
    user: User
  ): Promise<{
    plan: {
      name: string;
      dailyLimit: number | null;
      monthlyLimit: number | null;
    };
    usage: {
      dailyUsed: number;
      monthlyUsed: number;
      remainingDaily: number | null;
      remainingMonthly: number | null;
    };
    percentages: {
      dailyPercentage: number | null;
      monthlyPercentage: number | null;
    };
  }> {
    const dailyUsage = await this.getDailyUsage(userId);
    const monthlyUsage = await this.getMonthlyUsage(userId);

    const plan = user.plan;

    const remainingDaily =
      plan.dailyRequestLimit !== null
        ? Math.max(0, plan.dailyRequestLimit - dailyUsage)
        : null;

    const remainingMonthly =
      plan.monthlyRequestLimit !== null
        ? Math.max(0, plan.monthlyRequestLimit - monthlyUsage)
        : null;

    const dailyPercentage =
      plan.dailyRequestLimit !== null
        ? Math.min(100, (dailyUsage / plan.dailyRequestLimit) * 100)
        : null;

    const monthlyPercentage =
      plan.monthlyRequestLimit !== null
        ? Math.min(100, (monthlyUsage / plan.monthlyRequestLimit) * 100)
        : null;

    return {
      plan: {
        name: plan.name,
        dailyLimit: plan.dailyRequestLimit,
        monthlyLimit: plan.monthlyRequestLimit,
      },
      usage: {
        dailyUsed: dailyUsage,
        monthlyUsed: monthlyUsage,
        remainingDaily,
        remainingMonthly,
      },
      percentages: {
        dailyPercentage,
        monthlyPercentage,
      },
    };
  }

  // Helper methods
  private getTodayString(): string {
    const today = new Date();
    return today.toISOString().split("T")[0]; // YYYY-MM-DD
  }

  private getCurrentMonthString(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }

  private getEndOfMonthString(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const monthStr = String(month + 1).padStart(2, "0");
    return `${year}-${monthStr}-${lastDay}`;
  }

  private getDaysInCurrentMonth(): number {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    return new Date(year, month + 1, 0).getDate();
  }
}
