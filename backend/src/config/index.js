require('dotenv').config({ path: '../.env' });

module.exports = {
  port: process.env.BACKEND_PORT || 3001,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/quest',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  botToken: process.env.BOT_TOKEN,
  apiSecretKey: process.env.API_SECRET_KEY || 'dev-api-key',
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
};
