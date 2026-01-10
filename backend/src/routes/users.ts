import { Router } from 'express';
import userController from '../controllers/user-controller';

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
router.get('/:user_id', userController.getUser.bind(userController));

/**
 * PATCH /api/users/:user_id/location
 * 사용자 위치 정보 설정/업데이트
 */
router.patch('/:user_id/location', userController.updateLocation.bind(userController));

/**
 * PATCH /api/users/:user_id/notification-time
 * 사용자 알림 시간 설정/업데이트
 */
router.patch(
  '/:user_id/notification-time',
  userController.updateNotificationTime.bind(userController)
);

export default router;
