import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
} from "class-validator";

export class GeneratePdfDto {
  @ApiProperty({
    example: "<html><body><h1>Hello World</h1></body></html>",
    description: "HTML content to convert to PDF",
  })
  @IsString()
  @IsNotEmpty()
  html: string;

  @ApiPropertyOptional({
    example: { format: "A4", margin: { top: "1cm", bottom: "1cm" } },
    description: "PDF generation options",
  })
  @IsObject()
  @IsOptional()
  options?: Record<string, any>;
}

export class GeneratePdfFromUrlDto {
  @ApiProperty({
    example: "https://example.com",
    description: "URL to convert to PDF",
  })
  @IsUrl()
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional({
    example: { format: "A4", margin: { top: "1cm", bottom: "1cm" } },
    description: "PDF generation options",
  })
  @IsObject()
  @IsOptional()
  options?: Record<string, any>;
}
