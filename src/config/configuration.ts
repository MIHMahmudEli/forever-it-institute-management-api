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
  webPush: {
    publicKey: process.env.VAPID_PUBLIC_KEY || 'BDy35FOKVcTvA1zqgcYYHbL4mC1dpVhnzMg1vP_lFokIugBUpfe5ADn6NCpm2agcwF7iZpwuEjfjqxYAbsnEQ4E',
    privateKey: process.env.VAPID_PRIVATE_KEY || 'Z0XZCq2EQU5XbjK5hJp82cUUGkGnUpsFHNtvLhgRreA',
    subject: process.env.VAPID_SUBJECT || 'mailto:admin@foreveritbd.com',
  },
  database: getDatabaseConfig(),
});
