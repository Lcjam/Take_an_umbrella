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

export default router;
