import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { errorHandler } from './middlewares/error-handler';
import usersRouter from './routes/users';
import weatherRouter from './routes/weather';
import { logger } from './utils/logger';
import notificationScheduler from './services/notification-scheduler';
import { RedisClient } from './lib/redis';

// 프로젝트 루트의 .env 파일 로드 (backend 디렉토리에서 실행해도 루트의 .env 사용)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// API Routes
app.use('/api/users', usersRouter);
app.use('/api/weather', weatherRouter);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);

    // Start notification scheduler
    notificationScheduler.start();
    logger.info('Notification scheduler started');
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutdown signal received');

    // Stop notification scheduler
    notificationScheduler.stop();
    logger.info('Notification scheduler stopped');

    // Disconnect Redis
    await RedisClient.disconnect();

    // Close HTTP server
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

export default app;
