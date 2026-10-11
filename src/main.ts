import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Global API Prefix
  const apiPrefix = process.env.API_PREFIX || 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  // Root endpoint handler for domain root health checks and browsers
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/', (_req, res) => {
    res.json({
      name: 'Forever IT Institute Management API',
      version: '1.0.0',
      status: 'online',
      message: 'Forever IT Institute API is running. API endpoints are located under /api/v1 and documentation at /api/docs',
      documentation: '/api/docs',
      apiBase: `/${apiPrefix}`,
    });
  });

  // Graceful fallback for clients omitting the API prefix (e.g., /auth/login -> /api/v1/auth/login)
  app.use((req: any, _res: any, next: any) => {
    const rawUrl: string = req.url || '';
    const cleanPrefix = apiPrefix.startsWith('/') ? apiPrefix : `/${apiPrefix}`;
    if (
      !rawUrl.startsWith(cleanPrefix) &&
      !rawUrl.startsWith('/api/') &&
      rawUrl !== '/' &&
      rawUrl !== '' &&
      !rawUrl.startsWith('/favicon.ico')
    ) {
      req.url = `${cleanPrefix}${rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`}`;
    }
    next();
  });

  // Global Exception Filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // CORS Configuration
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(null, true); // Dev-friendly permissive callback for local environments
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  });

  // Swagger OpenAPI Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Forever IT Institute Management API')
    .setDescription(
      'Enterprise API for Forever IT Institute: Student Management, Course Catalog, Enrollments, Payments & Printable Receipts',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter your JWT token (e.g. from /api/v1/auth/login)',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = parseInt(process.env.PORT || '3001', 10);
  await app.listen(port);

  logger.log(`🚀 API running on http://localhost:${port}/${apiPrefix}`);
  logger.log(`📚 Swagger documentation at http://localhost:${port}/api/docs`);
}

void bootstrap();
