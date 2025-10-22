import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { AdminModule } from "./admin";
import { ApiKeysModule } from "./api-keys";
import { AuthModule } from "./auth";
import { ConfigModule } from "./config";
import { DatabaseModule } from "./database";
import { EmailModule } from "./email";
import { HealthModule } from "./health";
import { PdfProxyModule } from "./pdf-proxy";
import { PlansModule } from "./plans";
import { QuotaModule } from "./quota";
import { RedisModule } from "./redis";
import { UsageModule } from "./usage";

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    RedisModule,
    EmailModule,
    AuthModule,
    PlansModule,
    ApiKeysModule,
    QuotaModule,
    UsageModule,
    PdfProxyModule,
    AdminModule,
    HealthModule,
    ThrottlerModule.forRoot([
      {
        name: "short",
        ttl: 1000, // 1 second
        limit: 2, // 2 requests per second
      },
      {
        name: "medium",
        ttl: 60000, // 1 minute
        limit: 10, // 10 requests per minute
      },
      {
        name: "long",
        ttl: 3600000, // 1 hour
        limit: 100, // 100 requests per hour
      },
    ]),
  ],
  providers: [
    // No global guards - apply guards explicitly per endpoint
  ],
})
export class AppModule {}
