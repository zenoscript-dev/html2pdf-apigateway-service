import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as compression from "compression";
import * as cors from "cors";
import * as dotenv from "dotenv";
import helmet from "helmet";
import * as morgan from "morgan";
import { AppModule } from "./app.module";

async function bootstrap() {
  // Load environment variables
  dotenv.config();

  const app = await NestFactory.create(AppModule);

  // Apply security middleware
  // app.use(
  //   cors({
  //     origin: [process.env.CORS_ORIGIN || "*", "http://localhost:5176", "http://localhost:5176/signin"],
  //     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  //     allowedHeaders: ["Content-Type"],
  //     maxAge: 86400, // 24 hours
  //   })
  // );
  app.use(cors());
  app.use(morgan("combined"));
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: false,
    })
  );
  app.use(compression());

  app.setGlobalPrefix("api/v1");

  // Apply validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    })
  );

  // Setup Swagger documentation
  const config = new DocumentBuilder()
    .setTitle("HTML2PDF Gateway API")
    .setDescription(
      "API Gateway for HTML to PDF conversion service with authentication, API keys, and usage tracking"
    )
    .setVersion("1.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        name: "JWT",
        description: "Enter JWT token",
        in: "header",
      },
      "JWT-auth"
    )
    .addApiKey(
      {
        type: "apiKey",
        name: "X-API-Key",
        in: "header",
        description: "API Key for PDF generation endpoints",
      },
      "api-key"
    )
    .addTag("auth", "Authentication endpoints")
    .addTag("api-keys", "API Key management")
    .addTag("pdf", "PDF generation endpoints")
    .addTag("usage", "Usage analytics")
    .addTag("admin", "Admin endpoints")
    .addTag("health", "Health check endpoints")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: "HTML2PDF Gateway API",
    customfavIcon: "/favicon.ico",
    customCss: ".swagger-ui .topbar .download-url-wrapper { display: none }",
  });

  const port = process.env.PORT || 6100;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`API documentation available at: http://localhost:${port}/api`);
}
bootstrap();
