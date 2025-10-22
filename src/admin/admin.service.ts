import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  ApiKey,
  ApiKeyType,
  Plan,
  RefreshToken,
  Usage,
  User,
  UserRole,
} from "../database/entities";
import { PlansService } from "../plans/plans.service";
import { UsageService } from "../usage/usage.service";

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
    @InjectRepository(Usage)
    private readonly usageRepository: Repository<Usage>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly plansService: PlansService,
    private readonly usageService: UsageService
  ) {}

  // ==========================================
  // USER MANAGEMENT
  // ==========================================

  // Get all users with pagination
  async getAllUsers(
    page: number = 1,
    limit: number = 50
  ): Promise<{
    users: User[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const [users, total] = await this.userRepository.findAndCount({
      relations: ["plan"],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: "DESC" },
    });

    return {
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Get user by ID (detailed)
  async getUserById(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ["plan", "apiKeys", "usageRecords"],
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }

    return user;
  }

  // Deactivate user
  async deactivateUser(userId: string): Promise<User> {
    const user = await this.getUserById(userId);

    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException("Cannot deactivate admin users");
    }

    user.isActive = false;
    return await this.userRepository.save(user);
  }

  // Activate user
  async activateUser(userId: string): Promise<User> {
    const user = await this.getUserById(userId);
    user.isActive = true;
    return await this.userRepository.save(user);
  }

  // Change user plan
  async changeUserPlan(userId: string, planId: string): Promise<User> {
    return await this.plansService.upgradeUserPlan(userId, planId);
  }

  // Promote user to admin
  async promoteToAdmin(userId: string): Promise<User> {
    const user = await this.getUserById(userId);
    user.role = UserRole.ADMIN;
    return await this.userRepository.save(user);
  }

  // Demote admin to user
  async demoteFromAdmin(userId: string): Promise<User> {
    const user = await this.getUserById(userId);

    if (user.role !== UserRole.ADMIN) {
      throw new BadRequestException("User is not an admin");
    }

    // Check if this is the last admin
    const adminCount = await this.userRepository.count({
      where: { role: UserRole.ADMIN },
    });

    if (adminCount <= 1) {
      throw new BadRequestException(
        "Cannot demote the last admin. Promote another user first."
      );
    }

    user.role = UserRole.USER;
    return await this.userRepository.save(user);
  }

  // Delete user (and all related data)
  async deleteUser(userId: string): Promise<{ message: string }> {
    const user = await this.getUserById(userId);

    if (user.role === UserRole.ADMIN) {
      const adminCount = await this.userRepository.count({
        where: { role: UserRole.ADMIN },
      });

      if (adminCount <= 1) {
        throw new BadRequestException(
          "Cannot delete the last admin. Promote another user first."
        );
      }
    }

    // Delete user (cascade will handle related entities)
    await this.userRepository.remove(user);

    return {
      message: `User '${user.email}' and all related data deleted successfully`,
    };
  }

  // ==========================================
  // SYSTEM ANALYTICS
  // ==========================================

  async getSystemOverview(): Promise<{
    users: {
      total: number;
      active: number;
      inactive: number;
      admins: number;
    };
    plans: {
      total: number;
      active: number;
    };
    apiKeys: {
      total: number;
      live: number;
      test: number;
    };
    usage: {
      totalRequests: number;
      requestsToday: number;
      requestsThisMonth: number;
    };
  }> {
    // User stats
    const totalUsers = await this.userRepository.count();
    const activeUsers = await this.userRepository.count({
      where: { isActive: true },
    });
    const inactiveUsers = totalUsers - activeUsers;
    const admins = await this.userRepository.count({
      where: { role: UserRole.ADMIN },
    });

    // Plan stats
    const totalPlans = await this.planRepository.count();
    const activePlans = await this.planRepository.count({
      where: { isActive: true },
    });

    // API Key stats
    const totalApiKeys = await this.apiKeyRepository.count();
    const liveKeys = await this.apiKeyRepository.count({
      where: { type: ApiKeyType.LIVE },
    });
    const testKeys = await this.apiKeyRepository.count({
      where: { type: ApiKeyType.TEST },
    });

    // Usage stats
    const totalRequests = await this.usageRepository.count();

    const today = new Date().toISOString().split("T")[0];
    const requestsToday = await this.usageRepository.count({
      where: { date: today },
    });

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const monthStart = startOfMonth.toISOString().split("T")[0];

    const requestsThisMonth = await this.usageRepository
      .createQueryBuilder("usage")
      .where("usage.date >= :monthStart", { monthStart })
      .getCount();

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        admins,
      },
      plans: {
        total: totalPlans,
        active: activePlans,
      },
      apiKeys: {
        total: totalApiKeys,
        live: liveKeys,
        test: testKeys,
      },
      usage: {
        totalRequests,
        requestsToday,
        requestsThisMonth,
      },
    };
  }

  // Get detailed system statistics
  async getDetailedStatistics(
    startDate?: string,
    endDate?: string
  ): Promise<any> {
    return await this.usageService.getSystemStatistics(startDate, endDate);
  }

  // Get user growth over time
  async getUserGrowth(days: number = 30): Promise<
    Array<{
      date: string;
      newUsers: number;
      totalUsers: number;
    }>
  > {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const users = await this.userRepository
      .createQueryBuilder("user")
      .where("user.createdAt >= :startDate", { startDate })
      .orderBy("user.createdAt", "ASC")
      .getMany();

    // Group by date
    const growthMap: Record<string, number> = {};
    users.forEach((user) => {
      const date = user.createdAt.toISOString().split("T")[0];
      growthMap[date] = (growthMap[date] || 0) + 1;
    });

    // Calculate cumulative total
    let totalUsers = await this.userRepository
      .createQueryBuilder("user")
      .where("user.createdAt < :startDate", { startDate })
      .getCount();

    const result: Array<{
      date: string;
      newUsers: number;
      totalUsers: number;
    }> = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      const newUsers = growthMap[dateStr] || 0;
      totalUsers += newUsers;

      result.push({
        date: dateStr,
        newUsers,
        totalUsers,
      });
    }

    return result;
  }

  // Get plan distribution
  async getPlanDistribution(): Promise<
    Array<{
      planName: string;
      userCount: number;
      percentage: number;
    }>
  > {
    const plans = await this.planRepository.find();
    const totalUsers = await this.userRepository.count();

    const distribution = await Promise.all(
      plans.map(async (plan) => {
        const userCount = await this.userRepository.count({
          where: { planId: plan.id },
        });

        return {
          planName: plan.name,
          userCount,
          percentage: totalUsers > 0 ? (userCount / totalUsers) * 100 : 0,
        };
      })
    );

    return distribution.sort((a, b) => b.userCount - a.userCount);
  }

  // ==========================================
  // BULK OPERATIONS
  // ==========================================

  // Bulk deactivate users
  async bulkDeactivateUsers(userIds: string[]): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const userId of userIds) {
      try {
        await this.deactivateUser(userId);
        success++;
      } catch (error) {
        failed++;
        errors.push(`${userId}: ${error.message}`);
      }
    }

    return { success, failed, errors };
  }

  // Bulk change plan
  async bulkChangePlan(
    userIds: string[],
    planId: string
  ): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    // Verify plan exists
    await this.plansService.findOne(planId);

    for (const userId of userIds) {
      try {
        await this.changeUserPlan(userId, planId);
        success++;
      } catch (error) {
        failed++;
        errors.push(`${userId}: ${error.message}`);
      }
    }

    return { success, failed, errors };
  }
}
