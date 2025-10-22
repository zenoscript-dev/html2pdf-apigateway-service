import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser, Public, Roles } from "../auth/decorators";
import { RolesGuard } from "../auth/guards";
import { User, UserRole } from "../database/entities";
import { CreatePlanDto, UpdatePlanDto } from "./dto";
import { PlansService } from "./plans.service";

@ApiTags("plans")
@Controller("plans")
@ApiBearerAuth()
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  // Public endpoint - Get all active plans
  @Public()
  @Get()
  @ApiOperation({ summary: "Get all active plans" })
  @ApiResponse({ status: 200, description: "Plans retrieved successfully" })
  findAll(@Query("includeInactive") includeInactive?: string) {
    try {
      const showInactive = includeInactive === "true";
      return this.plansService.findAll(showInactive);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to retrieve plans",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Public endpoint - Get plan by ID
  @Public()
  @Get(":id")
  @ApiOperation({ summary: "Get plan by ID" })
  @ApiResponse({ status: 200, description: "Plan found" })
  @ApiResponse({ status: 404, description: "Plan not found" })
  findOne(@Param("id") id: string) {
    try {
      return this.plansService.findOne(id);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to retrieve plan details",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Admin only - Create plan
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Create a new plan (Admin only)" })
  @ApiResponse({ status: 201, description: "Plan created successfully" })
  @ApiResponse({ status: 409, description: "Plan already exists" })
  create(@Body() createPlanDto: CreatePlanDto) {
    try {
      return this.plansService.create(createPlanDto);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to create plan",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Admin only - Update plan
  @Patch(":id")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Update a plan (Admin only)" })
  @ApiResponse({ status: 200, description: "Plan updated successfully" })
  @ApiResponse({ status: 404, description: "Plan not found" })
  update(@Param("id") id: string, @Body() updatePlanDto: UpdatePlanDto) {
    try {
      return this.plansService.update(id, updatePlanDto);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to update plan",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Admin only - Delete plan
  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete a plan (Admin only)" })
  @ApiResponse({ status: 200, description: "Plan deleted successfully" })
  @ApiResponse({
    status: 400,
    description: "Cannot delete plan with active users",
  })
  remove(@Param("id") id: string) {
    try {
      return this.plansService.remove(id);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to delete plan",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Admin only - Deactivate plan
  @Post(":id/deactivate")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Deactivate a plan (Admin only)" })
  @ApiResponse({ status: 200, description: "Plan deactivated successfully" })
  deactivate(@Param("id") id: string) {
    try {
      return this.plansService.deactivate(id);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to deactivate plan",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Admin only - Activate plan
  @Post(":id/activate")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Activate a plan (Admin only)" })
  @ApiResponse({ status: 200, description: "Plan activated successfully" })
  activate(@Param("id") id: string) {
    try {
      return this.plansService.activate(id);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to activate plan",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Admin only - Get plan statistics
  @Get(":id/statistics")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Get plan statistics (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "Statistics retrieved successfully",
  })
  getStatistics(@Param("id") id: string) {
    try {
      return this.plansService.getStatistics(id);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to retrieve plan statistics",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // User - Upgrade own plan
  @Post("upgrade/:planId")
  @ApiOperation({ summary: "Upgrade to a new plan" })
  @ApiResponse({ status: 200, description: "Plan upgraded successfully" })
  @ApiResponse({ status: 404, description: "Plan not found" })
  upgradePlan(@Param("planId") planId: string, @CurrentUser() user: User) {
    try {
      return this.plansService.upgradeUserPlan(user.id, planId);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to upgrade user plan",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
