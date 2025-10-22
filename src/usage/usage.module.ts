import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ApiKey, Usage, User } from "../database/entities";
import { UsageController } from "./usage.controller";
import { UsageService } from "./usage.service";

@Module({
  imports: [TypeOrmModule.forFeature([Usage, User, ApiKey])],
  controllers: [UsageController],
  providers: [UsageService],
  exports: [UsageService],
})
export class UsageModule {}
