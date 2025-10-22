import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser, Roles } from "../auth/decorators";
import { JwtAuthGuard, RolesGuard } from "../auth/guards";
import { User, UserRole } from "../database/entities";
import { UsageService } from "./usage.service";

@ApiTags("usage")
@Controller("usage")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  // User - Get own usage
  @Get()
  @ApiOperation({ summary: "Get your usage history" })
  @ApiQuery({ name: "startDate", required: false, example: "2025-01-01" })
  @ApiQuery({ name: "endDate", required: false, example: "2025-01-31" })
  @ApiResponse({ status: 200, description: "Usage retrieved successfully" })
  getUserUsage(
    @CurrentUser() user: User,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string
  ) {
    try {
      return this.usageService.getUserUsage(user.id, startDate, endDate);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to retrieve user usage data",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // User - Get own statistics
  @Get("statistics")
  @ApiOperation({ summary: "Get your usage statistics" })
  @ApiQuery({ name: "startDate", required: false, example: "2025-01-01" })
  @ApiQuery({ name: "endDate", required: false, example: "2025-01-31" })
  @ApiResponse({
    status: 200,
    description: "Statistics retrieved successfully",
  })
  getUserStatistics(
    @CurrentUser() user: User,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string
  ) {
    try {
      return this.usageService.getUserStatistics(user.id, startDate, endDate);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to retrieve user statistics",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // User - Get usage summary
  @Get("summary")
  @ApiOperation({ summary: "Get usage summary for a specific period" })
  @ApiQuery({
    name: "period",
    required: false,
    enum: ["daily", "weekly", "monthly"],
    example: "daily",
    description: "Time period for the summary (defaults to daily)",
  })
  @ApiResponse({
    status: 200,
    description: "Summary retrieved successfully",
  })
  getUserSummary(
    @CurrentUser() user: User,
    @Query("period") period?: "daily" | "weekly" | "monthly"
  ) {
    try {
      // Default to daily if not specified
      const selectedPeriod = period || "daily";

      // Calculate date range based on period
      const endDate = new Date().toISOString().split("T")[0];
      let startDate: string;

      switch (selectedPeriod) {
        case "weekly":
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          startDate = weekAgo.toISOString().split("T")[0];
          break;
        case "monthly":
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          startDate = monthAgo.toISOString().split("T")[0];
          break;
        case "daily":
        default:
          startDate = endDate; // Today only
          break;
      }

      return this.usageService.getUserStatistics(user.id, startDate, endDate);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to retrieve usage summary",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // User - Get usage for specific API key
  @Get("api-key/:apiKeyId")
  @ApiOperation({ summary: "Get usage for a specific API key" })
  @ApiResponse({ status: 200, description: "Usage retrieved successfully" })
  getApiKeyUsage(@Param("apiKeyId") apiKeyId: string) {
    try {
      return this.usageService.getApiKeyUsage(apiKeyId);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to retrieve API key usage data",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Admin - Get all usage
  @Get("admin/all")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Get all usage (Admin only)" })
  @ApiQuery({ name: "limit", required: false, example: 1000 })
  @ApiResponse({ status: 200, description: "Usage retrieved successfully" })
  getAllUsage(@Query("limit") limit?: number) {
    try {
      return this.usageService.getAllUsage(limit);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to retrieve all usage data",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Admin - Get system statistics
  @Get("admin/statistics")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Get system-wide statistics (Admin only)" })
  @ApiQuery({ name: "startDate", required: false, example: "2025-01-01" })
  @ApiQuery({ name: "endDate", required: false, example: "2025-01-31" })
  @ApiResponse({
    status: 200,
    description: "Statistics retrieved successfully",
  })
  getSystemStatistics(
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string
  ) {
    try {
      return this.usageService.getSystemStatistics(startDate, endDate);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to retrieve system statistics",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
