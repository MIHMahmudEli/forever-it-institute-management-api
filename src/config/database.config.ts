import { DataSourceOptions } from 'typeorm';
import { User } from '../users/entities/user.entity.js';
import { Student } from '../students/entities/student.entity.js';
import { Course } from '../courses/entities/course.entity.js';
import { Enrollment } from '../enrollments/entities/enrollment.entity.js';
import { Payment } from '../payments/entities/payment.entity.js';
import { AuditLog } from '../audit-logs/entities/audit-log.entity.js';

export class DatabaseConfigurationError extends Error {
  constructor(message: string) {
    super(`[DatabaseConfigurationError] ${message}`);
    this.name = 'DatabaseConfigurationError';
  }
}

export interface ResolvedDatabaseConfig {
  type: 'postgres';
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  url?: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
  synchronize: boolean;
  logging: boolean;
}

/**
 * Resolves SSL configuration based on explicit DB_SSL flag, URL contents, or environment.
 */
export function resolveSslConfig(env: Record<string, string | undefined>): boolean | { rejectUnauthorized: boolean } {
  const dbSsl = env.DB_SSL?.trim().toLowerCase();
  const rejectUnauthorized = env.DB_SSL_REJECT_UNAUTHORIZED?.trim().toLowerCase() !== 'false';

  // Explicit true
  if (dbSsl === 'true' || dbSsl === '1') {
    return { rejectUnauthorized };
  }

  // Explicit false
  if (dbSsl === 'false' || dbSsl === '0') {
    return false;
  }

  // Auto mode (default)
  const databaseUrl = env.DATABASE_URL?.trim() || '';
  const isSupabase = databaseUrl.includes('supabase.co') || (env.DB_HOST?.includes('supabase.co') ?? false);
  const isUrlSslRequired = databaseUrl.includes('sslmode=require') || databaseUrl.includes('sslmode=verify-full');
  const isProduction = env.NODE_ENV === 'production';

  if (isSupabase || isUrlSslRequired) {
    return { rejectUnauthorized };
  }

  // For production non-local databases
  if (isProduction && (env.DB_HOST && env.DB_HOST !== 'localhost' && env.DB_HOST !== '127.0.0.1')) {
    return { rejectUnauthorized };
  }

  return false;
}

/**
 * Validates and produces TypeORM PostgreSQL connection options.
 * Follows connection precedence:
 * 1. DATABASE_URL (if provided and non-empty)
 * 2. Individual fields (DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE)
 * Throws actionable DatabaseConfigurationError if neither is complete.
 */
export function getDatabaseConfig(env: Record<string, string | undefined> = process.env): DataSourceOptions {
  const databaseUrl = env.DATABASE_URL?.trim();
  const synchronize = env.DB_SYNCHRONIZE === 'true';
  const logging = env.DB_LOGGING === 'true';
  const ssl = resolveSslConfig(env);

  const entities = [User, Student, Course, Enrollment, Payment, AuditLog];

  if (databaseUrl) {
    // Validate PostgreSQL URL format
    if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
      throw new DatabaseConfigurationError(
        'DATABASE_URL is invalid. It must start with "postgresql://" or "postgres://". Provided: ' +
          databaseUrl.substring(0, 15) + '...'
      );
    }

    return {
      type: 'postgres',
      url: databaseUrl,
      ssl,
      synchronize,
      logging,
      entities,
      migrations: ['dist/src/database/migrations/*.js'],
    } as DataSourceOptions;
  }

  // Option B: Individual connection fields
  const host = env.DB_HOST?.trim();
  const port = env.DB_PORT ? parseInt(env.DB_PORT, 10) : 5432;
  const username = env.DB_USERNAME?.trim();
  const password = env.DB_PASSWORD ?? '';
  const database = env.DB_DATABASE?.trim();

  const missingFields: string[] = [];
  if (!host) missingFields.push('DB_HOST');
  if (!username) missingFields.push('DB_USERNAME');
  if (!database) missingFields.push('DB_DATABASE');

  if (missingFields.length > 0) {
    throw new DatabaseConfigurationError(
      `No valid PostgreSQL database configuration found.\n` +
      `Either provide a valid DATABASE_URL (e.g. for Supabase / connection pooling) ` +
      `OR provide all required individual fields: DB_HOST, DB_USERNAME, DB_DATABASE (missing: ${missingFields.join(', ')}).\n` +
      `Check your .env file or refer to .env.development.example or .env.production.example.`
    );
  }

  return {
    type: 'postgres',
    host,
    port,
    username,
    password,
    database,
    ssl,
    synchronize,
    logging,
    entities,
    migrations: ['dist/src/database/migrations/*.js'],
  } as DataSourceOptions;
}
