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
   * 트랜잭션을 사용하여 원자성을 보장하고 race condition을 방지합니다
   * @param input - 사용자 생성 입력 데이터
   * @returns 생성되거나 조회된 사용자 정보와 생성 여부
   */
  async createOrGetUser(input: CreateUserInput): Promise<{ user: User; created: boolean }> {
    return await prisma.$transaction(async tx => {
      // 트랜잭션 내에서 사용자 조회 (락 획득)
      const existingUser = await tx.user.findUnique({
        where: { deviceId: input.deviceId },
      });

      // 활성 사용자가 존재하면 마지막 활동 시간만 업데이트
      if (existingUser && !existingUser.deletedAt) {
        const updatedUser = await tx.user.update({
          where: { id: existingUser.id },
          data: { lastActiveAt: new Date() },
        });

        return {
          user: this.mapToUser(updatedUser),
          created: false,
        };
      }

      // 소프트 삭제된 사용자가 존재하면 복원
      if (existingUser && existingUser.deletedAt) {
        const restoredUser = await tx.user.update({
          where: { id: existingUser.id },
          data: {
            deletedAt: null,
            anonymousId: input.anonymousId || existingUser.anonymousId,
            lastActiveAt: new Date(),
          },
        });

        return {
          user: this.mapToUser(restoredUser),
          created: true, // 복원을 새 생성으로 간주
        };
      }

      // 사용자가 없으면 새로 생성
      const newUser = await tx.user.create({
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
    });
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
