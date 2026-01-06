import dotenv from 'dotenv';
import path from 'path';

// 프로젝트 루트의 .env 파일 로드
// backend 폴더에서 실행되므로 상위 디렉토리의 .env를 찾음
dotenv.config({ path: path.join(process.cwd(), '../.env') });

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  weatherApiKey: process.env.WEATHER_API_KEY || '',
  weatherApiUrl: process.env.WEATHER_API_URL || '',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',
  fcmServerKey: process.env.FCM_SERVER_KEY || '',
};
