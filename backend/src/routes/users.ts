import { Router } from 'express';
import userController from '../controllers/user-controller';
import { validateUserId } from '../middlewares/validate-user-id';

const router = Router();

/**
 * POST /api/users
 * 사용자 생성 또는 조회
 */
router.post('/', userController.createOrGetUser.bind(userController));

/**
 * GET /api/users/:user_id
 * 사용자 정보 조회
 */
router.get('/:user_id', validateUserId, userController.getUser.bind(userController));

/**
 * PATCH /api/users/:user_id/location
 * 사용자 위치 정보 설정/업데이트
 */
router.patch('/:user_id/location', validateUserId, userController.updateLocation.bind(userController));

/**
 * PATCH /api/users/:user_id/notification-time
 * 사용자 알림 시간 설정/업데이트
 */
router.patch(
  '/:user_id/notification-time',
  validateUserId,
  userController.updateNotificationTime.bind(userController)
);

/**
 * POST /api/users/:user_id/fcm-token
 * FCM 토큰 등록/갱신
 */
router.post('/:user_id/fcm-token', validateUserId, userController.registerFcmToken.bind(userController));

/**
 * DELETE /api/users/:user_id/fcm-token
 * FCM 토큰 삭제
 */
router.delete('/:user_id/fcm-token', validateUserId, userController.deleteFcmToken.bind(userController));

/**
 * PATCH /api/users/:user_id/notification-enabled
 * 알림 활성화/비활성화 설정
 */
router.patch(
  '/:user_id/notification-enabled',
  validateUserId,
  userController.updateNotificationEnabled.bind(userController)
);

export default router;
