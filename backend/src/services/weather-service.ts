import axios from 'axios';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { WeatherData, GridCoordinate, KmaApiResponse, KmaApiItem } from '../types/weather';
import { ExternalApiError } from '../types/errors';
import cacheService from '../utils/cache';

// 캐시 TTL (5분)
const WEATHER_CACHE_TTL = 300;

/**
 * 날씨 서비스
 * 기상청 API를 호출하여 날씨 데이터 조회
 */
export class WeatherService {
  private readonly API_BASE_URL: string;
  private readonly API_KEY: string;

  // 기상청 격자 변환 상수
  private readonly RE = 6371.00877; // 지구 반경(km)
  private readonly GRID = 5.0; // 격자 간격(km)
  private readonly SLAT1 = 30.0; // 투영 위도1(degree)
  private readonly SLAT2 = 60.0; // 투영 위도2(degree)
  private readonly OLON = 126.0; // 기준점 경도(degree)
  private readonly OLAT = 38.0; // 기준점 위도(degree)
  private readonly XO = 43; // 기준점 X좌표(GRID)
  private readonly YO = 136; // 기준점 Y좌표(GRID)

  constructor() {
    this.API_BASE_URL =
      config.weatherApiUrl || 'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0';
    this.API_KEY = config.weatherApiKey;

    if (!this.API_KEY) {
      logger.warn('Weather API key is not configured');
    }
  }

  /**
   * 위경도를 기상청 격자 좌표로 변환
   * 기상청 격자 변환 공식 사용
   */
  public convertToGrid(latitude: number, longitude: number): GridCoordinate {
    const DEGRAD = Math.PI / 180.0;

    const re = this.RE / this.GRID;
    const slat1 = this.SLAT1 * DEGRAD;
    const slat2 = this.SLAT2 * DEGRAD;
    const olon = this.OLON * DEGRAD;
    const olat = this.OLAT * DEGRAD;

    let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
    sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
    let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
    sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
    let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
    ro = (re * sf) / Math.pow(ro, sn);

    let ra = Math.tan(Math.PI * 0.25 + latitude * DEGRAD * 0.5);
    ra = (re * sf) / Math.pow(ra, sn);
    const theta = longitude * DEGRAD - olon;
    const nx = Math.floor(ra * Math.sin(theta * sn) + this.XO + 0.5);
    const ny = Math.floor(ro - ra * Math.cos(theta * sn) + this.YO + 0.5);

    return { nx, ny };
  }

  /**
   * 날씨 데이터 조회 (캐싱 적용)
   */
  public async getWeather(latitude: number, longitude: number): Promise<WeatherData> {
    try {
      // 캐시 키 생성
      const cacheKey = cacheService.generateKey('weather', {
        lat: latitude,
        lon: longitude,
      });

      // 캐시 확인
      const cachedData = await cacheService.get<WeatherData>(cacheKey);
      if (cachedData) {
        logger.info('Weather data retrieved from cache', {
          latitude,
          longitude,
          cacheKey,
        });
        return cachedData;
      }

      // 위경도를 격자 좌표로 변환
      const grid = this.convertToGrid(latitude, longitude);

      // 현재 시간 기준으로 baseDate, baseTime 설정
      const now = new Date();
      const { baseDate, baseTime } = this.getBaseDateTime(now);

      logger.info('Fetching weather data from API', {
        latitude,
        longitude,
        grid,
        baseDate,
        baseTime,
      });

      // API 키 디코딩 (공공데이터포털 API 키는 이미 인코딩된 상태로 제공됨)
      const decodedApiKey = decodeURIComponent(this.API_KEY);

      // 기상청 API 호출
      const response = await axios.get<KmaApiResponse>(`${this.API_BASE_URL}/getUltraSrtFcst`, {
        params: {
          serviceKey: decodedApiKey,
          numOfRows: 60,
          pageNo: 1,
          dataType: 'JSON',
          base_date: baseDate,
          base_time: baseTime,
          nx: grid.nx,
          ny: grid.ny,
        },
        timeout: 10000,
      });

      // 응답 검증
      if (response.data.response.header.resultCode !== '00') {
        throw new ExternalApiError(
          `기상청 API 오류: ${response.data.response.header.resultMsg}`,
          response.data.response.header.resultCode
        );
      }

      const items = response.data.response.body.items.item;

      if (!items || items.length === 0) {
        throw new ExternalApiError('날씨 데이터가 없습니다', 'NO_DATA');
      }

      // 데이터 파싱
      const weatherData = this.parseWeatherData(items);

      // 캐시에 저장
      await cacheService.set(cacheKey, weatherData, WEATHER_CACHE_TTL);
      logger.info('Weather data cached', {
        cacheKey,
        ttl: WEATHER_CACHE_TTL,
      });

      return weatherData;
    } catch (error) {
      if (error instanceof ExternalApiError) {
        throw error;
      }

      logger.error('Weather API 호출 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
        latitude,
        longitude,
      });

      throw new ExternalApiError('날씨 데이터를 가져오는데 실패했습니다');
    }
  }

  /**
   * 기상청 API 응답 데이터 파싱
   */
  private parseWeatherData(items: KmaApiItem[]): WeatherData {
    const dataMap: { [key: string]: string } = {};

    items.forEach(item => {
      dataMap[item.category] = item.fcstValue;
    });

    // 필수 데이터 검증
    if (!dataMap['T1H'] || !dataMap['SKY']) {
      throw new ExternalApiError('필수 날씨 데이터가 누락되었습니다', 'MISSING_DATA');
    }

    // 날짜 파싱 (YYYYMMDD 형식을 안전하게 파싱)
    const fcstDateStr = items[0].fcstDate;
    const year = parseInt(fcstDateStr.substring(0, 4));
    const month = parseInt(fcstDateStr.substring(4, 6)) - 1; // 월은 0부터 시작
    const day = parseInt(fcstDateStr.substring(6, 8));
    const forecastDate = new Date(year, month, day);

    return {
      temperature: parseFloat(dataMap['T1H']) || 0, // 기온
      humidity: parseInt(dataMap['REH']) || 0, // 습도
      precipitationProbability: 0, // 초단기예보에는 없음
      precipitation: parseFloat(dataMap['RN1']) || 0, // 1시간 강수량
      windSpeed: parseFloat(dataMap['WSD']) || 0, // 풍속
      skyCondition: this.formatSkyCondition(dataMap['SKY']), // 하늘 상태
      precipitationType: this.formatPrecipitationType(dataMap['PTY']), // 강수 형태
      forecastDate: forecastDate.toISOString(), // ISO 8601 형식으로 변환
      forecastTime: items[0].fcstTime,
    };
  }

  /**
   * 하늘 상태 코드를 텍스트로 변환
   */
  public formatSkyCondition(code: string): string {
    const skyConditions: { [key: string]: string } = {
      '1': '맑음',
      '3': '구름많음',
      '4': '흐림',
    };

    return skyConditions[code] || '알 수 없음';
  }

  /**
   * 강수 형태 코드를 텍스트로 변환
   */
  public formatPrecipitationType(code: string): string {
    const precipitationTypes: { [key: string]: string } = {
      '0': '없음',
      '1': '비',
      '2': '비/눈',
      '3': '눈',
      '4': '소나기',
    };

    return precipitationTypes[code] || '없음';
  }

  /**
   * 날짜를 YYYYMMDD 형식으로 포맷
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  /**
   * 기상청 초단기예보 API의 base_date와 base_time 계산
   * 초단기예보는 매시 45분에 발표되며, base_time은 정시(HH00) 형식
   * 자정 처리를 포함하여 날짜와 시간을 함께 조정
   */
  private getBaseDateTime(now: Date): { baseDate: string; baseTime: string } {
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // 기준 시간을 Date 객체로 생성 (자정 처리 자동화)
    const baseDateTime = new Date(now);

    // 45분 이전이면 이전 시간의 데이터 사용
    if (currentMinute < 45) {
      baseDateTime.setHours(currentHour - 1);
    }
    // 45분 이후면 현재 시간 데이터 사용 가능

    const baseDate = this.formatDate(baseDateTime);
    const baseHour = baseDateTime.getHours();
    const baseTime = String(baseHour).padStart(2, '0') + '00';

    return { baseDate, baseTime };
  }
}
