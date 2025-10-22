import { Module, OnModuleInit } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "../config";
import { Plan, User } from "../database/entities";
import { PlansController } from "./plans.controller";
import { PlansService } from "./plans.service";

@Module({
  imports: [TypeOrmModule.forFeature([Plan, User]), ConfigModule],
  controllers: [PlansController],
  providers: [PlansService],
  exports: [PlansService],
})
export class PlansModule implements OnModuleInit {
  constructor(private readonly plansService: PlansService) {}

  async onModuleInit() {
    // Initialize default plans on module initialization
    await this.plansService.initializeDefaultPlans();
  }
}
