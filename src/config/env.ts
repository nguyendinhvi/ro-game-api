import dotenv from 'dotenv';

dotenv.config();

const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const DEFAULT_CORS_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://rogame.space',
  'https://www.rogame.space',
];

function parseCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS;
  if (!raw?.trim()) return DEFAULT_CORS_ORIGINS;
  return raw.split(',').map((origin) => origin.trim()).filter(Boolean);
}

export const env = {
  nodeEnv: getEnv('NODE_ENV', 'development'),
  port: parseInt(getEnv('PORT', '3000'), 10),
  mongoUri: getEnv('MONGODB_URI', 'mongodb://localhost:27017/ro-game'),
  jwtSecret: getEnv('JWT_SECRET', 'dev-only-change-me'),
  jwtExpiresIn: getEnv('JWT_EXPIRES_IN', '7d'),
  googleClientId: getEnv('GOOGLE_CLIENT_ID', ''),
  googleClientSecret: getEnv('GOOGLE_CLIENT_SECRET', ''),
  corsOrigins: parseCorsOrigins(),
} as const;
