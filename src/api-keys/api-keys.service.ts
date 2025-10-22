import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as crypto from "crypto";
import { Repository } from "typeorm";
import { ConfigService } from "../config/services/config.service";
import { ApiKey, ApiKeyType, User } from "../database/entities";
import { CreateApiKeyDto, UpdateApiKeyDto } from "./dto";
import { EncryptionService } from "./encryption.service";

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly encryptionService: EncryptionService
  ) {}

  // Generate a random API key with prefix
  private generateApiKey(type: ApiKeyType): {
    key: string;
    prefix: string;
    mask: string;
  } {
    const prefix = this.configService.apiKeyPrefix; // e.g., "pdf"
    const typeStr = type === ApiKeyType.LIVE ? "live" : "test";
    const randomPart = crypto.randomBytes(32).toString("hex");

    const key = `${prefix}_${typeStr}_${randomPart}`;
    const displayPrefix = `${prefix}_${typeStr}_...${randomPart.slice(-8)}`;
    const mask = this.encryptionService.maskKey(key, 8);

    return {
      key,
      prefix: displayPrefix,
      mask,
    };
  }

  // Hash API key for storage
  private hashApiKey(key: string): string {
    return crypto.createHash("sha256").update(key).digest("hex");
  }

  // Create a new API key with enhanced security
  async create(
    userId: string,
    createApiKeyDto: CreateApiKeyDto,
    requestMetadata?: {
      userAgent?: string;
    }
  ): Promise<{
    message: string;
    apiKey: string;
    keyPrefix: string;
    keyMask: string;
    type: ApiKeyType;
    warning: string;
    expiresAt?: Date | null;
  }> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ["plan"],
      });

      if (!user) {
        throw new NotFoundException("User not found");
      }

      // Check if sandbox keys are enabled
      if (
        createApiKeyDto.type === ApiKeyType.TEST &&
        !this.configService.enableSandboxKeys
      ) {
        throw new BadRequestException("Sandbox API keys are not enabled");
      }

      // Check plan restrictions
      if (
        !user.plan.sandboxEnabled &&
        createApiKeyDto.type === ApiKeyType.TEST
      ) {
        throw new BadRequestException(
          "Your plan does not support sandbox API keys"
        );
      }

      // Generate API key with enhanced security
      const { key, prefix, mask } = this.generateApiKey(createApiKeyDto.type);
      const keyHash = this.encryptionService.hashKey(key);

      // Encrypt the key for potential recovery (optional)
      const encryptedKey = this.encryptionService.encrypt(key);

      // Parse expiration date if provided
      const expiresAt = createApiKeyDto.expiresAt
        ? new Date(createApiKeyDto.expiresAt)
        : null;

      // Create API key entity with enhanced security features
      const apiKey = this.apiKeyRepository.create({
        keyHash,
        encryptedKey, // Store encrypted version
        keyPrefix: prefix,
        keyMask: mask,
        type: createApiKeyDto.type,
        name: createApiKeyDto.name,
        userId,
        permissions: createApiKeyDto.permissions || [],
        allowedDomains: createApiKeyDto.allowedDomains || [],
        expiresAt: expiresAt || undefined,
        isActive: true,
        isRevoked: false,
        securityMetadata: {
          userAgent: requestMetadata?.userAgent,
          rotationCount: 0,
        },
        metadata: createApiKeyDto.metadata || {},
      });

      await this.apiKeyRepository.save(apiKey);

      return {
        message:
          "API key created successfully. Please save it securely - it will not be shown again.",
        apiKey: key, // Show full key only once
        keyPrefix: prefix,
        keyMask: mask,
        type: createApiKeyDto.type,
        expiresAt,
        warning:
          "⚠️  CRITICAL: Save this key now! For security reasons, you will not be able to view the full key again. Only the masked version will be shown in the management interface.",
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new HttpException(
        error.message || "Failed to create API key",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Get all API keys for a user (showing only masked versions)
  async findAllByUser(userId: string): Promise<ApiKey[]> {
    try {
      const keys = await this.apiKeyRepository.find({
        where: { userId, isRevoked: false },
        order: { createdAt: "DESC" },
      });

      // Return keys with masked versions only - never expose the full key
      return keys.map((key) => ({
        ...key,
        // Remove sensitive data
        encryptedKey: null,
        keyHash: "",
        // Show only masked version
        keyPrefix: key.keyMask,
      })) as unknown as ApiKey[];
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to retrieve API keys",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Get a specific API key by ID
  async findOne(id: string, userId: string): Promise<ApiKey> {
    try {
      const apiKey = await this.apiKeyRepository.findOne({
        where: { id, userId },
      });

      if (!apiKey) {
        throw new NotFoundException("API key not found");
      }

      return apiKey;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new HttpException(
        error.message || "Failed to retrieve API key",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Update API key (name, active status)
  async update(
    id: string,
    userId: string,
    updateApiKeyDto: UpdateApiKeyDto
  ): Promise<ApiKey> {
    try {
      const apiKey = await this.findOne(id, userId);

      if (updateApiKeyDto.name !== undefined) {
        apiKey.name = updateApiKeyDto.name;
      }

      if (updateApiKeyDto.isActive !== undefined) {
        apiKey.isActive = updateApiKeyDto.isActive;
      }

      return await this.apiKeyRepository.save(apiKey);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new HttpException(
        error.message || "Failed to update API key",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Delete API key
  async remove(id: string, userId: string): Promise<{ message: string }> {
    try {
      const apiKey = await this.findOne(id, userId);
      await this.apiKeyRepository.remove(apiKey);

      return {
        message: "API key deleted successfully",
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new HttpException(
        error.message || "Failed to delete API key",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Validate API key with enhanced security checks
  async validateApiKey(
    key: string,
    requestMetadata?: {
      userAgent?: string;
    }
  ): Promise<{
    isValid: boolean;
    user?: User;
    apiKey?: ApiKey;
    reason?: string;
  }> {
    try {
      // Check key format
      if (!key) {
        return {
          isValid: false,
          reason: "Invalid API key format",
        };
      }

      // Validate API key format: prefix_type_randomPart
      const expectedPrefix = this.configService.apiKeyPrefix;
      const keyFormatRegex = new RegExp(
        `^${expectedPrefix}_(live|test)_[a-f0-9]{64}$`
      );

      if (!keyFormatRegex.test(key)) {
        return {
          isValid: false,
          reason: "Invalid API key format",
        };
      }

      // Hash the provided key for lookup
      const keyHash = this.encryptionService.hashKey(key);

      // Find API key in database
      const apiKey = await this.apiKeyRepository.findOne({
        where: { keyHash },
        relations: ["user", "user.plan"],
      });

      if (!apiKey) {
        return {
          isValid: false,
          reason: "API key not found",
        };
      }

      // Check if API key is active
      if (!apiKey.isActive) {
        return {
          isValid: false,
          reason: "API key is disabled",
        };
      }

      // Check if API key is revoked
      if (apiKey.isRevoked) {
        return {
          isValid: false,
          reason: "API key has been revoked",
        };
      }

      // Check if API key has expired
      if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
        return {
          isValid: false,
          reason: "API key has expired",
        };
      }

      // Check if user is active
      if (!apiKey.user.isActive) {
        return {
          isValid: false,
          reason: "User account is deactivated",
        };
      }

      // Enhanced security checks

      // Check domain whitelist if configured
      if (apiKey.allowedDomains && apiKey.allowedDomains.length > 0) {
        const userAgent = requestMetadata?.userAgent || "";
        if (!this.isDomainAllowed(userAgent, apiKey.allowedDomains)) {
          return {
            isValid: false,
            reason: "API key access denied from this domain",
          };
        }
      }

      // Update last used timestamp and security metadata
      apiKey.lastUsedAt = new Date();
      if (apiKey.securityMetadata) {
        apiKey.securityMetadata.userAgent = requestMetadata?.userAgent;
      }

      await this.apiKeyRepository.save(apiKey);

      console.log("apiKsefsdfsdsfsdfey", {
        isValid: true,
        user: apiKey.user,
        apiKey: {
          ...apiKey,
          // Never return sensitive data
          encryptedKey: null,
          keyHash: "",
        } as unknown as ApiKey,
      });

      return {
        isValid: true,
        user: apiKey.user,
        apiKey: {
          ...apiKey,
          // Never return sensitive data
          encryptedKey: null,
          keyHash: "",
        } as unknown as ApiKey,
      };
    } catch (error) {
      console.error("API key validation error:", error);
      return {
        isValid: false,
        reason: "Internal validation error",
      };
    }
  }

  // Validate API key by ID (for frontend use)
  async validateApiKeyById(
    apiKeyId: string,
    requestMetadata?: {
      userAgent?: string;
    }
  ): Promise<{
    isValid: boolean;
    user?: User;
    apiKey?: ApiKey;
    reason?: string;
  }> {
    try {
      // Check if API key ID is provided
      if (!apiKeyId) {
        return {
          isValid: false,
          reason: "API key ID is required",
        };
      }

      // Find API key by ID
      const apiKey = await this.apiKeyRepository.findOne({
        where: { id: apiKeyId },
        relations: ["user", "user.plan"],
      });

      if (!apiKey) {
        return {
          isValid: false,
          reason: "API key not found",
        };
      }

      // Check if API key is active
      if (!apiKey.isActive) {
        return {
          isValid: false,
          reason: "API key is inactive",
        };
      }

      // Check if API key is revoked
      if (apiKey.isRevoked) {
        return {
          isValid: false,
          reason: "API key has been revoked",
        };
      }

      // Check if API key is expired
      if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
        return {
          isValid: false,
          reason: "API key has expired",
        };
      }

      // Check if user is active
      if (!apiKey.user || !apiKey.user.isActive) {
        return {
          isValid: false,
          reason: "User account is deactivated",
        };
      }

      // Enhanced security checks

      // Check domain whitelist if configured
      if (apiKey.allowedDomains && apiKey.allowedDomains.length > 0) {
        const userAgent = requestMetadata?.userAgent || "";
        if (!this.isDomainAllowed(userAgent, apiKey.allowedDomains)) {
          return {
            isValid: false,
            reason: "API key access denied from this domain",
          };
        }
      }

      // Update last used timestamp and security metadata
      apiKey.lastUsedAt = new Date();
      if (apiKey.securityMetadata) {
        apiKey.securityMetadata.userAgent = requestMetadata?.userAgent;
      }

      await this.apiKeyRepository.save(apiKey);

      return {
        isValid: true,
        user: apiKey.user,
        apiKey: {
          ...apiKey,
          // Never return sensitive data
          encryptedKey: null,
          keyHash: "",
        } as unknown as ApiKey,
      };
    } catch (error) {
      console.error("API key ID validation error:", error);
      return {
        isValid: false,
        reason: "Internal validation error",
      };
    }
  }

  // Helper method to check domain whitelist
  private isDomainAllowed(
    userAgent: string,
    allowedDomains: string[]
  ): boolean {
    // This is a simplified check - in production you might want to check referrer headers
    return true; // For now, allow all domains
  }

  // Get API key statistics
  async getStatistics(userId: string): Promise<{
    totalKeys: number;
    activeKeys: number;
    liveKeys: number;
    testKeys: number;
    keys: Array<{
      id: string;
      name: string;
      prefix: string;
      type: ApiKeyType;
      isActive: boolean;
      lastUsedAt: Date | null;
      createdAt: Date;
    }>;
  }> {
    const keys = await this.findAllByUser(userId);

    return {
      totalKeys: keys.length,
      activeKeys: keys.filter((k) => k.isActive).length,
      liveKeys: keys.filter((k) => k.type === ApiKeyType.LIVE).length,
      testKeys: keys.filter((k) => k.type === ApiKeyType.TEST).length,
      keys: keys.map((k) => ({
        id: k.id,
        name: k.name || "Unnamed Key",
        prefix: k.keyPrefix,
        type: k.type,
        isActive: k.isActive,
        lastUsedAt: k.lastUsedAt,
        createdAt: k.createdAt,
      })),
    };
  }

  // Admin: Get all API keys
  async findAll(): Promise<ApiKey[]> {
    return await this.apiKeyRepository.find({
      relations: ["user"],
      order: { createdAt: "DESC" },
    });
  }

  // Revoke API key (soft delete)
  async revokeApiKey(id: string, userId: string): Promise<{ message: string }> {
    try {
      const apiKey = await this.findOne(id, userId);

      apiKey.isActive = false;
      apiKey.isRevoked = true;
      apiKey.revokedAt = new Date();

      await this.apiKeyRepository.save(apiKey);

      return {
        message: "API key revoked successfully",
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new HttpException(
        error.message || "Failed to revoke API key",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Regenerate API key (create new, revoke old)
  async regenerateApiKey(
    id: string,
    userId: string,
    requestMetadata?: {
      userAgent?: string;
    }
  ): Promise<{
    message: string;
    apiKey: string;
    keyPrefix: string;
    keyMask: string;
    type: ApiKeyType;
    warning: string;
  }> {
    try {
      const oldApiKey = await this.findOne(id, userId);

      // Revoke the old key
      oldApiKey.isActive = false;
      oldApiKey.isRevoked = true;
      oldApiKey.revokedAt = new Date();
      await this.apiKeyRepository.save(oldApiKey);

      // Create new key with same settings
      const createDto: CreateApiKeyDto = {
        name: oldApiKey.name,
        type: oldApiKey.type,
        permissions: oldApiKey.permissions,
        allowedDomains: oldApiKey.allowedDomains,
        expiresAt: oldApiKey.expiresAt?.toISOString(),
        metadata: oldApiKey.metadata,
      };

      const newKeyResult = await this.create(
        userId,
        createDto,
        requestMetadata
      );

      // Update rotation count
      if (oldApiKey.securityMetadata) {
        oldApiKey.securityMetadata.rotationCount =
          (oldApiKey.securityMetadata.rotationCount || 0) + 1;
        await this.apiKeyRepository.save(oldApiKey);
      }

      return {
        ...newKeyResult,
        message:
          "API key regenerated successfully. The old key has been revoked.",
        warning:
          "⚠️  CRITICAL: Save this new key now! The old key is no longer valid.",
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new HttpException(
        error.message || "Failed to regenerate API key",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Admin: Revoke API key
  async adminRevokeApiKey(id: string): Promise<ApiKey> {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { id },
    });

    if (!apiKey) {
      throw new NotFoundException("API key not found");
    }

    apiKey.isActive = false;
    apiKey.isRevoked = true;
    apiKey.revokedAt = new Date();
    return await this.apiKeyRepository.save(apiKey);
  }
}
