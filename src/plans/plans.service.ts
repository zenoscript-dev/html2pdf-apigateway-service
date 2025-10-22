import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Plan, User } from "../database/entities";
import { CreatePlanDto, UpdatePlanDto } from "./dto";

@Injectable()
export class PlansService {
  constructor(
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  // Create a new plan
  async create(createPlanDto: CreatePlanDto): Promise<Plan> {
    // Check if plan with same name exists
    const existingPlan = await this.planRepository.findOne({
      where: { name: createPlanDto.name },
    });

    if (existingPlan) {
      throw new ConflictException(
        `Plan with name '${createPlanDto.name}' already exists`
      );
    }

    const plan = this.planRepository.create(createPlanDto);
    return await this.planRepository.save(plan);
  }

  // Get all plans
  async findAll(includeInactive: boolean = false): Promise<Plan[]> {
    if (includeInactive) {
      return await this.planRepository.find({
        order: { price: "ASC", createdAt: "ASC" },
      });
    }

    return await this.planRepository.find({
      where: { isActive: true },
      order: { price: "ASC", createdAt: "ASC" },
    });
  }

  // Get plan by ID
  async findOne(id: string): Promise<Plan> {
    const plan = await this.planRepository.findOne({
      where: { id },
      relations: ["users"],
    });

    if (!plan) {
      throw new NotFoundException(`Plan with ID '${id}' not found`);
    }

    return plan;
  }

  // Get plan by name
  async findByName(name: string): Promise<Plan> {
    const plan = await this.planRepository.findOne({
      where: { name },
    });

    if (!plan) {
      throw new NotFoundException(`Plan with name '${name}' not found`);
    }

    return plan;
  }

  // Update plan
  async update(id: string, updatePlanDto: UpdatePlanDto): Promise<Plan> {
    const plan = await this.findOne(id);

    // If updating name, check for conflicts
    if (updatePlanDto.name && updatePlanDto.name !== plan.name) {
      const existingPlan = await this.planRepository.findOne({
        where: { name: updatePlanDto.name },
      });

      if (existingPlan) {
        throw new ConflictException(
          `Plan with name '${updatePlanDto.name}' already exists`
        );
      }
    }

    Object.assign(plan, updatePlanDto);
    return await this.planRepository.save(plan);
  }

  // Delete plan (soft delete - deactivate)
  async remove(id: string): Promise<{ message: string }> {
    const plan = await this.findOne(id);

    // Check if users are on this plan
    const userCount = await this.userRepository.count({
      where: { planId: id },
    });

    if (userCount > 0) {
      throw new BadRequestException(
        `Cannot delete plan. ${userCount} user(s) are currently on this plan. Please migrate users to another plan first.`
      );
    }

    await this.planRepository.remove(plan);

    return {
      message: `Plan '${plan.name}' deleted successfully`,
    };
  }

  // Deactivate plan (instead of deleting)
  async deactivate(id: string): Promise<Plan> {
    const plan = await this.findOne(id);
    plan.isActive = false;
    return await this.planRepository.save(plan);
  }

  // Activate plan
  async activate(id: string): Promise<Plan> {
    const plan = await this.findOne(id);
    plan.isActive = true;
    return await this.planRepository.save(plan);
  }

  // Get plan statistics
  async getStatistics(id: string): Promise<{
    plan: Plan;
    totalUsers: number;
    activeUsers: number;
  }> {
    const plan = await this.findOne(id);

    const totalUsers = await this.userRepository.count({
      where: { planId: id },
    });

    const activeUsers = await this.userRepository.count({
      where: { planId: id, isActive: true },
    });

    return {
      plan,
      totalUsers,
      activeUsers,
    };
  }

  // Upgrade user to new plan
  async upgradeUserPlan(userId: string, planId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ["plan"],
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const newPlan = await this.findOne(planId);

    if (!newPlan.isActive) {
      throw new BadRequestException("The selected plan is not available");
    }

    user.planId = newPlan.id;
    return await this.userRepository.save(user);
  }

  // Initialize default plans (called on app startup)
  async initializeDefaultPlans(): Promise<void> {
    const plansCount = await this.planRepository.count();

    // Only create default plans if no plans exist
    if (plansCount === 0) {
      const defaultPlans = [
        {
          name: "Free",
          description:
            "Free plan with basic features - perfect for getting started",
          price: 0,
          dailyRequestLimit: 100,
          monthlyRequestLimit: 3000,
          maxFileSizeMB: 5,
          maxPagesPerPdf: 10,
          maxConcurrentJobs: 1,
          webhooksEnabled: false,
          priorityProcessing: false,
          customWatermark: false,
          apiAccess: true,
          sandboxEnabled: true,
        },
        {
          name: "Basic",
          description: "Basic plan for small projects and personal use",
          price: 10,
          dailyRequestLimit: 1000,
          monthlyRequestLimit: 30000,
          maxFileSizeMB: 25,
          maxPagesPerPdf: 100,
          maxConcurrentJobs: 3,
          webhooksEnabled: true,
          priorityProcessing: false,
          customWatermark: false,
          apiAccess: true,
          sandboxEnabled: true,
        },
        {
          name: "Pro",
          description:
            "Professional plan with advanced features for growing businesses",
          price: 50,
          dailyRequestLimit: 10000,
          monthlyRequestLimit: 300000,
          maxFileSizeMB: 100,
          maxPagesPerPdf: 500,
          maxConcurrentJobs: 10,
          webhooksEnabled: true,
          priorityProcessing: true,
          customWatermark: true,
          apiAccess: true,
          sandboxEnabled: true,
        },
        {
          name: "Enterprise",
          description:
            "Enterprise plan with unlimited resources and premium support",
          price: 200,
          dailyRequestLimit: null, // Unlimited
          monthlyRequestLimit: null, // Unlimited
          maxFileSizeMB: 500,
          maxPagesPerPdf: null, // Unlimited
          maxConcurrentJobs: 50,
          webhooksEnabled: true,
          priorityProcessing: true,
          customWatermark: true,
          apiAccess: true,
          sandboxEnabled: true,
        },
      ];

      for (const planData of defaultPlans) {
        const plan = this.planRepository.create(planData);
        await this.planRepository.save(plan);
        console.log(`✓ Created default plan: ${plan.name}`);
      }

      console.log("✅ Default plans initialized successfully");
    }
  }
}
