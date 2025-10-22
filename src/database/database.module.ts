import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "../config";
import { ConfigService } from "../config/services/config.service";
import {
  ApiKey,
  EmailVerification,
  PasswordReset,
  Plan,
  RefreshToken,
  Usage,
  User,
} from "./entities";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: "mysql",
        host: configService.dbHost,
        port: configService.dbPort,
        username: configService.dbUsername,
        password: configService.dbPassword,
        database: configService.dbDatabase,
        entities: [
          User,
          Plan,
          ApiKey,
          Usage,
          RefreshToken,
          EmailVerification,
          PasswordReset,
        ],
        synchronize: configService.dbSynchronize,
        logging: configService.nodeEnv === "development",
        timezone: "Z", // Use UTC
        charset: "utf8mb4",
      }),
    }),
  ],
})
export class DatabaseModule {}
