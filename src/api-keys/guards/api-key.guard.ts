import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { ApiKey } from "../../database/entities";
import { ApiKeysService } from "../api-keys.service";

// Extend Express Request to include user and apiKey
declare global {
  namespace Express {
    interface Request {
      user?: User;
      apiKey?: ApiKey;
    }
  }
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly apiKeysService: ApiKeysService,
    private reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Extract API key from header
    const apiKey = this.extractApiKeyFromHeader(request);

    if (!apiKey) {
      throw new UnauthorizedException(
        "API key is required. Include it in the X-API-Key header."
      );
    }

    // Validate API key with request metadata
    const validation = await this.apiKeysService.validateApiKey(apiKey, {
      userAgent: request.headers["user-agent"],
    });

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
}
