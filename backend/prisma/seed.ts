import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
import path from 'path';

// 환경 변수 로드 (프로젝트 루트의 .env 파일)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// DATABASE_URL 생성 또는 확인
let databaseUrl = process.env.DATABASE_URL;

// DATABASE_URL에 변수가 포함되어 있으면 치환
if (databaseUrl && databaseUrl.includes('${')) {
  const postgresUser = process.env.POSTGRES_USER || 'take_umbrella_user';
  const postgresPassword = process.env.POSTGRES_PASSWORD || 'take_umbrella_password';
  const postgresDb = process.env.POSTGRES_DB || 'take_an_umbrella';
  
  databaseUrl = databaseUrl
    .replace(/\${POSTGRES_USER}/g, postgresUser)
    .replace(/\${POSTGRES_PASSWORD}/g, postgresPassword)
    .replace(/\${POSTGRES_DB}/g, postgresDb);
  
  process.env.DATABASE_URL = databaseUrl;
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// PostgreSQL 연결 풀 생성
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Prisma Adapter 생성
const adapter = new PrismaPg(pool);

// PrismaClient 인스턴스 생성
const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log('🌱 Starting database seeding...');

  // 기존 추천 규칙이 있는지 확인
  const existingRules = await prisma.recommendationRule.count();
  
  if (existingRules > 0) {
    console.log(`⚠️  Found ${existingRules} existing recommendation rules. Skipping seed.`);
    console.log('💡 To reseed, delete existing rules first or reset the database.');
    return;
  }

  // 기본 추천 규칙 생성
  const rules = [
    // 비 관련 규칙
    {
      conditionType: 'precipitation',
      conditionOperator: '>',
      conditionValue: { value: 0 },
      recommendationType: 'item',
      recommendationValue: {
        item: '우산',
        message: '비가 예상됩니다. 우산을 들고 나가세요.',
        priority: 'high',
      },
      priority: 100,
      enabled: true,
    },
    {
      conditionType: 'precipitation',
      conditionOperator: '>=',
      conditionValue: { value: 10 },
      recommendationType: 'item',
      recommendationValue: {
        item: '우산',
        message: '강한 비가 예상됩니다. 우산을 꼭 챙기세요.',
        priority: 'high',
      },
      priority: 110,
      enabled: true,
    },

    // 기온 관련 규칙
    {
      conditionType: 'temperature',
      conditionOperator: '<',
      conditionValue: { value: 0 },
      recommendationType: 'clothing',
      recommendationValue: {
        clothing: '두꺼운 패딩',
        items: ['장갑', '목도리', '모자'],
        message: '영하의 날씨입니다. 두꺼운 패딩과 방한용품을 착용하세요.',
        priority: 'high',
      },
      priority: 100,
      enabled: true,
    },
    {
      conditionType: 'temperature',
      conditionOperator: '<',
      conditionValue: { value: 5 },
      recommendationType: 'clothing',
      recommendationValue: {
        clothing: '패딩 또는 코트',
        items: ['장갑', '목도리'],
        message: '춥습니다. 패딩이나 코트를 입고 장갑과 목도리를 착용하세요.',
        priority: 'high',
      },
      priority: 90,
      enabled: true,
    },
    {
      conditionType: 'temperature',
      conditionOperator: '<',
      conditionValue: { value: 10 },
      recommendationType: 'clothing',
      recommendationValue: {
        clothing: '가벼운 코트 또는 재킷',
        items: ['목도리'],
        message: '쌀쌀합니다. 가벼운 코트나 재킷을 입고 목도리를 착용하세요.',
        priority: 'medium',
      },
      priority: 70,
      enabled: true,
    },
    {
      conditionType: 'temperature',
      conditionOperator: '>=',
      conditionValue: { value: 25 },
      recommendationType: 'clothing',
      recommendationValue: {
        clothing: '얇은 옷',
        message: '덥습니다. 얇고 시원한 옷을 입으세요.',
        priority: 'medium',
      },
      priority: 60,
      enabled: true,
    },
    {
      conditionType: 'temperature',
      conditionOperator: '>=',
      conditionValue: { value: 30 },
      recommendationType: 'clothing',
      recommendationValue: {
        clothing: '매우 얇은 옷',
        items: ['선크림'],
        message: '매우 덥습니다. 매우 얇은 옷을 입고 선크림을 바르세요.',
        priority: 'high',
      },
      priority: 80,
      enabled: true,
    },

    // 바람 관련 규칙
    {
      conditionType: 'wind_speed',
      conditionOperator: '>=',
      conditionValue: { value: 5 },
      recommendationType: 'item',
      recommendationValue: {
        item: '머플러',
        message: '바람이 많이 붑니다. 머플러를 착용하세요.',
        priority: 'medium',
      },
      priority: 50,
      enabled: true,
    },
    {
      conditionType: 'wind_speed',
      conditionOperator: '>=',
      conditionValue: { value: 10 },
      recommendationType: 'item',
      recommendationValue: {
        items: ['머플러', '모자'],
        message: '강한 바람이 예상됩니다. 머플러와 모자를 착용하세요.',
        priority: 'high',
      },
      priority: 70,
      enabled: true,
    },

    // 자외선 관련 규칙
    {
      conditionType: 'uv_index',
      conditionOperator: '>=',
      conditionValue: { value: 5 },
      recommendationType: 'item',
      recommendationValue: {
        items: ['선크림', '양산 또는 모자'],
        message: '자외선이 강합니다. 선크림을 바르고 양산이나 모자를 착용하세요.',
        priority: 'high',
      },
      priority: 80,
      enabled: true,
    },
    {
      conditionType: 'uv_index',
      conditionOperator: '>=',
      conditionValue: { value: 7 },
      recommendationType: 'item',
      recommendationValue: {
        items: ['선크림', '양산', '모자', '선글라스'],
        message: '매우 강한 자외선입니다. 선크림, 양산, 모자, 선글라스를 모두 착용하세요.',
        priority: 'high',
      },
      priority: 90,
      enabled: true,
    },

    // 습도 관련 규칙
    {
      conditionType: 'humidity',
      conditionOperator: '>=',
      conditionValue: { value: 80 },
      recommendationType: 'clothing',
      recommendationValue: {
        clothing: '통풍이 잘 되는 옷',
        message: '습도가 높습니다. 통풍이 잘 되는 옷을 입으세요.',
        priority: 'low',
      },
      priority: 30,
      enabled: true,
    },

    // 복합 조건: 비 + 낮은 기온
    {
      conditionType: 'precipitation',
      conditionOperator: '>',
      conditionValue: { value: 0 },
      recommendationType: 'item',
      recommendationValue: {
        items: ['우산', '장갑'],
        message: '비가 오고 날씨가 춥습니다. 우산과 장갑을 착용하세요.',
        priority: 'high',
      },
      priority: 95,
      enabled: true,
    },
  ];

  // 추천 규칙 삽입
  for (const rule of rules) {
    await prisma.recommendationRule.create({
      data: rule,
    });
  }

  console.log(`✅ Successfully seeded ${rules.length} recommendation rules`);
  console.log('📋 Recommendation rules:');
  rules.forEach((rule, index) => {
    console.log(`   ${index + 1}. ${rule.conditionType} ${rule.conditionOperator} ${JSON.stringify(rule.conditionValue)}`);
  });
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

