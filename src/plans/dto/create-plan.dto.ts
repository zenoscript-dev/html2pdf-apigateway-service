import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class CreatePlanDto {
  @ApiProperty({ example: "Pro", description: "Plan name" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: "Professional plan with advanced features",
    description: "Plan description",
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 50, description: "Plan price in USD" })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({
    example: 1000,
    description: "Daily request limit (null for unlimited)",
  })
  @IsNumber()
  @IsOptional()
  dailyRequestLimit?: number | null;

  @ApiPropertyOptional({
    example: 30000,
    description: "Monthly request limit (null for unlimited)",
  })
  @IsNumber()
  @IsOptional()
  monthlyRequestLimit?: number | null;

  @ApiProperty({ example: 25, description: "Max file size in MB" })
  @IsNumber()
  @Min(1)
  maxFileSizeMB: number;

  @ApiPropertyOptional({
    example: 100,
    description: "Max pages per PDF (null for unlimited)",
  })
  @IsNumber()
  @IsOptional()
  maxPagesPerPdf?: number | null;

  @ApiProperty({ example: 5, description: "Max concurrent jobs" })
  @IsNumber()
  @Min(1)
  maxConcurrentJobs: number;

  @ApiProperty({ example: true, description: "Webhooks enabled" })
  @IsBoolean()
  webhooksEnabled: boolean;

  @ApiProperty({ example: true, description: "Priority processing enabled" })
  @IsBoolean()
  priorityProcessing: boolean;

  @ApiProperty({ example: false, description: "Custom watermark allowed" })
  @IsBoolean()
  @IsOptional()
  customWatermark?: boolean;

  @ApiProperty({ example: true, description: "API access enabled" })
  @IsBoolean()
  @IsOptional()
  apiAccess?: boolean;

  @ApiProperty({ example: true, description: "Sandbox keys enabled" })
  @IsBoolean()
  @IsOptional()
  sandboxEnabled?: boolean;

  @ApiPropertyOptional({
    example: { customDomain: true, analytics: true },
    description: "Additional features (flexible JSON)",
  })
  @IsObject()
  @IsOptional()
  features?: Record<string, any>;

  @ApiPropertyOptional({
    example: { displayOrder: 1 },
    description: "Additional metadata (flexible JSON)",
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
