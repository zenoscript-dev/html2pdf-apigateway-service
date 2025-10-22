import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";
import { CreatePlanDto } from "./create-plan.dto";

export class UpdatePlanDto extends PartialType(CreatePlanDto) {
  @ApiPropertyOptional({ example: true, description: "Plan active status" })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
