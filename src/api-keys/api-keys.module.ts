import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "../config";
import { ApiKey, User } from "../database/entities";
import { ApiKeysController } from "./api-keys.controller";
import { ApiKeysService } from "./api-keys.service";
import { EncryptionService } from "./encryption.service";
import { ApiKeyIdGuard } from "./guards/api-key-id.guard";
import { ApiKeyGuard } from "./guards/api-key.guard";

@Module({
  imports: [TypeOrmModule.forFeature([ApiKey, User]), ConfigModule],
  controllers: [ApiKeysController],
  providers: [ApiKeysService, EncryptionService, ApiKeyGuard, ApiKeyIdGuard],
  exports: [ApiKeysService, EncryptionService, ApiKeyGuard, ApiKeyIdGuard],
})
export class ApiKeysModule {}
