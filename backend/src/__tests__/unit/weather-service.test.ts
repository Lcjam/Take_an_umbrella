import { WeatherService } from '../../services/weather-service';
import { WeatherData, GridCoordinate } from '../../types/weather';
import axios from 'axios';

// axios 모킹
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WeatherService', () => {
  let weatherService: WeatherService;

  beforeEach(() => {
    weatherService = new WeatherService();
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('WeatherService 인스턴스가 정상적으로 생성되어야 함', () => {
      expect(weatherService).toBeDefined();
      expect(weatherService).toBeInstanceOf(WeatherService);
    });
  });

  describe('convertToGrid', () => {
    test('위경도를 격자 좌표로 변환할 수 있어야 함', () => {
      // 서울 시청 좌표
      const latitude = 37.5665;
      const longitude = 126.978;

      const grid: GridCoordinate = weatherService.convertToGrid(latitude, longitude);

      expect(grid).toBeDefined();
      expect(grid.nx).toBeGreaterThan(0);
      expect(grid.ny).toBeGreaterThan(0);
      expect(Number.isInteger(grid.nx)).toBe(true);
      expect(Number.isInteger(grid.ny)).toBe(true);
    });

    test('부산 좌표를 올바르게 변환해야 함', () => {
      // 부산 시청 좌표
      const latitude = 35.1796;
      const longitude = 129.0756;

      const grid: GridCoordinate = weatherService.convertToGrid(latitude, longitude);

      expect(grid).toBeDefined();
      expect(grid.nx).toBeGreaterThan(0);
      expect(grid.ny).toBeGreaterThan(0);
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
});
