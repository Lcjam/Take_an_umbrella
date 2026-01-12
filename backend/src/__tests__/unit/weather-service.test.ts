import { WeatherService } from '../../services/weather-service';
import { WeatherData, GridCoordinate } from '../../types/weather';
import axios from 'axios';
import { RedisClient } from '../../lib/redis';

// axios 모킹
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WeatherService', () => {
  let weatherService: WeatherService;

  beforeAll(async () => {
    // Redis 연결 확인
    const redis = RedisClient.getInstance();
    await redis.ping();
  });

  beforeEach(async () => {
    weatherService = new WeatherService();
    jest.clearAllMocks();

    // 테스트 전에 캐시 초기화
    const redis = RedisClient.getInstance();
    await redis.flushdb();
  });

  afterAll(async () => {
    await RedisClient.disconnect();
  });

  describe('Constructor', () => {
    test('WeatherService 인스턴스가 정상적으로 생성되어야 함', () => {
      expect(weatherService).toBeDefined();
      expect(weatherService).toBeInstanceOf(WeatherService);
    });
  });

  describe('convertToGrid', () => {
    test('서울 시청 좌표를 정확하게 변환해야 함', () => {
      // 서울 시청 좌표 (기상청 공식 예제)
      const latitude = 37.5665;
      const longitude = 126.978;

      const grid: GridCoordinate = weatherService.convertToGrid(latitude, longitude);

      // 기상청 공식 문서 기준 정확한 값
      expect(grid.nx).toBe(60);
      expect(grid.ny).toBe(127);
    });

    test('부산 시청 좌표를 정확하게 변환해야 함', () => {
      // 부산 시청 좌표
      const latitude = 35.1796;
      const longitude = 129.0756;

      const grid: GridCoordinate = weatherService.convertToGrid(latitude, longitude);

      // 기상청 기준 부산 격자 좌표
      expect(grid.nx).toBe(98);
      expect(grid.ny).toBe(76);
    });

    test('변환된 좌표는 정수여야 함', () => {
      const latitude = 37.5665;
      const longitude = 126.978;

      const grid: GridCoordinate = weatherService.convertToGrid(latitude, longitude);

      expect(Number.isInteger(grid.nx)).toBe(true);
      expect(Number.isInteger(grid.ny)).toBe(true);
    });
  });

  describe('getWeather', () => {
    test('날씨 데이터를 성공적으로 가져와야 함', async () => {
      // Mock 응답 데이터
      const mockResponse = {
        data: {
          response: {
            header: {
              resultCode: '00',
              resultMsg: 'NORMAL_SERVICE',
            },
            body: {
              dataType: 'JSON',
              items: {
                item: [
                  {
                    baseDate: '20260102',
                    baseTime: '2300',
                    category: 'T1H',
                    fcstDate: '20260102',
                    fcstTime: '2300',
                    fcstValue: '5',
                    nx: 60,
                    ny: 127,
                  },
                  {
                    baseDate: '20260102',
                    baseTime: '2300',
                    category: 'REH',
                    fcstDate: '20260102',
                    fcstTime: '2300',
                    fcstValue: '70',
                    nx: 60,
                    ny: 127,
                  },
                  {
                    baseDate: '20260102',
                    baseTime: '2300',
                    category: 'PTY',
                    fcstDate: '20260102',
                    fcstTime: '2300',
                    fcstValue: '0',
                    nx: 60,
                    ny: 127,
                  },
                  {
                    baseDate: '20260102',
                    baseTime: '2300',
                    category: 'SKY',
                    fcstDate: '20260102',
                    fcstTime: '2300',
                    fcstValue: '1',
                    nx: 60,
                    ny: 127,
                  },
                ],
              },
              pageNo: 1,
              numOfRows: 10,
              totalCount: 4,
            },
          },
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const latitude = 37.5665;
      const longitude = 126.978;

      const weather: WeatherData = await weatherService.getWeather(latitude, longitude);

      expect(weather).toBeDefined();
      expect(weather.temperature).toBeDefined();
      expect(weather.humidity).toBeDefined();
      expect(weather.skyCondition).toBeDefined();
      expect(weather.precipitationType).toBeDefined();
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    test('API 호출 실패 시 에러를 던져야 함', async () => {
      mockedAxios.get.mockRejectedValue(new Error('API Error'));

      const latitude = 37.5665;
      const longitude = 126.978;

      await expect(weatherService.getWeather(latitude, longitude)).rejects.toThrow();
    });

    test('잘못된 API 응답 시 에러를 던져야 함', async () => {
      const mockResponse = {
        data: {
          response: {
            header: {
              resultCode: '03',
              resultMsg: 'NO_DATA',
            },
            body: {
              items: {
                item: [],
              },
            },
          },
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const latitude = 37.5665;
      const longitude = 126.978;

      await expect(weatherService.getWeather(latitude, longitude)).rejects.toThrow();
    });
  });

  describe('formatSkyCondition', () => {
    test('하늘 상태 코드를 텍스트로 변환해야 함', () => {
      expect(weatherService.formatSkyCondition('1')).toBe('맑음');
      expect(weatherService.formatSkyCondition('3')).toBe('구름많음');
      expect(weatherService.formatSkyCondition('4')).toBe('흐림');
    });
  });

  describe('formatPrecipitationType', () => {
    test('강수 형태 코드를 텍스트로 변환해야 함', () => {
      expect(weatherService.formatPrecipitationType('0')).toBe('없음');
      expect(weatherService.formatPrecipitationType('1')).toBe('비');
      expect(weatherService.formatPrecipitationType('2')).toBe('비/눈');
      expect(weatherService.formatPrecipitationType('3')).toBe('눈');
      expect(weatherService.formatPrecipitationType('4')).toBe('소나기');
    });
  });

  describe('캐싱 (Caching)', () => {
    const mockResponse = {
      data: {
        response: {
          header: {
            resultCode: '00',
            resultMsg: 'NORMAL_SERVICE',
          },
          body: {
            dataType: 'JSON',
            items: {
              item: [
                {
                  baseDate: '20260102',
                  baseTime: '2300',
                  category: 'T1H',
                  fcstDate: '20260102',
                  fcstTime: '2300',
                  fcstValue: '5',
                  nx: 60,
                  ny: 127,
                },
                {
                  baseDate: '20260102',
                  baseTime: '2300',
                  category: 'REH',
                  fcstDate: '20260102',
                  fcstTime: '2300',
                  fcstValue: '70',
                  nx: 60,
                  ny: 127,
                },
                {
                  baseDate: '20260102',
                  baseTime: '2300',
                  category: 'PTY',
                  fcstDate: '20260102',
                  fcstTime: '2300',
                  fcstValue: '0',
                  nx: 60,
                  ny: 127,
                },
                {
                  baseDate: '20260102',
                  baseTime: '2300',
                  category: 'SKY',
                  fcstDate: '20260102',
                  fcstTime: '2300',
                  fcstValue: '1',
                  nx: 60,
                  ny: 127,
                },
              ],
            },
            pageNo: 1,
            numOfRows: 10,
            totalCount: 4,
          },
        },
      },
    };

    test('첫 번째 호출은 API를 호출하고 캐시에 저장해야 함', async () => {
      mockedAxios.get.mockResolvedValue(mockResponse);

      const latitude = 37.5665;
      const longitude = 126.978;

      const weather = await weatherService.getWeather(latitude, longitude);

      expect(weather).toBeDefined();
      expect(weather.temperature).toBe(5);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    test('같은 좌표로 두 번째 호출 시 캐시에서 가져와야 함 (API 호출 안 함)', async () => {
      mockedAxios.get.mockResolvedValue(mockResponse);

      const latitude = 37.5665;
      const longitude = 126.978;

      // 첫 번째 호출
      const weather1 = await weatherService.getWeather(latitude, longitude);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);

      // 두 번째 호출 (캐시에서 가져옴)
      const weather2 = await weatherService.getWeather(latitude, longitude);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1); // 여전히 1번만 호출됨

      expect(weather1).toEqual(weather2);
    });

    test('다른 좌표는 캐시 미스가 되어 API를 다시 호출해야 함', async () => {
      mockedAxios.get.mockResolvedValue(mockResponse);

      // 서울
      await weatherService.getWeather(37.5665, 126.978);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);

      // 부산 (다른 좌표)
      await weatherService.getWeather(35.1796, 129.0756);
      expect(mockedAxios.get).toHaveBeenCalledTimes(2); // 2번 호출됨
    });
  });
});
