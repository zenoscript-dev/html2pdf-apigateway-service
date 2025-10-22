import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Ip,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from "@nestjs/swagger";
import { Response } from "express";
import { ApiKeyIdGuard } from "../api-keys/guards";
import { CurrentUser } from "../auth/decorators";
import { User } from "../database/entities";
import { GeneratePdfDto, GeneratePdfFromUrlDto } from "./dto";
import { PdfProxyService } from "./pdf-proxy.service";

// Create a custom decorator to get the API key from request
import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { ApiKey } from "../database/entities";

export const CurrentApiKey = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): ApiKey => {
    const request = ctx.switchToHttp().getRequest();
    return request.apiKey;
  }
);

@ApiTags("pdf")
@Controller("pdf")
@ApiSecurity("X-API-Key")
export class PdfProxyController {
  constructor(private readonly pdfProxyService: PdfProxyService) {}

  // Generate PDF from HTML
  @UseGuards(ApiKeyIdGuard)
  @Post("generate-from-html")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Generate PDF from HTML",
    description:
      "Convert HTML content to PDF. Requires API key authentication.",
  })
  @ApiResponse({
    status: 200,
    description: "PDF generated successfully",
    content: {
      "application/pdf": {
        schema: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - quota exceeded or invalid input",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - invalid API key",
  })
  @ApiResponse({
    status: 503,
    description: "PDF service unavailable",
  })
  async generatePdf(
    @Body() generatePdfDto: GeneratePdfDto,
    @CurrentUser() user: User,
    @CurrentApiKey() apiKey: ApiKey,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string,
    @Res() res: Response
  ) {
    try {
      const result = await this.pdfProxyService.generatePdfFromHtml(
        generatePdfDto,
        user,
        apiKey,
        ipAddress,
        userAgent
      );

      // Set response headers
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="document.pdf"'
      );
      res.setHeader("Content-Length", result.metadata.fileSize);
      res.setHeader("X-PDF-Pages", result.metadata.pages);
      res.setHeader("X-Processing-Time", result.metadata.processingTime);

      // Send PDF buffer
      return res.send(result.pdf);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to generate PDF from HTML",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Generate PDF from URL
  @UseGuards(ApiKeyIdGuard)
  @Post("generate-from-url")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Generate PDF from URL",
    description: "Convert a web page to PDF. Requires API key authentication.",
  })
  @ApiResponse({
    status: 200,
    description: "PDF generated successfully",
    content: {
      "application/pdf": {
        schema: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - quota exceeded or invalid URL",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - invalid API key",
  })
  @ApiResponse({
    status: 503,
    description: "PDF service unavailable",
  })
  async generatePdfFromUrl(
    @Body() generatePdfFromUrlDto: GeneratePdfFromUrlDto,
    @CurrentUser() user: User,
    @CurrentApiKey() apiKey: ApiKey,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string,
    @Res() res: Response
  ) {
    try {
      const result = await this.pdfProxyService.generatePdfFromUrl(
        generatePdfFromUrlDto,
        user,
        apiKey,
        ipAddress,
        userAgent
      );

      // Set response headers
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="document.pdf"'
      );
      res.setHeader("Content-Length", result.metadata.fileSize);
      res.setHeader("X-PDF-Pages", result.metadata.pages);
      res.setHeader("X-Processing-Time", result.metadata.processingTime);

      // Send PDF buffer
      return res.send(result.pdf);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to generate PDF from URL",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Convert HTML file to PDF
  @UseGuards(ApiKeyIdGuard)
  @Post("generate-from-html-file")
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({
    summary: "Convert HTML file to PDF",
    description:
      "Upload a .html file and receive a PDF file in response. Only files with .html extension and text/html mimetype are accepted.",
  })
  @ApiResponse({
    status: 200,
    description: "PDF file generated successfully",
    content: {
      "application/pdf": {
        schema: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Invalid input - file is missing, too large, or not HTML",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - invalid API key",
  })
  @ApiResponse({
    status: 503,
    description: "PDF service unavailable",
  })
  async convertHtmlFileToPdf(
    @UploadedFile() file: any,
    @CurrentUser() user: User,
    @CurrentApiKey() apiKey: ApiKey,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string,
    @Res() res: Response
  ) {
    try {
      const result = await this.pdfProxyService.convertHtmlFileToPdf(
        file,
        user,
        apiKey,
        ipAddress,
        userAgent
      );

      // Set response headers
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="document.pdf"'
      );
      res.setHeader("Content-Length", result.metadata.fileSize);
      res.setHeader("X-PDF-Pages", result.metadata.pages);
      res.setHeader("X-Processing-Time", result.metadata.processingTime);

      // Send PDF buffer
      return res.send(result.pdf);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to convert HTML file to PDF",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Get quota status
  @UseGuards(ApiKeyIdGuard)
  @Get("quota")
  @ApiOperation({
    summary: "Get current quota status",
    description: "Check your current API usage and remaining quota",
  })
  @ApiResponse({
    status: 200,
    description: "Quota status retrieved successfully",
  })
  async getQuota(@CurrentUser() user: User) {
    try {
      return await this.pdfProxyService.getQuotaStatus(user);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to retrieve quota status",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
