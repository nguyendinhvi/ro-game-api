import dotenv from 'dotenv';

dotenv.config();

const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const env = {
  nodeEnv: getEnv('NODE_ENV', 'development'),
  port: parseInt(getEnv('PORT', '3000'), 10),
  mongoUri: getEnv('MONGODB_URI', 'mongodb://localhost:27017/ro-game'),
  jwtSecret: getEnv('JWT_SECRET', 'dev-only-change-me'),
  jwtExpiresIn: getEnv('JWT_EXPIRES_IN', '7d'),
} as const;
