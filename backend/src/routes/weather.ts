import { Router } from 'express';
import * as weatherController from '../controllers/weather-controller';

const router = Router();

/**
 * @route   GET /api/weather
 * @desc    위경도 기반 날씨 데이터 조회
 * @query   latitude - 위도 (-90 ~ 90)
 * @query   longitude - 경도 (-180 ~ 180)
 * @access  Public
 */
router.get('/', weatherController.getWeather);

export default router;
