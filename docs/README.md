# Take an Umbrella

날씨 기반 맞춤형 알림 앱으로, 사용자가 설정한 출발 시간에 날씨에 따른 옷차림 및 소지품 추천을 제공합니다.

## 프로젝트 소개

매일 아침 일기예보를 확인하는 것이 번거롭다고 느끼셨나요? **Take an Umbrella**는 사용자가 설정한 출발 시간에 자동으로 날씨를 확인하고, 필요한 옷차림과 소지품을 알려주는 스마트 알림 앱입니다.

### 주요 기능

- ⏰ **맞춤형 알림**: 출발 시간을 설정하면 자동으로 알림
- 🌤️ **날씨 기반 추천**: 비, 바람, 자외선 등 날씨에 따른 소지품 추천
- 👔 **옷차림 추천**: 기온에 따른 옷차림 추천
- 📍 **위치 기반**: 사용자 위치 기반 정확한 날씨 정보

### 기술 스택

- **프론트엔드**: Flutter (iOS/Android)
- **백엔드**: Node.js/Express (TypeScript)
- **데이터베이스**: PostgreSQL
- **날씨 API**: 기상청 API (공공데이터포털)
- **알림**: FCM (Firebase Cloud Messaging)

## 시작하기

### 요구사항

- Node.js 18+ 
- Flutter 3.0+
- PostgreSQL 14+
- 기상청 API 키 (공공데이터포털)

### 설치 및 실행

자세한 설치 방법은 각 디렉토리의 README를 참고하세요:

- [Backend README](./backend/README.md)
- [Frontend README](./frontend/README.md) (예정)

## 기여하기

프로젝트에 기여하고 싶으시다면:

1. 이 저장소를 포크하세요
2. 새로운 브랜치를 생성하세요 (`git checkout -b feature/AmazingFeature`)
3. 변경사항을 커밋하세요 (`git commit -m 'Add some AmazingFeature'`)
4. 브랜치에 푸시하세요 (`git push origin feature/AmazingFeature`)
5. Pull Request를 생성하세요

### 개발 가이드라인

- TDD 방식으로 개발합니다
- 모든 코드는 테스트를 포함해야 합니다
- 커밋 전 린터 및 테스트 통과 필수

## 라이선스

이 프로젝트는 개인 프로젝트입니다.

