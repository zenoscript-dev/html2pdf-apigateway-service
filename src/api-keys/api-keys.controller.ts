import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser, Roles } from "../auth/decorators";
import { JwtAuthGuard, RolesGuard } from "../auth/guards";
import { User, UserRole } from "../database/entities";
import { ApiKeysService } from "./api-keys.service";
import { CreateApiKeyDto, UpdateApiKeyDto } from "./dto";

@ApiTags("api-keys")
@Controller("api-keys")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  // User - Create API key
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new API key" })
  @ApiResponse({
    status: 201,
    description: "API key created successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - plan restrictions or sandbox disabled",
  })
  create(
    @Body() createApiKeyDto: CreateApiKeyDto,
    @CurrentUser() user: User,
    @Headers("user-agent") userAgent: string
  ) {
    try {
      return this.apiKeysService.create(user.id, createApiKeyDto, {
        userAgent,
      });
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to create API key",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // User - Get all own API keys
  @Get()
  @ApiOperation({ summary: "Get all your API keys" })
  @ApiResponse({
    status: 200,
    description: "API keys retrieved successfully",
  })
  async findAll(@CurrentUser() user: User) {
    try {
      return await this.apiKeysService.findAllByUser(user.id);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to retrieve API keys",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // User - Get API key statistics
  @Get("statistics")
  @ApiOperation({ summary: "Get API key usage statistics" })
  @ApiResponse({
    status: 200,
    description: "Statistics retrieved successfully",
  })
  async getStatistics(@CurrentUser() user: User) {
    try {
      return await this.apiKeysService.getStatistics(user.id);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to retrieve API key statistics",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // User - Get specific API key
  @Get(":id")
  @ApiOperation({ summary: "Get a specific API key by ID" })
  @ApiResponse({
    status: 200,
    description: "API key found",
  })
  @ApiResponse({
    status: 404,
    description: "API key not found",
  })
  async findOne(@Param("id") id: string, @CurrentUser() user: User) {
    try {
      return await this.apiKeysService.findOne(id, user.id);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to retrieve API key",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // User - Update API key
  @Patch(":id")
  @ApiOperation({ summary: "Update an API key (name, active status)" })
  @ApiResponse({
    status: 200,
    description: "API key updated successfully",
  })
  @ApiResponse({
    status: 404,
    description: "API key not found",
  })
  async update(
    @Param("id") id: string,
    @Body() updateApiKeyDto: UpdateApiKeyDto,
    @CurrentUser() user: User
  ) {
    try {
      return await this.apiKeysService.update(id, user.id, updateApiKeyDto);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to update API key",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // User - Delete API key
  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete an API key" })
  @ApiResponse({
    status: 200,
    description: "API key deleted successfully",
  })
  @ApiResponse({
    status: 404,
    description: "API key not found",
  })
  async remove(@Param("id") id: string, @CurrentUser() user: User) {
    try {
      return await this.apiKeysService.remove(id, user.id);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to delete API key",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Admin - Get all API keys
  @Get("admin/all")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Get all API keys (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "All API keys retrieved successfully",
  })
  async findAllAdmin() {
    try {
      return await this.apiKeysService.findAll();
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to retrieve all API keys",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Admin - Revoke API key
  @Post("admin/:id/revoke")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Revoke an API key (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "API key revoked successfully",
  })
  async revokeApiKey(@Param("id") id: string, @CurrentUser() user: User) {
    try {
      return await this.apiKeysService.revokeApiKey(id, user.id);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to revoke API key",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
