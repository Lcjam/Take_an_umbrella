import dotenv from 'dotenv';
import path from 'path';

// 프로젝트 루트의 .env 파일 로드
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  weatherApiKey: process.env.WEATHER_API_KEY || '',
  weatherApiUrl: process.env.WEATHER_API_URL || '',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',
  fcmServerKey: process.env.FCM_SERVER_KEY || '',
};

