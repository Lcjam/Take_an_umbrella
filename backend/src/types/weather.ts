/**
 * 기상청 API 관련 타입 정의
 */

/**
 * 날씨 데이터 (기상청 API 응답 기반)
 */
export interface WeatherData {
  /** 기온 (°C) */
  temperature: number;
  /** 습도 (%) */
  humidity: number;
  /** 강수 확률 (%) */
  precipitationProbability: number;
  /** 강수량 (mm) */
  precipitation: number;
  /** 풍속 (m/s) */
  windSpeed: number;
  /** 하늘 상태 (맑음, 구름많음, 흐림 등) */
  skyCondition: string;
  /** 강수 형태 (없음, 비, 눈, 비/눈 등) */
  precipitationType: string;
  /** 예보 날짜 */
  forecastDate: Date;
  /** 예보 시간 */
  forecastTime: string;
}

/**
 * 기상청 API 요청 파라미터
 */
export interface WeatherApiParams {
  /** 위도 */
  latitude: number;
  /** 경도 */
  longitude: number;
  /** 예보 날짜 (YYYYMMDD) */
  baseDate?: string;
  /** 예보 시간 (HHMM) */
  baseTime?: string;
}

/**
 * 기상청 API 원본 응답 (초단기예보)
 */
export interface KmaApiResponse {
  response: {
    header: {
      resultCode: string;
      resultMsg: string;
    };
    body: {
      dataType: string;
      items: {
        item: KmaApiItem[];
      };
      pageNo: number;
      numOfRows: number;
      totalCount: number;
    };
  };
}

/**
 * 기상청 API 아이템 (개별 예보 데이터)
 */
export interface KmaApiItem {
  baseDate: string; // 발표일자 (YYYYMMDD)
  baseTime: string; // 발표시간 (HHMM)
  category: string; // 자료구분코드 (T1H, RN1, REH, PTY, SKY 등)
  fcstDate: string; // 예보일자 (YYYYMMDD)
  fcstTime: string; // 예보시간 (HHMM)
  fcstValue: string; // 예보값
  nx: number; // 격자 X 좌표
  ny: number; // 격자 Y 좌표
}

/**
 * 격자 좌표 (기상청 API용)
 */
export interface GridCoordinate {
  /** 격자 X 좌표 */
  nx: number;
  /** 격자 Y 좌표 */
  ny: number;
}

/**
 * 위경도 좌표
 */
export interface GeoCoordinate {
  /** 위도 */
  latitude: number;
  /** 경도 */
  longitude: number;
}

