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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Roles } from "../auth/decorators";
import { RolesGuard } from "../auth/guards";
import { UserRole } from "../database/entities";
import { AdminService } from "./admin.service";

@ApiTags("admin")
@Controller("admin")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ==========================================
  // USER MANAGEMENT
  // ==========================================

  @Get("users")
  @ApiOperation({ summary: "Get all users (Admin only)" })
  @ApiQuery({ name: "page", required: false, example: 1 })
  @ApiQuery({ name: "limit", required: false, example: 50 })
  @ApiResponse({ status: 200, description: "Users retrieved successfully" })
  getAllUsers(@Query("page") page?: number, @Query("limit") limit?: number) {
    try {
      return this.adminService.getAllUsers(page, limit);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to retrieve all users",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get("users/:userId")
  @ApiOperation({ summary: "Get user details by ID (Admin only)" })
  @ApiResponse({ status: 200, description: "User found" })
  @ApiResponse({ status: 404, description: "User not found" })
  getUserById(@Param("userId") userId: string) {
    try {
      return this.adminService.getUserById(userId);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to retrieve user details",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Patch("users/:userId/deactivate")
  @ApiOperation({ summary: "Deactivate a user (Admin only)" })
  @ApiResponse({ status: 200, description: "User deactivated successfully" })
  deactivateUser(@Param("userId") userId: string) {
    try {
      return this.adminService.deactivateUser(userId);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to deactivate user",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Patch("users/:userId/activate")
  @ApiOperation({ summary: "Activate a user (Admin only)" })
  @ApiResponse({ status: 200, description: "User activated successfully" })
  activateUser(@Param("userId") userId: string) {
    try {
      return this.adminService.activateUser(userId);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to activate user",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Patch("users/:userId/plan/:planId")
  @ApiOperation({ summary: "Change user plan (Admin only)" })
  @ApiResponse({ status: 200, description: "Plan changed successfully" })
  changeUserPlan(
    @Param("userId") userId: string,
    @Param("planId") planId: string
  ) {
    try {
      return this.adminService.changeUserPlan(userId, planId);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to change user plan",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Patch("users/:userId/promote")
  @ApiOperation({ summary: "Promote user to admin (Admin only)" })
  @ApiResponse({ status: 200, description: "User promoted successfully" })
  promoteToAdmin(@Param("userId") userId: string) {
    try {
      return this.adminService.promoteToAdmin(userId);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to promote user to admin",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Patch("users/:userId/demote")
  @ApiOperation({ summary: "Demote admin to user (Admin only)" })
  @ApiResponse({ status: 200, description: "Admin demoted successfully" })
  @ApiResponse({
    status: 400,
    description: "Cannot demote the last admin",
  })
  demoteFromAdmin(@Param("userId") userId: string) {
    try {
      return this.adminService.demoteFromAdmin(userId);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to demote admin to user",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete("users/:userId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete user and all related data (Admin only)" })
  @ApiResponse({ status: 200, description: "User deleted successfully" })
  @ApiResponse({
    status: 400,
    description: "Cannot delete the last admin",
  })
  deleteUser(@Param("userId") userId: string) {
    try {
      return this.adminService.deleteUser(userId);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to delete user",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ==========================================
  // SYSTEM ANALYTICS
  // ==========================================

  @Get("analytics/overview")
  @ApiOperation({ summary: "Get system overview (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "System overview retrieved successfully",
  })
  getSystemOverview() {
    try {
      return this.adminService.getSystemOverview();
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to retrieve system overview",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get("analytics/statistics")
  @ApiOperation({ summary: "Get detailed system statistics (Admin only)" })
  @ApiQuery({ name: "startDate", required: false, example: "2025-01-01" })
  @ApiQuery({ name: "endDate", required: false, example: "2025-01-31" })
  @ApiResponse({
    status: 200,
    description: "Statistics retrieved successfully",
  })
  getDetailedStatistics(
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string
  ) {
    try {
      return this.adminService.getDetailedStatistics(startDate, endDate);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to retrieve detailed statistics",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get("analytics/user-growth")
  @ApiOperation({ summary: "Get user growth over time (Admin only)" })
  @ApiQuery({ name: "days", required: false, example: 30 })
  @ApiResponse({
    status: 200,
    description: "User growth data retrieved successfully",
  })
  getUserGrowth(@Query("days") days?: number) {
    try {
      return this.adminService.getUserGrowth(days);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to retrieve user growth data",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get("analytics/plan-distribution")
  @ApiOperation({ summary: "Get plan distribution (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "Plan distribution retrieved successfully",
  })
  getPlanDistribution() {
    try {
      return this.adminService.getPlanDistribution();
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to retrieve plan distribution data",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ==========================================
  // BULK OPERATIONS
  // ==========================================

  @Post("bulk/deactivate")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Bulk deactivate users (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "Bulk operation completed",
  })
  bulkDeactivateUsers(@Body() body: { userIds: string[] }) {
    try {
      return this.adminService.bulkDeactivateUsers(body.userIds);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to bulk deactivate users",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post("bulk/change-plan")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Bulk change user plans (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "Bulk operation completed",
  })
  bulkChangePlan(@Body() body: { userIds: string[]; planId: string }) {
    try {
      return this.adminService.bulkChangePlan(body.userIds, body.planId);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to bulk change user plans",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
