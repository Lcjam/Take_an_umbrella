import { Request, Response, NextFunction } from 'express';
import { WeatherService } from '../services/weather-service';
import { ValidationError } from '../types/errors';
import { logger } from '../utils/logger';

const weatherService = new WeatherService();

/**
 * 날씨 데이터 조회 컨트롤러
 */
export const getWeather = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { latitude, longitude } = req.query;

    // 파라미터 검증
    if (!latitude || !longitude) {
      throw new ValidationError('latitude와 longitude 파라미터가 필요합니다');
    }

    // 숫자 변환 및 검증
    const lat = parseFloat(latitude as string);
    const lon = parseFloat(longitude as string);

    if (isNaN(lat) || isNaN(lon)) {
      throw new ValidationError('latitude와 longitude는 숫자여야 합니다');
    }

    // 범위 검증
    if (lat < -90 || lat > 90) {
      throw new ValidationError('latitude는 -90에서 90 사이여야 합니다');
    }

    if (lon < -180 || lon > 180) {
      throw new ValidationError('longitude는 -180에서 180 사이여야 합니다');
    }

    logger.info('날씨 데이터 조회 요청', { latitude: lat, longitude: lon });

    // 날씨 데이터 조회
    const weatherData = await weatherService.getWeather(lat, lon);

    res.status(200).json({
      success: true,
      data: weatherData,
    });
  } catch (error) {
    next(error);
  }
};
