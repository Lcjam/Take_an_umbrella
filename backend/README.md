# Take an Umbrella - Backend API

날씨 기반 맞춤형 알림 앱의 백엔드 API 서버입니다.

## 기술 스택

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Testing**: Jest, Supertest
- **Database**: PostgreSQL (예정)
- **Linting**: ESLint, Prettier

## 프로젝트 구조

```
backend/
├── src/
│   ├── controllers/     # 요청/응답 처리
│   ├── services/        # 비즈니스 로직
│   ├── models/          # 데이터 모델
│   ├── routes/          # 라우트 정의
│   ├── middlewares/     # 미들웨어
│   ├── utils/           # 유틸리티 함수
│   ├── types/           # TypeScript 타입 정의
│   ├── config/          # 설정 파일
│   └── __tests__/       # 테스트 파일
│       ├── unit/        # 단위 테스트
│       └── integration/ # 통합 테스트
├── dist/                # 빌드 출력
└── coverage/            # 테스트 커버리지 리포트
```

## 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env` 파일을 생성하고 다음 변수들을 설정하세요:

```env
PORT=3000
NODE_ENV=development
WEATHER_API_KEY=your_weather_api_key_here
WEATHER_API_URL=https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0
DATABASE_URL=postgresql://user:password@localhost:5432/take_an_umbrella
JWT_SECRET=your_jwt_secret_here
FCM_SERVER_KEY=your_fcm_server_key_here
```

### 3. 개발 서버 실행

```bash
npm run dev
```

### 4. 프로덕션 빌드 및 실행

```bash
npm run build
npm start
```

## 스크립트

- `npm run dev`: 개발 서버 실행 (nodemon)
- `npm run build`: TypeScript 컴파일
- `npm start`: 프로덕션 서버 실행
- `npm test`: 테스트 실행
- `npm run test:watch`: 테스트 감시 모드
- `npm run test:coverage`: 테스트 커버리지 리포트 생성
- `npm run lint`: ESLint 실행
- `npm run lint:fix`: ESLint 자동 수정
- `npm run format`: Prettier 포맷팅
- `npm run format:check`: Prettier 포맷팅 검사

## 테스트 전략 (TDD)

모든 기능은 TDD 방식으로 개발됩니다:

1. **Red**: 실패하는 테스트 작성
2. **Green**: 테스트를 통과하는 최소한의 코드 작성
3. **Refactor**: 코드 개선 (테스트 통과 유지)

### 테스트 커버리지 목표

- 목표 커버리지: **85% 이상**
- 현재 커버리지 확인: `npm run test:coverage`

## API 엔드포인트

### Health Check

```
GET /health
```

서버 상태 확인

**Response:**
```json
{
  "status": "ok",
  "message": "Server is running"
}
```

## 개발 가이드라인

- 모든 코드는 TypeScript로 작성
- TDD 방식으로 개발 (테스트 먼저 작성)
- 함수는 단일 책임 원칙(SRP) 준수
- 에러 핸들링 필수
- 커밋 전 테스트 및 린터 통과 확인

## 라이선스

ISC

