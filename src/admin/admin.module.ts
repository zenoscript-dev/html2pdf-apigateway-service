import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ApiKey, Plan, RefreshToken, Usage, User } from "../database/entities";
import { PlansModule } from "../plans";
import { UsageModule } from "../usage";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, ApiKey, Plan, Usage, RefreshToken]),
    PlansModule,
    UsageModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
