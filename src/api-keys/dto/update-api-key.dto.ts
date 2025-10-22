import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class UpdateApiKeyDto {
  @ApiPropertyOptional({
    example: "Updated Key Name",
    description: "Update the name of the API key",
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    example: true,
    description: "Enable or disable the API key",
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
