import * as admin from 'firebase-admin';
import { config } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Firebase Admin SDK 싱글톤
 * 애플리케이션 전체에서 하나의 Firebase Admin 인스턴스를 공유합니다.
 */
class FirebaseAdmin {
  private static instance: admin.app.App | null = null;

  /**
   * Firebase Admin 인스턴스를 반환합니다.
   * 처음 호출 시 Firebase Admin을 초기화하고, 이후에는 기존 인스턴스를 재사용합니다.
   * @throws Error Firebase 초기화 실패 시
   */
  static getInstance(): admin.app.App {
    if (!FirebaseAdmin.instance) {
      try {
        // 서비스 계정 JSON이 Base64로 인코딩되어 환경 변수에 저장된 경우
        if (config.firebaseServiceAccount) {
          const serviceAccount = JSON.parse(
            Buffer.from(config.firebaseServiceAccount, 'base64').toString('utf-8')
          );

          FirebaseAdmin.instance = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });

          logger.info('Firebase Admin SDK initialized successfully');
        } else {
          // 테스트 환경이나 개발 환경에서 Firebase가 필수가 아닌 경우
          logger.warn('Firebase service account not configured. FCM features will be disabled.');
          throw new Error('Firebase service account not configured');
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error during Firebase initialization';
        logger.error('Failed to initialize Firebase Admin SDK', { error: errorMessage });
        throw new Error(`Firebase initialization failed: ${errorMessage}`);
      }
    }

    // 타입 안전성 보장: instance가 null이면 에러 (위의 try-catch에서 처리되지 않은 경우)
    if (!FirebaseAdmin.instance) {
      throw new Error('Firebase instance is null after initialization attempt');
    }

    return FirebaseAdmin.instance;
  }

  /**
   * Firebase Admin 인스턴스를 종료합니다.
   * 테스트 환경에서 사용됩니다.
   */
  static async disconnect(): Promise<void> {
    if (FirebaseAdmin.instance) {
      await FirebaseAdmin.instance.delete();
      FirebaseAdmin.instance = null;
      logger.info('Firebase Admin SDK disconnected');
    }
  }
}

export default FirebaseAdmin.getInstance();
export { FirebaseAdmin };
