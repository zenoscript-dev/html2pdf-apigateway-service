import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import axios, { AxiosError } from "axios";
import { ConfigService } from "../config/services/config.service";
import { ApiKey, UsageStatus, User } from "../database/entities";
import { QuotaService } from "../quota/quota.service";
import { UsageService } from "../usage/usage.service";
import { GeneratePdfDto, GeneratePdfFromUrlDto } from "./dto";

@Injectable()
export class PdfProxyService {
  constructor(
    private readonly configService: ConfigService,
    private readonly quotaService: QuotaService,
    private readonly usageService: UsageService
  ) {}

  // Generate PDF from HTML
  async generatePdfFromHtml(
    dto: GeneratePdfDto,
    user: User,
    apiKey: ApiKey,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    pdf: Buffer;
    metadata: {
      fileSize: number;
      pages: number;
      processingTime: number;
    };
  }> {
    const startTime = Date.now();

    try {
      // 1. Check quotas
      const quotaCheck = await this.quotaService.checkQuota(
        user.id,
        apiKey.type,
        user
      );

      if (!quotaCheck.allowed) {
        throw new BadRequestException(quotaCheck.reason);
      }

      // 2. Validate file size (estimate HTML size)
      const estimatedSizeBytes = Buffer.from(dto.html).length;
      const maxSizeMB = user.plan.maxFileSizeMB;
      const maxSizeBytes = maxSizeMB * 1024 * 1024;

      if (estimatedSizeBytes > maxSizeBytes) {
        throw new BadRequestException(
          `HTML content too large. Maximum size: ${maxSizeMB}MB`
        );
      }

      // 3. Proxy request to PDF service
      const response = await this.proxyToPdfService(
        "/api/v1/convert/html-text",
        "POST",
        {
          html: dto.html,
          // options: dto.options,
        }
      );

      const processingTime = Date.now() - startTime;

      // 4. Get PDF buffer and metadata
      const pdfBuffer = Buffer.from(response.data);
      const fileSize = pdfBuffer.length;

      // Validate generated PDF size
      if (fileSize > maxSizeBytes) {
        throw new BadRequestException(
          `Generated PDF too large. Maximum size: ${maxSizeMB}MB`
        );
      }

      // 5. Check pages limit
      const pages = response.headers["x-pdf-pages"]
        ? parseInt(response.headers["x-pdf-pages"])
        : 1;

      if (user.plan.maxPagesPerPdf && pages > user.plan.maxPagesPerPdf) {
        throw new BadRequestException(
          `PDF exceeds page limit. Maximum pages: ${user.plan.maxPagesPerPdf}`
        );
      }

      // 6. Increment quota counter
      await this.quotaService.incrementUsage(user.id);

      // 7. Record usage
      await this.usageService.recordUsage({
        userId: user.id,
        apiKeyId: apiKey.id,
        endpoint: "/pdf/generate",
        method: "POST",
        status: UsageStatus.SUCCESS,
        statusCode: 200,
        fileSizeBytes: fileSize,
        pagesGenerated: pages,
        processingTimeMs: processingTime,
        ipAddress,
        userAgent,
        requestMetadata: {
          apiKeyType: apiKey.type,
          htmlLength: dto.html.length,
        },
        responseMetadata: {
          pages,
          fileSize,
        },
      });

      return {
        pdf: pdfBuffer,
        metadata: {
          fileSize,
          pages,
          processingTime,
        },
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;

      // Record failed usage
      await this.usageService.recordUsage({
        userId: user.id,
        apiKeyId: apiKey.id,
        endpoint: "/pdf/generate",
        method: "POST",
        status: UsageStatus.FAILED,
        statusCode: error.response?.status || 500,
        processingTimeMs: processingTime,
        errorMessage: error.message,
        ipAddress,
        userAgent,
      });

      if (
        error instanceof BadRequestException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        throw new ServiceUnavailableException(
          `PDF service error: ${error.message}`
        );
      }

      throw new HttpException(
        error.message || "Failed to generate PDF from HTML",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Generate PDF from URL
  async generatePdfFromUrl(
    dto: GeneratePdfFromUrlDto,
    user: User,
    apiKey: ApiKey,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    pdf: Buffer;
    metadata: {
      fileSize: number;
      pages: number;
      processingTime: number;
    };
  }> {
    const startTime = Date.now();

    try {
      // 1. Check quotas
      const quotaCheck = await this.quotaService.checkQuota(
        user.id,
        apiKey.type,
        user
      );

      if (!quotaCheck.allowed) {
        throw new BadRequestException(quotaCheck.reason);
      }

      // 2. Proxy request to PDF service
      const response = await this.proxyToPdfService(
        "/api/v1/convert/url",
        "POST",
        {
          url: dto.url,
          // options: dto.options,
        }
      );

      const processingTime = Date.now() - startTime;

      // 3. Get PDF buffer and metadata
      const pdfBuffer = Buffer.from(response.data);
      const fileSize = pdfBuffer.length;

      // Validate generated PDF size
      const maxSizeMB = user.plan.maxFileSizeMB;
      const maxSizeBytes = maxSizeMB * 1024 * 1024;

      if (fileSize > maxSizeBytes) {
        throw new BadRequestException(
          `Generated PDF too large. Maximum size: ${maxSizeMB}MB`
        );
      }

      // 4. Check pages limit
      const pages = response.headers["x-pdf-pages"]
        ? parseInt(response.headers["x-pdf-pages"])
        : 1;

      if (user.plan.maxPagesPerPdf && pages > user.plan.maxPagesPerPdf) {
        throw new BadRequestException(
          `PDF exceeds page limit. Maximum pages: ${user.plan.maxPagesPerPdf}`
        );
      }

      // 5. Increment quota counter
      await this.quotaService.incrementUsage(user.id);

      // 6. Record usage
      await this.usageService.recordUsage({
        userId: user.id,
        apiKeyId: apiKey.id,
        endpoint: "/pdf/generate-from-url",
        method: "POST",
        status: UsageStatus.SUCCESS,
        statusCode: 200,
        fileSizeBytes: fileSize,
        pagesGenerated: pages,
        processingTimeMs: processingTime,
        ipAddress,
        userAgent,
        requestMetadata: {
          apiKeyType: apiKey.type,
          url: dto.url,
        },
        responseMetadata: {
          pages,
          fileSize,
        },
      });

      return {
        pdf: pdfBuffer,
        metadata: {
          fileSize,
          pages,
          processingTime,
        },
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;

      // Record failed usage
      await this.usageService.recordUsage({
        userId: user.id,
        apiKeyId: apiKey.id,
        endpoint: "/pdf/generate-from-url",
        method: "POST",
        status: UsageStatus.FAILED,
        statusCode: error.response?.status || 500,
        processingTimeMs: processingTime,
        errorMessage: error.message,
        ipAddress,
        userAgent,
      });

      if (error instanceof BadRequestException) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        throw new ServiceUnavailableException(
          `PDF service error: ${error.message}`
        );
      }

      throw error;
    }
  }

  // Convert HTML file to PDF
  async convertHtmlFileToPdf(
    file: any,
    user: User,
    apiKey: ApiKey,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    pdf: Buffer;
    metadata: {
      fileSize: number;
      pages: number;
      processingTime: number;
    };
  }> {
    const startTime = Date.now();

    try {
      // 1. Validate file
      this.validateHtmlFile(file);

      // 2. Check quotas
      const quotaCheck = await this.quotaService.checkQuota(
        user.id,
        apiKey.type,
        user
      );

      if (!quotaCheck.allowed) {
        throw new BadRequestException(quotaCheck.reason);
      }

      // 3. Convert file buffer to HTML string
      const htmlContent = file.buffer.toString("utf-8");

      // 4. Create DTO for existing HTML generation method
      const generatePdfDto: GeneratePdfDto = {
        html: htmlContent,
        options: {
          format: "A4",
          orientation: "portrait",
          margin: "1cm",
          scale: 1,
          displayHeaderFooter: false,
          printBackground: true,
        },
      };

      // 5. Use existing HTML generation method
      const result = await this.generatePdfFromHtml(
        generatePdfDto,
        user,
        apiKey,
        ipAddress,
        userAgent
      );

      return result;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Handle PDF service errors
      if (error instanceof AxiosError) {
        if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
          throw new ServiceUnavailableException("PDF service unavailable");
        }
        throw new HttpException(
          `PDF service error: ${error.message}`,
          HttpStatus.SERVICE_UNAVAILABLE
        );
      }

      throw new HttpException(
        error.message || "Failed to convert HTML file to PDF",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Validate HTML file
  private validateHtmlFile(file: any): void {
    if (!file) {
      throw new BadRequestException("File is missing");
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      throw new BadRequestException("File too large. Maximum size is 5MB.");
    }

    // Check file extension
    const allowedExtensions = [".html", ".htm"];
    const fileExtension = file.originalname
      .toLowerCase()
      .substring(file.originalname.lastIndexOf("."));

    if (!allowedExtensions.includes(fileExtension)) {
      throw new BadRequestException(
        "Invalid file type. Only .html files are accepted."
      );
    }

    // Check MIME type
    const allowedMimeTypes = [
      "text/html",
      "application/xhtml+xml",
      "text/plain", // Some systems might report HTML as text/plain
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        "Invalid file type. Only HTML files (text/html) are accepted."
      );
    }

    // Check if file content is valid HTML (basic check)
    const content = file.buffer.toString("utf-8");
    if (!content.trim()) {
      throw new BadRequestException("File is empty");
    }

    // Basic HTML validation - check for HTML tags
    const htmlTagRegex = /<html[^>]*>|<!DOCTYPE\s+html/i;
    if (!htmlTagRegex.test(content)) {
      throw new BadRequestException(
        "File does not appear to be a valid HTML file"
      );
    }
  }

  // Get user's current quota status
  async getQuotaStatus(user: User): Promise<any> {
    return this.quotaService.getQuotaStatus(user.id, user);
  }

  // Private helper to proxy requests to PDF service
  private async proxyToPdfService(
    path: string,
    method: string,
    data: any
  ): Promise<any> {
    const pdfServiceUrl = this.configService.pdfServiceUrl;
    const url = `${pdfServiceUrl}${path}`;

    try {
      const response = await axios({
        method,
        url,
        data,
        responseType: "arraybuffer",
        timeout: 60000, // 60 second timeout
        headers: {
          "Content-Type": "application/json",
        },
      });

      return response;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        console.error("PDF Service Error:", {
          status: axiosError.response?.status,
          message: axiosError.message,
          url,
        });
      }
      throw error;
    }
  }
}
