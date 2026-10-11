import { getDatabaseConfig } from './database.config.js';

export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev_insecure_jwt_secret_change_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  initialAdmin: {
    email: process.env.INITIAL_ADMIN_EMAIL || 'admin@foreveritbd.com',
    password: process.env.INITIAL_ADMIN_PASSWORD || 'Admin123456!',
    name: process.env.INITIAL_ADMIN_NAME || 'System Administrator',
  },
  database: getDatabaseConfig(),
});
