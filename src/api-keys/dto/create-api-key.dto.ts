import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from "class-validator";
import { ApiKeyType } from "../../database/entities";

export class CreateApiKeyDto {
  @ApiPropertyOptional({
    example: "My Production API Key",
    description: "Optional name for the API key",
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    example: "live",
    enum: ApiKeyType,
    description: "API key type: live or test",
  })
  @IsEnum(ApiKeyType)
  type: ApiKeyType;

  @ApiPropertyOptional({
    example: ["pdf.generate", "pdf.download"],
    description: "Array of permissions for this key",
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];

  @ApiPropertyOptional({
    example: ["example.com", "*.myapp.com"],
    description: "Optional domain whitelist for this key",
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedDomains?: string[];

  @ApiPropertyOptional({
    example: "2024-12-31T23:59:59Z",
    description: "Optional expiration date for this key",
  })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @ApiPropertyOptional({
    description: "Additional metadata for this key",
  })
  @IsOptional()
  metadata?: Record<string, any>;
}
