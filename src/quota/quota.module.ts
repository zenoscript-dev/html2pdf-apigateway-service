import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "../config";
import { Usage, User } from "../database/entities";
import { RedisModule } from "../redis";
import { QuotaService } from "./quota.service";

@Module({
  imports: [TypeOrmModule.forFeature([Usage, User]), RedisModule, ConfigModule],
  providers: [QuotaService],
  exports: [QuotaService],
})
export class QuotaModule {}
