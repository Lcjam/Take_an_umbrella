# API Documentation

## Base URL

```
Development: http://localhost:3000
Production: https://api.take-an-umbrella.com
```

## Authentication

현재는 디바이스 ID 기반 인증을 사용합니다. (회원가입 불필요)

### Request Headers

```
Content-Type: application/json
X-Device-ID: {device_id}  // iOS: identifierForVendor, Android: Android ID
```

## Common Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Success"
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "details": { ... }
  }
}
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | 요청 데이터 검증 실패 |
| `UNAUTHORIZED` | 401 | 인증 실패 |
| `NOT_FOUND` | 404 | 리소스를 찾을 수 없음 |
| `CONFLICT` | 409 | 리소스 충돌 (예: 이미 존재함) |
| `INTERNAL_ERROR` | 500 | 서버 내부 오류 |
| `EXTERNAL_API_ERROR` | 502 | 외부 API 오류 (기상청 API 등) |

---

## 1. Users API

### 1.1 Create or Get User

사용자를 생성하거나 조회합니다. 디바이스 ID로 사용자를 식별합니다.

**Endpoint:** `POST /api/users`

**Request Body:**

```json
{
  "device_id": "ios-uuid-1234-5678-90ab-cdef",
  "anonymous_id": "optional-anonymous-id"  // 선택사항
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "device_id": "ios-uuid-1234-5678-90ab-cdef",
    "created_at": "2024-01-15T08:00:00Z"
  },
  "message": "User created successfully"
}
```

**Response (200 OK - 기존 사용자):**

```json
{
  "success": true,
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "device_id": "ios-uuid-1234-5678-90ab-cdef",
    "created_at": "2024-01-10T08:00:00Z",
    "last_active_at": "2024-01-15T08:00:00Z"
  },
  "message": "User found"
}
```

**Error Responses:**

```json
// 400 Bad Request
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "device_id is required"
  }
}
```

---

### 1.2 Get User

사용자 정보를 조회합니다.

**Endpoint:** `GET /api/users/:user_id`

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "device_id": "ios-uuid-1234-5678-90ab-cdef",
    "created_at": "2024-01-15T08:00:00Z",
    "last_active_at": "2024-01-15T08:00:00Z"
  }
}
```

---

## 2. Settings API

### 2.1 Get User Settings

사용자 설정을 조회합니다.

**Endpoint:** `GET /api/settings`

**Headers:**
```
X-Device-ID: {device_id}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "location": {
      "latitude": 37.5665,
      "longitude": 126.9780,
      "name": "서울시 중구"
    },
    "notification_time": "08:00:00",
    "departure_time": "08:30:00",
    "notification_enabled": true,
    "created_at": "2024-01-15T08:00:00Z",
    "updated_at": "2024-01-15T08:00:00Z"
  }
}
```

**Response (404 Not Found):**

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "User settings not found"
  }
}
```

---

### 2.2 Create or Update User Settings

사용자 설정을 생성하거나 업데이트합니다.

**Endpoint:** `PUT /api/settings`

**Headers:**
```
X-Device-ID: {device_id}
```

**Request Body:**

```json
{
  "location": {
    "latitude": 37.5665,
    "longitude": 126.9780,
    "name": "서울시 중구"
  },
  "notification_time": "08:00:00",
  "departure_time": "08:30:00",
  "fcm_token": "firebase-fcm-token-xxx",
  "notification_enabled": true
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "location": {
      "latitude": 37.5665,
      "longitude": 126.9780,
      "name": "서울시 중구"
    },
    "notification_time": "08:00:00",
    "departure_time": "08:30:00",
    "notification_enabled": true,
    "updated_at": "2024-01-15T08:00:00Z"
  },
  "message": "Settings updated successfully"
}
```

**Validation Rules:**

- `notification_time`: HH:mm:ss 형식 (필수)
- `departure_time`: HH:mm:ss 형식 (필수)
- `location.latitude`: -90 ~ 90 (필수)
- `location.longitude`: -180 ~ 180 (필수)
- `fcm_token`: 문자열 (선택사항)

---

## 3. Weather API

### 3.1 Get Weather Data

특정 위치와 시간의 날씨 데이터를 조회합니다.

**Endpoint:** `GET /api/weather`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `latitude` | number | Yes | 위도 |
| `longitude` | number | Yes | 경도 |
| `date` | string | No | 날짜 (YYYY-MM-DD), 기본값: 오늘 |
| `time` | string | No | 시간 (HH:mm), 기본값: 현재 시간 |

**Example Request:**

```
GET /api/weather?latitude=37.5665&longitude=126.9780&date=2024-01-15&time=08:00
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "location": {
      "latitude": 37.5665,
      "longitude": 126.9780,
      "name": "서울시 중구"
    },
    "forecast_date": "2024-01-15",
    "forecast_time": "08:00:00",
    "weather": {
      "temperature": 5.0,
      "feels_like": 2.0,
      "humidity": 60,
      "precipitation_probability": 20,
      "precipitation_amount": 0.0,
      "wind_speed": 2.5,
      "wind_direction": 270,
      "sky_condition": "맑음",
      "uv_index": 3
    },
    "cached": true,
    "cached_at": "2024-01-15T07:30:00Z"
  }
}
```

**Error Responses:**

```json
// 400 Bad Request
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "latitude and longitude are required"
  }
}

// 502 Bad Gateway
{
  "success": false,
  "error": {
    "code": "EXTERNAL_API_ERROR",
    "message": "Failed to fetch weather data from external API"
  }
}
```

---

## 4. Recommendations API

### 4.1 Get Personalized Recommendation

개인화된 날씨 기반 추천을 조회합니다.

**Endpoint:** `GET /api/recommendations`

**Headers:**
```
X-Device-ID: {device_id}
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `date` | string | No | 날짜 (YYYY-MM-DD), 기본값: 오늘 |
| `time` | string | No | 시간 (HH:mm), 기본값: 사용자 출발 시간 |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "weather": {
      "temperature": 5.0,
      "feels_like": 2.0,
      "wind_speed": 2.5,
      "uv_index": 3
    },
    "personalized_feels_like": 2.0,  // ML 모델로 보정된 체감온도
    "recommendation": {
      "clothing": [
        {
          "item": "두꺼운 패딩",
          "priority": "high",
          "reason": "체감온도가 2°C로 낮습니다"
        },
        {
          "item": "목도리",
          "priority": "medium",
          "reason": "바람이 불 수 있습니다"
        },
        {
          "item": "장갑",
          "priority": "high",
          "reason": "체감온도가 5°C 미만입니다"
        }
      ],
      "items": [
        {
          "item": "없음",
          "priority": "none"
        }
      ]
    },
    "personalization_level": "high",  // none, low, medium, high
    "feedback_count": 25
  }
}
```

---

## 5. Notifications API

### 5.1 Get Notification History

사용자의 알림 히스토리를 조회합니다.

**Endpoint:** `GET /api/notifications`

**Headers:**
```
X-Device-ID: {device_id}
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | number | No | 페이지 크기 (기본값: 20) |
| `offset` | number | No | 페이지 오프셋 (기본값: 0) |
| `start_date` | string | No | 시작 날짜 (YYYY-MM-DD) |
| `end_date` | string | No | 종료 날짜 (YYYY-MM-DD) |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "uuid-1234",
        "title": "오늘 날씨 알림 (08:00)",
        "body": "기온 5°C, 체감온도 2°C입니다...",
        "recommendation": {
          "clothing": ["두꺼운 패딩", "목도리"],
          "items": []
        },
        "sent_at": "2024-01-15T08:00:00Z",
        "status": "sent",
        "feedback_received": true
      },
      {
        "id": "uuid-5678",
        "title": "오늘 날씨 알림 (08:00)",
        "body": "기온 10°C, 체감온도 8°C입니다...",
        "sent_at": "2024-01-14T08:00:00Z",
        "status": "sent",
        "feedback_received": false
      }
    ],
    "pagination": {
      "total": 30,
      "limit": 20,
      "offset": 0,
      "has_more": true
    }
  }
}
```

---

### 5.2 Get Notification Detail

특정 알림의 상세 정보를 조회합니다.

**Endpoint:** `GET /api/notifications/:notification_id`

**Headers:**
```
X-Device-ID: {device_id}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "uuid-1234",
    "title": "오늘 날씨 알림 (08:00)",
    "body": "기온 5°C, 체감온도 2°C입니다...",
    "weather": {
      "temperature": 5.0,
      "feels_like": 2.0,
      "wind_speed": 2.5,
      "uv_index": 3
    },
    "recommendation": {
      "clothing": ["두꺼운 패딩", "목도리", "장갑"],
      "items": []
    },
    "sent_at": "2024-01-15T08:00:00Z",
    "status": "sent",
    "feedback_received": true,
    "feedback": {
      "rating": 2,
      "feedback_text": "더웠어요",
      "created_at": "2024-01-15T08:30:00Z"
    }
  }
}
```

---

### 5.3 Send Test Notification

테스트 알림을 발송합니다.

**Endpoint:** `POST /api/notifications/test`

**Headers:**
```
X-Device-ID: {device_id}
```

**Request Body:**

```json
{
  "fcm_token": "firebase-fcm-token-xxx"  // 선택사항, 없으면 설정에서 가져옴
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "notification_id": "uuid-1234",
    "sent_at": "2024-01-15T10:00:00Z",
    "status": "sent"
  },
  "message": "Test notification sent successfully"
}
```

---

## 6. Feedbacks API

### 6.1 Create Feedback

피드백을 생성합니다.

**Endpoint:** `POST /api/feedbacks`

**Headers:**
```
X-Device-ID: {device_id}
```

**Request Body:**

```json
{
  "notification_log_id": "uuid-1234",
  "rating": 2,
  "feedback_text": "오늘 추천대로 두꺼운 패딩 입고 나갔는데 너무 더웠어요. 목도리와 장갑도 안 써도 될 정도였어요.",
  "feedback_date": "2024-01-15"
}
```

**Validation Rules:**

- `notification_log_id`: UUID 형식 (필수)
- `rating`: 1~5 정수 (필수)
- `feedback_text`: 문자열, 최대 500자 (선택사항)
- `feedback_date`: YYYY-MM-DD 형식 (필수)

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": "uuid-feedback-1234",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "notification_log_id": "uuid-1234",
    "rating": 2,
    "feedback_text": "오늘 추천대로 두꺼운 패딩 입고 나갔는데 너무 더웠어요...",
    "nlp_analysis": {
      "sentiment": "negative",
      "temperature_perception": "hot",
      "keywords": ["더웠어요", "너무"],
      "extracted_info": {
        "clothing_too_thick": true,
        "items_unnecessary": ["목도리", "장갑"]
      }
    },
    "feedback_date": "2024-01-15",
    "created_at": "2024-01-15T08:30:00Z"
  },
  "message": "Feedback created successfully"
}
```

**Note:** NLP 분석은 비동기로 처리되며, 초기 응답에는 `nlp_analysis`가 `null`일 수 있습니다.

---

### 6.2 Get Feedback History

사용자의 피드백 히스토리를 조회합니다.

**Endpoint:** `GET /api/feedbacks`

**Headers:**
```
X-Device-ID: {device_id}
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | number | No | 페이지 크기 (기본값: 20) |
| `offset` | number | No | 페이지 오프셋 (기본값: 0) |
| `start_date` | string | No | 시작 날짜 (YYYY-MM-DD) |
| `end_date` | string | No | 종료 날짜 (YYYY-MM-DD) |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "feedbacks": [
      {
        "id": "uuid-feedback-1234",
        "notification_log_id": "uuid-1234",
        "rating": 2,
        "feedback_text": "더웠어요",
        "feedback_date": "2024-01-15",
        "created_at": "2024-01-15T08:30:00Z"
      },
      {
        "id": "uuid-feedback-5678",
        "notification_log_id": "uuid-5678",
        "rating": 4,
        "feedback_text": "적당했어요",
        "feedback_date": "2024-01-14",
        "created_at": "2024-01-14T08:30:00Z"
      }
    ],
    "pagination": {
      "total": 25,
      "limit": 20,
      "offset": 0,
      "has_more": true
    },
    "statistics": {
      "total_count": 25,
      "average_rating": 3.2,
      "feedback_count_by_rating": {
        "1": 2,
        "2": 5,
        "3": 8,
        "4": 7,
        "5": 3
      }
    }
  }
}
```

---

### 6.3 Get Feedback Detail

특정 피드백의 상세 정보를 조회합니다.

**Endpoint:** `GET /api/feedbacks/:feedback_id`

**Headers:**
```
X-Device-ID: {device_id}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "uuid-feedback-1234",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "notification_log_id": "uuid-1234",
    "rating": 2,
    "feedback_text": "오늘 추천대로 두꺼운 패딩 입고 나갔는데 너무 더웠어요...",
    "nlp_analysis": {
      "sentiment": "negative",
      "temperature_perception": "hot",
      "keywords": ["더웠어요", "너무", "안 써도 될 정도"],
      "extracted_info": {
        "clothing_too_thick": true,
        "items_unnecessary": ["목도리", "장갑"],
        "temperature_adjustment": 3
      }
    },
    "feedback_date": "2024-01-15",
    "created_at": "2024-01-15T08:30:00Z",
    "updated_at": "2024-01-15T08:35:00Z"
  }
}
```

---

## 7. ML API (Internal)

### 7.1 Analyze Feedback (NLP)

피드백 텍스트를 NLP 분석합니다. (내부 API)

**Endpoint:** `POST /ml/analyze-feedback`

**Request Body:**

```json
{
  "text": "오늘 추천대로 두꺼운 패딩 입고 나갔는데 너무 더웠어요",
  "rating": 2
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "sentiment": "negative",
    "temperature_perception": "hot",
    "keywords": ["더웠어요", "너무"],
    "extracted_info": {
      "clothing_too_thick": true,
      "temperature_adjustment": 3
    }
  }
}
```

---

### 7.2 Train Model

사용자별 ML 모델을 학습합니다. (내부 API)

**Endpoint:** `POST /ml/train-model`

**Request Body:**

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "feedback_count": 20
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "model_type": "linear_regression",
    "model_version": 2,
    "accuracy": 0.85,
    "parameters": {
      "alpha_0": 0.5,
      "alpha_1": 0.8,
      "alpha_2": -0.3,
      "alpha_3": 0.2,
      "alpha_4": -0.1,
      "alpha_5": 0.0
    },
    "trained_at": "2024-01-15T09:00:00Z"
  },
  "message": "Model trained successfully"
}
```

---

### 7.3 Get Model Parameters

사용자별 학습된 ML 모델 파라미터를 조회합니다. (내부 API)

**Endpoint:** `GET /ml/model-parameters/:user_id`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `model_type` | string | No | 모델 타입 (linear_regression, random_forest, neural_network) |
| `version` | number | No | 모델 버전, 없으면 최신 버전 |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "model_type": "linear_regression",
    "model_version": 2,
    "parameters": {
      "alpha_0": 0.5,
      "alpha_1": 0.8,
      "alpha_2": -0.3,
      "alpha_3": 0.2,
      "alpha_4": -0.1,
      "alpha_5": 0.0
    },
    "accuracy": 0.85,
    "feedback_count": 20,
    "trained_at": "2024-01-15T09:00:00Z"
  }
}
```

---

## 8. Health Check API

### 8.1 Health Check

서버 상태를 확인합니다.

**Endpoint:** `GET /health`

**Response (200 OK):**

```json
{
  "status": "ok",
  "message": "Server is running",
  "timestamp": "2024-01-15T08:00:00Z"
}
```

---

## Rate Limiting

API 호출 제한:

- **일반 API**: 분당 60회
- **날씨 API**: 분당 10회 (기상청 API 제한 고려)
- **ML API**: 분당 5회

제한 초과 시:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retry_after": 60
  }
}
```

---

## Pagination

목록 조회 API는 페이지네이션을 지원합니다.

**Query Parameters:**

- `limit`: 페이지 크기 (기본값: 20, 최대: 100)
- `offset`: 페이지 오프셋 (기본값: 0)

**Response Format:**

```json
{
  "data": [...],
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

---

## Versioning

현재 API 버전: `v1`

향후 버전 변경 시 URL에 버전 포함:

```
/api/v1/users
/api/v2/users
```

---

## Webhooks

알림 발송 완료 시 웹훅을 지원합니다. (향후 구현)

---

## Examples

### Example: Complete User Onboarding Flow

```bash
# 1. Create user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "ios-uuid-1234"
  }'

# 2. Set user settings
curl -X PUT http://localhost:3000/api/settings \
  -H "Content-Type: application/json" \
  -H "X-Device-ID: ios-uuid-1234" \
  -d '{
    "location": {
      "latitude": 37.5665,
      "longitude": 126.9780,
      "name": "서울시 중구"
    },
    "notification_time": "08:00:00",
    "departure_time": "08:30:00",
    "fcm_token": "firebase-token-xxx"
  }'

# 3. Get recommendation
curl -X GET "http://localhost:3000/api/recommendations" \
  -H "X-Device-ID: ios-uuid-1234"

# 4. Submit feedback
curl -X POST http://localhost:3000/api/feedbacks \
  -H "Content-Type: application/json" \
  -H "X-Device-ID: ios-uuid-1234" \
  -d '{
    "notification_log_id": "uuid-1234",
    "rating": 2,
    "feedback_text": "더웠어요",
    "feedback_date": "2024-01-15"
  }'
```

