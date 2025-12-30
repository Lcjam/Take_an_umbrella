#!/bin/bash

# Docker Compose 테스트 스크립트
# 이 스크립트는 Docker Compose 설정이 올바르게 작동하는지 확인합니다.

set -e

echo "🚀 Docker Compose 테스트 시작..."

# 색상 정의
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 프로젝트 루트로 이동
cd "$(dirname "$0")/.."

# 1. Docker Compose 파일 검증
echo -e "\n${YELLOW}1. Docker Compose 파일 검증 중...${NC}"
if docker-compose config > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Docker Compose 파일 검증 통과${NC}"
else
    echo -e "${RED}❌ Docker Compose 파일 검증 실패${NC}"
    docker-compose config
    exit 1
fi

# 2. 컨테이너 시작
echo -e "\n${YELLOW}2. 컨테이너 시작 중...${NC}"
docker-compose up -d

# 컨테이너가 시작될 때까지 대기
echo "컨테이너가 준비될 때까지 대기 중..."
sleep 5

# 3. 컨테이너 상태 확인
echo -e "\n${YELLOW}3. 컨테이너 상태 확인 중...${NC}"
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✅ 컨테이너가 정상적으로 실행 중입니다${NC}"
    docker-compose ps
else
    echo -e "${RED}❌ 컨테이너 실행 실패${NC}"
    docker-compose ps
    docker-compose logs
    exit 1
fi

# 4. PostgreSQL 연결 테스트
echo -e "\n${YELLOW}4. PostgreSQL 연결 테스트 중...${NC}"
if docker-compose exec -T postgres pg_isready -U take_umbrella_user > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PostgreSQL 연결 성공${NC}"
else
    echo -e "${RED}❌ PostgreSQL 연결 실패${NC}"
    docker-compose logs postgres
    exit 1
fi

# 5. Redis 연결 테스트
echo -e "\n${YELLOW}5. Redis 연결 테스트 중...${NC}"
if docker-compose exec -T redis redis-cli ping | grep -q "PONG"; then
    echo -e "${GREEN}✅ Redis 연결 성공${NC}"
else
    echo -e "${RED}❌ Redis 연결 실패${NC}"
    docker-compose logs redis
    exit 1
fi

# 6. 데이터베이스 생성 확인
echo -e "\n${YELLOW}6. 데이터베이스 존재 확인 중...${NC}"
if docker-compose exec -T postgres psql -U take_umbrella_user -lqt | cut -d \| -f 1 | grep -qw take_an_umbrella; then
    echo -e "${GREEN}✅ 데이터베이스 'take_an_umbrella' 존재 확인${NC}"
else
    echo -e "${RED}❌ 데이터베이스 'take_an_umbrella'를 찾을 수 없습니다${NC}"
    exit 1
fi

echo -e "\n${GREEN}🎉 모든 테스트 통과! Docker Compose 설정이 정상적으로 작동합니다.${NC}"
echo -e "\n다음 단계:"
echo -e "  1. backend/.env 파일을 생성하고 backend/.env.example을 참고하여 설정하세요"
echo -e "  2. Prisma 마이그레이션을 실행하세요: cd backend && npm run prisma:migrate"
echo -e "\n컨테이너 중지: docker-compose down"

