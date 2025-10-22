import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ApiKeysModule } from "../api-keys";
import { ConfigModule } from "../config";
import { ApiKey, User } from "../database/entities";
import { QuotaModule } from "../quota";
import { UsageModule } from "../usage";
import { PdfProxyController } from "./pdf-proxy.controller";
import { PdfProxyService } from "./pdf-proxy.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, ApiKey]),
    ConfigModule,
    ApiKeysModule,
    QuotaModule,
    UsageModule,
  ],
  controllers: [PdfProxyController],
  providers: [PdfProxyService],
  exports: [PdfProxyService],
})
export class PdfProxyModule {}
