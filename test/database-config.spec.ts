import { describe, it, expect } from 'vitest';
import {
  getDatabaseConfig,
  resolveSslConfig,
  DatabaseConfigurationError,
} from '../src/config/database.config.js';

describe('Database Configuration & Selection', () => {
  it('should use DATABASE_URL when provided (Option A - e.g. Supabase)', () => {
    const env = {
      DATABASE_URL: 'postgresql://postgres:secret@db.supabase.co:5432/postgres',
      DB_SSL: 'true',
    };

    const config: any = getDatabaseConfig(env);
    expect(config.type).toBe('postgres');
    expect(config.url).toBe(env.DATABASE_URL);
    expect(config.ssl).toEqual({ rejectUnauthorized: true });
  });

  it('should take DATABASE_URL over individual DB_* fields (precedence rule)', () => {
    const env = {
      DATABASE_URL: 'postgresql://pooler:pass@aws-0.supabase.com:6543/postgres',
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      DB_USERNAME: 'localuser',
      DB_DATABASE: 'localdb',
    };

    const config: any = getDatabaseConfig(env);
    expect(config.url).toBe(env.DATABASE_URL);
    expect(config.host).toBeUndefined();
  });

  it('should use individual DB_* fields when DATABASE_URL is not provided (Option B - e.g. cPanel)', () => {
    const env = {
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      DB_USERNAME: 'cpanel_user',
      DB_PASSWORD: 'cpanel_password',
      DB_DATABASE: 'cpanel_institute_db',
      DB_SSL: 'false',
    };

    const config: any = getDatabaseConfig(env);
    expect(config.type).toBe('postgres');
    expect(config.host).toBe('localhost');
    expect(config.port).toBe(5432);
    expect(config.username).toBe('cpanel_user');
    expect(config.database).toBe('cpanel_institute_db');
    expect(config.ssl).toBe(false);
  });

  it('should fail with DatabaseConfigurationError if neither config is provided', () => {
    const env = {};
    expect(() => getDatabaseConfig(env)).toThrow(DatabaseConfigurationError);
  });

  it('should fail if individual fields are incomplete', () => {
    const env = {
      DB_HOST: 'localhost',
      // missing DB_USERNAME and DB_DATABASE
    };
    expect(() => getDatabaseConfig(env)).toThrow(DatabaseConfigurationError);
  });

  it('should resolve SSL correctly for auto mode with Supabase URL', () => {
    const env = {
      DATABASE_URL: 'postgresql://postgres:pass@aws-0.pooler.supabase.co:5432/postgres',
      DB_SSL: 'auto',
      DB_SSL_REJECT_UNAUTHORIZED: 'true',
    };
    const ssl = resolveSslConfig(env);
    expect(ssl).toEqual({ rejectUnauthorized: true });
  });

  it('should resolve SSL false when DB_SSL=false', () => {
    const env = {
      DATABASE_URL: 'postgresql://postgres:pass@aws-0.pooler.supabase.co:5432/postgres',
      DB_SSL: 'false',
    };
    const ssl = resolveSslConfig(env);
    expect(ssl).toBe(false);
  });

  it('should respect DB_SSL_REJECT_UNAUTHORIZED=false', () => {
    const env = {
      DB_SSL: 'true',
      DB_SSL_REJECT_UNAUTHORIZED: 'false',
    };
    const ssl = resolveSslConfig(env);
    expect(ssl).toEqual({ rejectUnauthorized: false });
  });
});
