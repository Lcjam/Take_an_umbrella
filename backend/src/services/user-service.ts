import prisma from '../lib/prisma';

export interface CreateUserInput {
  deviceId: string;
  anonymousId?: string;
}

export interface User {
  id: string;
  deviceId: string;
  anonymousId: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date | null;
}

class UserService {
  /**
   * 사용자를 생성하거나 기존 사용자를 조회합니다
   * @param input - 사용자 생성 입력 데이터
   * @returns 생성되거나 조회된 사용자 정보와 생성 여부
   */
  async createOrGetUser(input: CreateUserInput): Promise<{ user: User; created: boolean }> {
    // 기존 사용자 조회
    const existingUser = await prisma.user.findUnique({
      where: { deviceId: input.deviceId },
    });

    if (existingUser && !existingUser.deletedAt) {
      // 마지막 활동 시간 업데이트
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: { lastActiveAt: new Date() },
      });

      return {
        user: this.mapToUser(updatedUser),
        created: false,
      };
    }

    // 새 사용자 생성
    const newUser = await prisma.user.create({
      data: {
        deviceId: input.deviceId,
        anonymousId: input.anonymousId || null,
        lastActiveAt: new Date(),
      },
    });

    return {
      user: this.mapToUser(newUser),
      created: true,
    };
  }

  /**
   * 사용자 ID로 사용자를 조회합니다
   * @param userId - 사용자 ID
   * @returns 사용자 정보 또는 null
   */
  async getUserById(userId: string): Promise<User | null> {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
    });

    return user ? this.mapToUser(user) : null;
  }

  /**
   * Prisma User 모델을 User 인터페이스로 매핑합니다
   */
  private mapToUser(user: {
    id: string;
    deviceId: string;
    anonymousId: string | null;
    createdAt: Date;
    updatedAt: Date;
    lastActiveAt: Date | null;
  }): User {
    return {
      id: user.id,
      deviceId: user.deviceId,
      anonymousId: user.anonymousId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastActiveAt: user.lastActiveAt,
    };
  }
}

export default new UserService();
