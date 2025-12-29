# Sequence Diagrams

## 1. 사용자 온보딩 시퀀스

```mermaid
sequenceDiagram
    participant User
    participant FlutterApp
    participant BackendAPI
    participant Database

    User->>FlutterApp: 앱 실행
    FlutterApp->>FlutterApp: 디바이스 ID 조회
    FlutterApp->>BackendAPI: POST /api/users<br/>{device_id}
    BackendAPI->>Database: 사용자 조회 (device_id)
    alt 사용자 없음
        Database-->>BackendAPI: Not Found
        BackendAPI->>Database: 사용자 생성
        Database-->>BackendAPI: User Created
    else 사용자 있음
        Database-->>BackendAPI: User Found
    end
    BackendAPI-->>FlutterApp: User Info
    FlutterApp->>User: 위치 권한 요청
    User->>FlutterApp: 위치 허용
    FlutterApp->>FlutterApp: 현재 위치 조회
    FlutterApp->>User: 위치 확인 화면
    User->>FlutterApp: 위치 확인
    FlutterApp->>User: 알림 시간 설정 화면
    User->>FlutterApp: 알림 시간 입력 (08:00)
    User->>FlutterApp: 출발 시간 입력 (08:30)
    FlutterApp->>BackendAPI: PUT /api/settings<br/>{location, times, fcm_token}
    BackendAPI->>Database: 설정 저장/업데이트
    Database-->>BackendAPI: Settings Saved
    BackendAPI-->>FlutterApp: Settings Confirmed
    FlutterApp->>User: 메인 화면 표시
```

## 2. 알림 발송 시퀀스

```mermaid
sequenceDiagram
    participant Scheduler
    participant BackendAPI
    participant Database
    participant WeatherAPI
    participant MLServer
    participant FCM
    participant UserDevice

    Note over Scheduler: 매시간 실행 (예: 08:00)
    Scheduler->>BackendAPI: 알림 발송 요청
    BackendAPI->>Database: 알림 시간 사용자 조회<br/>SELECT * FROM user_settings<br/>WHERE notification_time = '08:00'
    Database-->>BackendAPI: User List
    
    loop 각 사용자별 처리
        BackendAPI->>Database: 날씨 데이터 조회<br/>(location, date, time)
        alt 캐시 있음
            Database-->>BackendAPI: Weather Data (Cached)
        else 캐시 없음
            BackendAPI->>WeatherAPI: 기상청 API 호출
            WeatherAPI-->>BackendAPI: Weather Data
            BackendAPI->>Database: 날씨 데이터 저장
        end
        
        BackendAPI->>Database: ML 모델 파라미터 조회<br/>SELECT * FROM user_ml_models<br/>WHERE user_id = ? ORDER BY version DESC
        alt 모델 파라미터 있음
            Database-->>BackendAPI: Model Parameters
            BackendAPI->>BackendAPI: 개인화된 체감온도 계산<br/>(ML 모델 적용)
        else 모델 파라미터 없음
            Database-->>BackendAPI: No Model
            BackendAPI->>BackendAPI: 일반 추천 규칙 적용
        end
        
        BackendAPI->>BackendAPI: 추천 생성<br/>(옷차림, 소지품)
        BackendAPI->>Database: 알림 로그 저장<br/>INSERT INTO notification_logs
        BackendAPI->>FCM: 푸시 알림 발송<br/>POST /v1/projects/xxx/messages
        FCM->>UserDevice: 푸시 알림 전송
        UserDevice->>UserDevice: 알림 표시
        BackendAPI->>Database: 알림 상태 업데이트<br/>UPDATE notification_logs<br/>SET status = 'sent'
    end
```

## 3. 날씨 데이터 조회 시퀀스

```mermaid
sequenceDiagram
    participant User
    participant FlutterApp
    participant BackendAPI
    participant Redis
    participant Database
    participant WeatherAPI

    User->>FlutterApp: 날씨 확인 버튼 클릭
    FlutterApp->>BackendAPI: GET /api/weather<br/>?latitude=37.5665&longitude=126.9780
    BackendAPI->>Redis: 캐시 확인<br/>GET weather:{lat}:{lng}:{date}:{time}
    
    alt Redis 캐시 있음
        Redis-->>BackendAPI: Cached Data
        BackendAPI-->>FlutterApp: Weather Data (Cached)
    else Redis 캐시 없음
        BackendAPI->>Database: 날씨 데이터 조회<br/>SELECT * FROM weather_data<br/>WHERE location = ? AND date = ?
        
        alt DB에 데이터 있음
            Database-->>BackendAPI: Weather Data
            BackendAPI->>Redis: 캐시 저장 (1시간 TTL)
            BackendAPI-->>FlutterApp: Weather Data
        else DB에 데이터 없음
            BackendAPI->>WeatherAPI: 기상청 API 호출<br/>GET /VilageFcstInfoService_2.0/...
            WeatherAPI-->>BackendAPI: Weather Data
            BackendAPI->>Database: 날씨 데이터 저장
            BackendAPI->>Redis: 캐시 저장 (1시간 TTL)
            BackendAPI-->>FlutterApp: Weather Data
        end
    end
    
    FlutterApp->>User: 날씨 정보 표시
```

## 4. 피드백 제출 시퀀스

```mermaid
sequenceDiagram
    participant User
    participant FlutterApp
    participant BackendAPI
    participant Database
    participant MLServer

    User->>FlutterApp: 알림 클릭
    FlutterApp->>User: 피드백 화면 표시
    User->>FlutterApp: 별점 선택 (2점)
    User->>FlutterApp: 세부사항 입력<br/>"더웠어요"
    FlutterApp->>BackendAPI: POST /api/feedbacks<br/>{notification_log_id, rating, feedback_text}
    
    BackendAPI->>Database: 피드백 저장<br/>INSERT INTO feedbacks<br/>(초기 nlp_analysis = null)
    Database-->>BackendAPI: Feedback Saved
    
    BackendAPI->>MLServer: POST /ml/analyze-feedback<br/>{text, rating}
    MLServer->>MLServer: NLP 분석 수행<br/>(키워드 추출, 감정 분석)
    MLServer-->>BackendAPI: NLP Analysis Result
    
    BackendAPI->>Database: NLP 분석 결과 업데이트<br/>UPDATE feedbacks<br/>SET nlp_analysis = ?
    Database-->>BackendAPI: Updated
    
    BackendAPI->>Database: 피드백 개수 확인<br/>SELECT COUNT(*) FROM feedbacks<br/>WHERE user_id = ?
    Database-->>BackendAPI: Feedback Count (예: 20)
    
    alt 피드백 개수 >= 20
        BackendAPI->>MLServer: POST /ml/train-model<br/>{user_id, feedback_count}
        MLServer->>Database: 피드백 데이터 조회<br/>SELECT f.*, nl.*, wd.*<br/>FROM feedbacks f JOIN ...
        Database-->>MLServer: Training Data
        MLServer->>MLServer: ML 모델 학습<br/>(선형 회귀 또는 랜덤 포레스트)
        MLServer->>Database: 모델 파라미터 저장<br/>INSERT INTO user_ml_models
        Database-->>MLServer: Model Saved
        MLServer-->>BackendAPI: Model Trained
    end
    
    BackendAPI-->>FlutterApp: Feedback Saved<br/>{id, nlp_analysis}
    FlutterApp->>User: 감사 메시지 표시
```

## 5. 개인화된 추천 조회 시퀀스

```mermaid
sequenceDiagram
    participant User
    participant FlutterApp
    participant BackendAPI
    participant Database
    participant MLServer

    User->>FlutterApp: 추천 확인 버튼 클릭
    FlutterApp->>BackendAPI: GET /api/recommendations<br/>X-Device-ID: {device_id}
    
    BackendAPI->>Database: 사용자 설정 조회<br/>SELECT * FROM user_settings<br/>WHERE user_id = ?
    Database-->>BackendAPI: User Settings
    
    BackendAPI->>Database: 날씨 데이터 조회<br/>SELECT * FROM weather_data<br/>WHERE location = ? AND date = ?
    Database-->>BackendAPI: Weather Data
    
    BackendAPI->>Database: ML 모델 파라미터 조회<br/>SELECT * FROM user_ml_models<br/>WHERE user_id = ?<br/>ORDER BY version DESC LIMIT 1
    
    alt 모델 파라미터 있음
        Database-->>BackendAPI: Model Parameters
        BackendAPI->>BackendAPI: 개인화된 체감온도 계산<br/>feels_like = base_feels_like<br/>+ ML_model(temperature, wind, ...)
        BackendAPI->>BackendAPI: 개인화된 추천 생성<br/>(체감온도 기반)
    else 모델 파라미터 없음
        Database-->>BackendAPI: No Model
        BackendAPI->>Database: 기본 추천 규칙 조회<br/>SELECT * FROM recommendation_rules<br/>WHERE enabled = true
        Database-->>BackendAPI: Recommendation Rules
        BackendAPI->>BackendAPI: 일반 추천 생성<br/>(기본 규칙 적용)
    end
    
    BackendAPI-->>FlutterApp: Recommendation<br/>{weather, personalized_feels_like,<br/>recommendation, personalization_level}
    FlutterApp->>User: 추천 정보 표시
```

## 6. ML 모델 학습 시퀀스 (상세)

```mermaid
sequenceDiagram
    participant BackendAPI
    participant Database
    participant MLServer

    Note over BackendAPI: 피드백 20개 달성 시 트리거
    BackendAPI->>MLServer: POST /ml/train-model<br/>{user_id, feedback_count}
    
    MLServer->>Database: 피드백 데이터 조회<br/>SELECT f.*, nl.recommendation, wd.*<br/>FROM feedbacks f<br/>JOIN notification_logs nl<br/>JOIN weather_data wd<br/>WHERE f.user_id = ?<br/>ORDER BY f.created_at DESC<br/>LIMIT 20
    Database-->>MLServer: Training Data (20개)
    
    MLServer->>MLServer: 학습 데이터 준비<br/>(입력: 날씨 조건)<br/>(출력: 체감온도 보정값)
    
    alt 피드백 5~19개
        MLServer->>MLServer: 선형 회귀 모델 학습
    else 피드백 20~49개
        MLServer->>MLServer: 랜덤 포레스트 모델 학습
    else 피드백 50개 이상
        MLServer->>MLServer: 신경망 모델 학습
    end
    
    MLServer->>MLServer: 교차 검증 수행
    MLServer->>MLServer: 정확도 계산
    
    MLServer->>Database: 모델 파라미터 저장<br/>INSERT INTO user_ml_models<br/>{model_type, parameters, accuracy}
    Database-->>MLServer: Model Saved
    
    MLServer-->>BackendAPI: Model Trained<br/>{model_version, accuracy, parameters}
    
    Note over BackendAPI: 다음 알림부터 개인화 적용
```

## 7. 알림 재시도 시퀀스

```mermaid
sequenceDiagram
    participant Scheduler
    participant BackendAPI
    participant FCM
    participant RetryQueue
    participant Database

    Scheduler->>BackendAPI: 알림 발송 요청
    BackendAPI->>FCM: 푸시 알림 발송
    alt 발송 성공
        FCM-->>BackendAPI: Success
        BackendAPI->>Database: 알림 상태 업데이트<br/>UPDATE notification_logs<br/>SET status = 'sent'
    else 발송 실패
        FCM-->>BackendAPI: Error (예: Invalid Token)
        BackendAPI->>Database: 알림 상태 업데이트<br/>UPDATE notification_logs<br/>SET status = 'failed',<br/>error_message = ?
        BackendAPI->>RetryQueue: 재시도 작업 추가<br/>INSERT INTO retry_queue<br/>{notification_id, retry_count, next_retry_at}
    end
    
    Note over RetryQueue: 재시도 스케줄러 (1분, 5분, 15분)
    RetryQueue->>BackendAPI: 재시도 요청
    BackendAPI->>Database: 재시도 횟수 확인<br/>SELECT retry_count FROM retry_queue
    
    alt 재시도 횟수 < 3
        BackendAPI->>FCM: 푸시 알림 재발송
        alt 재발송 성공
            FCM-->>BackendAPI: Success
            BackendAPI->>Database: 알림 상태 업데이트<br/>SET status = 'sent'
            BackendAPI->>RetryQueue: 재시도 작업 삭제
        else 재발송 실패
            FCM-->>BackendAPI: Error
            BackendAPI->>RetryQueue: 재시도 횟수 증가<br/>UPDATE retry_count = retry_count + 1<br/>UPDATE next_retry_at = NOW() + interval
        end
    else 재시도 횟수 >= 3
        BackendAPI->>Database: 최종 실패 처리<br/>UPDATE notification_logs<br/>SET status = 'failed_permanently'
        BackendAPI->>RetryQueue: 재시도 작업 삭제
    end
```

## 8. 사용자 설정 변경 시퀀스

```mermaid
sequenceDiagram
    participant User
    participant FlutterApp
    participant BackendAPI
    participant Database

    User->>FlutterApp: 설정 화면 열기
    FlutterApp->>BackendAPI: GET /api/settings<br/>X-Device-ID: {device_id}
    BackendAPI->>Database: 사용자 설정 조회
    Database-->>BackendAPI: Current Settings
    BackendAPI-->>FlutterApp: Settings Data
    FlutterApp->>User: 현재 설정 표시
    
    User->>FlutterApp: 알림 시간 변경 (09:00)
    FlutterApp->>BackendAPI: PUT /api/settings<br/>{notification_time: "09:00:00"}
    BackendAPI->>BackendAPI: 데이터 검증
    alt 검증 실패
        BackendAPI-->>FlutterApp: Validation Error
        FlutterApp->>User: 에러 메시지 표시
    else 검증 성공
        BackendAPI->>Database: 설정 업데이트<br/>UPDATE user_settings<br/>SET notification_time = ?<br/>WHERE user_id = ?
        Database-->>BackendAPI: Updated
        BackendAPI-->>FlutterApp: Settings Updated
        FlutterApp->>User: 설정 변경 완료 표시
    end
```

## 9. NLP 분석 시퀀스 (상세)

```mermaid
sequenceDiagram
    participant BackendAPI
    participant MLServer
    participant NLPModel

    BackendAPI->>MLServer: POST /ml/analyze-feedback<br/>{text: "더웠어요", rating: 2}
    
    MLServer->>NLPModel: 텍스트 분석 요청
    
    alt Phase 1: 키워드 기반 분석
        NLPModel->>NLPModel: 키워드 매칭<br/>- "더웠어요" → temperature_perception: "hot"<br/>- "너무" → intensity: "high"
        NLPModel-->>MLServer: Analysis Result
    else Phase 2: 감정 분석 모델 (고급)
        NLPModel->>NLPModel: KoBERT/KoELECTRA 모델 실행<br/>- 감정 분석: "negative"<br/>- 체감온도: "hot"<br/>- 옷차림: "too_thick"
        NLPModel-->>MLServer: Analysis Result
    end
    
    MLServer->>MLServer: 구조화된 정보 추출<br/>{sentiment, temperature_perception,<br/>keywords, extracted_info}
    MLServer-->>BackendAPI: NLP Analysis<br/>{sentiment: "negative",<br/>temperature_perception: "hot",<br/>keywords: ["더웠어요"],<br/>extracted_info: {...}}
    
    BackendAPI->>BackendAPI: 분석 결과 저장 준비
```

## 10. 전체 시스템 상호작용 시퀀스 (통합)

```mermaid
sequenceDiagram
    participant User
    participant FlutterApp
    participant BackendAPI
    participant Database
    participant WeatherAPI
    participant MLServer
    participant FCM

    Note over User,FCM: Day 1: 초기 설정
    User->>FlutterApp: 앱 설치 및 실행
    FlutterApp->>BackendAPI: 사용자 생성
    BackendAPI->>Database: 사용자 저장
    FlutterApp->>BackendAPI: 설정 저장
    BackendAPI->>Database: 설정 저장
    
    Note over User,FCM: Day 2: 첫 알림
    BackendAPI->>WeatherAPI: 날씨 데이터 조회
    WeatherAPI-->>BackendAPI: Weather Data
    BackendAPI->>Database: 날씨 데이터 저장
    BackendAPI->>Database: 일반 추천 규칙 조회
    BackendAPI->>FCM: 알림 발송
    FCM->>User: 알림 수신
    User->>FlutterApp: 피드백 제공 (별점 2점)
    FlutterApp->>BackendAPI: 피드백 저장
    BackendAPI->>MLServer: NLP 분석 요청
    MLServer-->>BackendAPI: Analysis Result
    BackendAPI->>Database: 피드백 및 분석 결과 저장
    
    Note over User,FCM: Day 21: 피드백 20개 달성
    BackendAPI->>MLServer: 모델 학습 요청
    MLServer->>Database: 피드백 데이터 조회
    MLServer->>MLServer: 모델 학습 수행
    MLServer->>Database: 모델 파라미터 저장
    
    Note over User,FCM: Day 22: 개인화된 알림
    BackendAPI->>WeatherAPI: 날씨 데이터 조회
    BackendAPI->>Database: ML 모델 파라미터 조회
    BackendAPI->>BackendAPI: 개인화된 체감온도 계산
    BackendAPI->>BackendAPI: 개인화된 추천 생성
    BackendAPI->>FCM: 개인화된 알림 발송
    FCM->>User: 개인화된 알림 수신
```

## 시퀀스 다이어그램 요약

| 시퀀스 | 주요 액터 | 설명 |
|--------|----------|------|
| **사용자 온보딩** | User, FlutterApp, BackendAPI, Database | 앱 설치부터 설정 완료까지 |
| **알림 발송** | Scheduler, BackendAPI, Database, WeatherAPI, MLServer, FCM | 정기 알림 발송 프로세스 |
| **날씨 데이터 조회** | User, FlutterApp, BackendAPI, Redis, Database, WeatherAPI | 날씨 데이터 캐싱 전략 |
| **피드백 제출** | User, FlutterApp, BackendAPI, Database, MLServer | 피드백 저장 및 NLP 분석 |
| **개인화된 추천** | User, FlutterApp, BackendAPI, Database, MLServer | ML 모델 기반 추천 생성 |
| **ML 모델 학습** | BackendAPI, Database, MLServer | 사용자별 모델 학습 프로세스 |
| **알림 재시도** | Scheduler, BackendAPI, FCM, RetryQueue | 실패한 알림 재시도 로직 |
| **설정 변경** | User, FlutterApp, BackendAPI, Database | 사용자 설정 업데이트 |
| **NLP 분석** | BackendAPI, MLServer, NLPModel | 피드백 텍스트 분석 |
| **전체 시스템** | 모든 컴포넌트 | 전체 시스템 통합 흐름 |

