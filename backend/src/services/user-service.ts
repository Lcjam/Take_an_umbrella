import prisma from '../lib/prisma';
import { AppError } from '../types/errors';
import { Prisma } from '@prisma/client';

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

export interface UpdateLocationInput {
  latitude: number;
  longitude: number;
  locationName: string | null;
}

export interface UpdateNotificationTimeInput {
  departureTime?: string;
  notificationTime?: string;
}

export interface UserSettings {
  locationLatitude: Prisma.Decimal | null;
  locationLongitude: Prisma.Decimal | null;
  locationName: string | null;
}

export interface NotificationTimeSettings {
  userId: string;
  departureTime: string;
  notificationTime: string;
}

export interface FcmTokenSettings {
  fcmToken: string | null;
}

export interface NotificationEnabledSettings {
  notificationEnabled: boolean;
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
   * 사용자 존재 여부를 확인하고, 없으면 에러를 던집니다
   * @param userId - 사용자 ID
   * @throws AppError - 사용자가 존재하지 않으면 NOT_FOUND 에러
   */
  private async ensureUserExists(userId: string): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new AppError('NOT_FOUND', 'User not found');
    }
  }

  /**
   * 사용자 위치 정보를 업데이트합니다
   * @param userId - 사용자 ID
   * @param input - 위치 정보 입력 데이터
   * @returns 업데이트된 설정 정보
   */
  async updateUserLocation(userId: string, input: UpdateLocationInput): Promise<UserSettings> {
    // 사용자 존재 여부 확인
    await this.ensureUserExists(userId);

    // UserSettings가 없으면 생성, 있으면 업데이트
    const settings = await prisma.userSettings.upsert({
      where: { userId },
      update: {
        locationLatitude: new Prisma.Decimal(input.latitude),
        locationLongitude: new Prisma.Decimal(input.longitude),
        locationName: input.locationName,
      },
      create: {
        userId,
        departureTime: '08:00:00', // 기본값
        notificationTime: '07:30:00', // 기본값
        locationLatitude: new Prisma.Decimal(input.latitude),
        locationLongitude: new Prisma.Decimal(input.longitude),
        locationName: input.locationName,
      },
    });

    return {
      locationLatitude: settings.locationLatitude,
      locationLongitude: settings.locationLongitude,
      locationName: settings.locationName,
    };
  }

  /**
   * 사용자 알림 시간 정보를 업데이트합니다
   * @param userId - 사용자 ID
   * @param input - 알림 시간 입력 데이터
   * @returns 업데이트된 설정 정보
   */
  async updateNotificationTime(
    userId: string,
    input: UpdateNotificationTimeInput
  ): Promise<NotificationTimeSettings> {
    // 사용자 존재 여부 확인
    await this.ensureUserExists(userId);

    // 기존 설정 조회
    const currentSettings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    const DEFAULT_DEPARTURE_TIME = '08:00:00';
    const DEFAULT_NOTIFICATION_TIME = '07:30:00';

    // 검증을 위해 최종적으로 설정될 시간 값을 결정합니다
    const departureForValidation =
      input.departureTime ?? currentSettings?.departureTime ?? DEFAULT_DEPARTURE_TIME;
    const notificationForValidation =
      input.notificationTime ?? currentSettings?.notificationTime ?? DEFAULT_NOTIFICATION_TIME;

    // 논리적 검증: notification_time < departure_time
    // HH:mm:ss 형식은 사전식 순서가 시간 순서와 동일하므로 문자열 비교 가능
    if (notificationForValidation >= departureForValidation) {
      throw new AppError('VALIDATION_ERROR', 'notification_time must be before departure_time');
    }

    // update 데이터 준비 (제공된 필드만 업데이트)
    const updateData: { departureTime?: string; notificationTime?: string } = {};
    if (input.departureTime !== undefined) {
      updateData.departureTime = input.departureTime;
    }
    if (input.notificationTime !== undefined) {
      updateData.notificationTime = input.notificationTime;
    }

    // UserSettings가 없으면 생성, 있으면 업데이트
    const settings = await prisma.userSettings.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        departureTime: input.departureTime ?? DEFAULT_DEPARTURE_TIME,
        notificationTime: input.notificationTime ?? DEFAULT_NOTIFICATION_TIME,
      },
    });

    return {
      userId: settings.userId,
      departureTime: settings.departureTime,
      notificationTime: settings.notificationTime,
    };
  }

  /**
   * FCM 토큰을 등록/갱신합니다
   * @param userId - 사용자 ID
   * @param fcmToken - FCM 토큰
   * @returns 업데이트된 설정 정보
   */
  async updateFcmToken(userId: string, fcmToken: string): Promise<FcmTokenSettings> {
    // 사용자 존재 여부 확인
    await this.ensureUserExists(userId);

    // UserSettings가 없으면 생성, 있으면 업데이트
    const settings = await prisma.userSettings.upsert({
      where: { userId },
      update: {
        fcmToken,
      },
      create: {
        userId,
        departureTime: '08:00:00', // 기본값
        notificationTime: '07:30:00', // 기본값
        fcmToken,
      },
    });

    return {
      fcmToken: settings.fcmToken,
    };
  }

  /**
   * FCM 토큰을 삭제합니다
   * @param userId - 사용자 ID
   */
  async deleteFcmToken(userId: string): Promise<void> {
    // 사용자 존재 여부 확인
    await this.ensureUserExists(userId);

    // UserSettings가 있으면 fcmToken만 null로 업데이트 (멱등성 보장)
    await prisma.userSettings.updateMany({
      where: { userId },
      data: {
        fcmToken: null,
      },
    });
  }

  /**
   * 알림 활성화/비활성화를 설정합니다
   * @param userId - 사용자 ID
   * @param notificationEnabled - 알림 활성화 여부
   * @returns 업데이트된 설정 정보
   */
  async updateNotificationEnabled(
    userId: string,
    notificationEnabled: boolean
  ): Promise<NotificationEnabledSettings> {
    // 사용자 존재 여부 확인
    await this.ensureUserExists(userId);

    const DEFAULT_DEPARTURE_TIME = '08:00:00';
    const DEFAULT_NOTIFICATION_TIME = '07:30:00';

    // UserSettings가 없으면 생성, 있으면 업데이트
    const settings = await prisma.userSettings.upsert({
      where: { userId },
      update: {
        notificationEnabled,
      },
      create: {
        userId,
        departureTime: DEFAULT_DEPARTURE_TIME,
        notificationTime: DEFAULT_NOTIFICATION_TIME,
        notificationEnabled,
      },
    });

    return {
      notificationEnabled: settings.notificationEnabled,
    };
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
