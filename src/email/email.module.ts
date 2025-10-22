import { Module } from "@nestjs/common";
import { ConfigModule } from "../config";
import { EmailService } from "./email.service";

@Module({
  imports: [ConfigModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
