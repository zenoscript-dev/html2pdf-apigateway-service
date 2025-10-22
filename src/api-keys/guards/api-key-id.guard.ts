import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { ApiKeysService } from "../api-keys.service";
import "./types"; // Import shared types

@Injectable()
export class ApiKeyIdGuard implements CanActivate {
  constructor(
    private readonly apiKeysService: ApiKeysService,
    private reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Extract API key or API key ID from header
    const apiKeyOrId = this.extractApiKeyFromHeader(request);

    if (!apiKeyOrId) {
      throw new UnauthorizedException(
        "API key or API key ID is required. Include it in the X-API-Key header."
      );
    }

    // Determine if it's an API key or API key ID
    const isApiKeyId = this.isApiKeyId(apiKeyOrId);

    let validation;
    if (isApiKeyId) {
      // Validate by API key ID (for frontend use)
      validation = await this.apiKeysService.validateApiKeyById(apiKeyOrId, {
        userAgent: request.headers["user-agent"],
      });
    } else {
      // Validate by full API key (for backend/Postman use)
      validation = await this.apiKeysService.validateApiKey(apiKeyOrId, {
        userAgent: request.headers["user-agent"],
      });
    }

    if (!validation.isValid) {
      throw new UnauthorizedException(
        `Invalid API key: ${validation.reason || "Unknown error"}`
      );
    }

    // Attach user and apiKey to request for use in controllers
    request.user = validation.user;
    request.apiKey = validation.apiKey;

    return true;
  }

  private extractApiKeyFromHeader(request: Request): string | undefined {
    // Check multiple possible header names
    const apiKey =
      request.headers["x-api-key"] ||
      request.headers["api-key"] ||
      request.headers["authorization"]?.replace("Bearer ", "");

    return typeof apiKey === "string" ? apiKey : undefined;
  }

  private isApiKeyId(value: string): boolean {
    // API key IDs are UUIDs (36 characters with hyphens)
    // API keys have the format: prefix_type_64hexchars
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }
}
