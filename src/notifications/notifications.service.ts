import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import webpush from 'web-push';
import { Notification, NotificationType } from './entities/notification.entity.js';
import { PushSubscriptionEntity } from './entities/push-subscription.entity.js';
import { User, UserRole } from '../users/entities/user.entity.js';
import {
  SubscribePushDto,
  QueryNotificationsDto,
  CreateNotificationDto,
} from './dto/notifications.dto.js';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly vapidPublicKey: string;
  private readonly vapidPrivateKey: string;
  private readonly vapidSubject: string;

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(PushSubscriptionEntity)
    private readonly pushSubRepository: Repository<PushSubscriptionEntity>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {
    this.vapidPublicKey =
      this.configService.get<string>('webPush.publicKey') ||
      'BDy35FOKVcTvA1zqgcYYHbL4mC1dpVhnzMg1vP_lFokIugBUpfe5ADn6NCpm2agcwF7iZpwuEjfjqxYAbsnEQ4E';
    this.vapidPrivateKey =
      this.configService.get<string>('webPush.privateKey') ||
      'Z0XZCq2EQU5XbjK5hJp82cUUGkGnUpsFHNtvLhgRreA';
    this.vapidSubject =
      this.configService.get<string>('webPush.subject') ||
      'mailto:admin@foreveritbd.com';

    try {
      webpush.setVapidDetails(
        this.vapidSubject,
        this.vapidPublicKey,
        this.vapidPrivateKey,
      );
      this.logger.log('WebPush VAPID configuration initialized successfully');
    } catch (err: any) {
      this.logger.error('Failed to initialize WebPush VAPID details', err?.message);
    }
  }

  getVapidPublicKey(): { publicKey: string } {
    return { publicKey: this.vapidPublicKey };
  }

  async subscribePush(userId: string, dto: SubscribePushDto) {
    let sub = await this.pushSubRepository.findOne({
      where: { endpoint: dto.endpoint },
    });

    if (!sub) {
      sub = this.pushSubRepository.create({
        userId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent: dto.userAgent || null,
      });
    } else {
      sub.userId = userId;
      sub.p256dh = dto.keys.p256dh;
      sub.auth = dto.keys.auth;
      if (dto.userAgent) sub.userAgent = dto.userAgent;
    }

    const saved = await this.pushSubRepository.save(sub);
    this.logger.log(`Push subscription registered for user ${userId}`);

    // Send a welcome push test notification to verify delivery
    try {
      await this.deliverPushToSubscription(saved, {
        title: 'Forever IT Notifications Enabled',
        body: 'You will receive real-time updates and institute alerts directly on this device.',
        url: '/notifications',
        tag: 'welcome-notification',
      });
    } catch (err: any) {
      this.logger.warn(`Initial push test failed: ${err?.message}`);
    }

    return { success: true, message: 'Push subscription registered successfully' };
  }

  async unsubscribePush(userId: string, endpoint: string) {
    await this.pushSubRepository.delete({ userId, endpoint });
    return { success: true, message: 'Push subscription removed successfully' };
  }

  /**
   * Send notification to a single targeted user
   */
  async sendToUser(
    userId: string,
    data: {
      title: string;
      message: string;
      type?: NotificationType;
      link?: string;
      metadata?: Record<string, any>;
    },
  ) {
    const notification = this.notificationRepository.create({
      userId,
      title: data.title,
      message: data.message,
      type: data.type || NotificationType.SYSTEM,
      link: data.link || null,
      metadata: data.metadata || null,
      isRead: false,
    });

    const saved = await this.notificationRepository.save(notification);

    // Trigger Web Push to user's registered devices
    this.pushToUsers([userId], {
      title: data.title,
      body: data.message,
      url: data.link || '/notifications',
      tag: `notif-${saved.id}`,
      data: { notificationId: saved.id, ...data.metadata },
    }).catch((err) => {
      this.logger.error(`Failed to dispatch web push to user ${userId}`, err);
    });

    return saved;
  }

  /**
   * Send notification to all active Staff and Admin users
   */
  async sendToStaffAndAdmin(data: {
    title: string;
    message: string;
    type?: NotificationType;
    link?: string;
    metadata?: Record<string, any>;
  }) {
    const staffAndAdmins = await this.userRepository.find({
      where: [
        { role: UserRole.ADMIN, isActive: true },
        { role: UserRole.STAFF, isActive: true },
      ],
      select: { id: true, email: true, fullName: true, role: true },
    });

    if (staffAndAdmins.length === 0) {
      return [];
    }

    const notifications = staffAndAdmins.map((user) =>
      this.notificationRepository.create({
        userId: user.id,
        targetRole: user.role,
        title: data.title,
        message: data.message,
        type: data.type || NotificationType.SYSTEM,
        link: data.link || null,
        metadata: data.metadata || null,
        isRead: false,
      }),
    );

    const saved = await this.notificationRepository.save(notifications);

    // Push to all their devices
    const userIds = staffAndAdmins.map((u) => u.id);
    this.pushToUsers(userIds, {
      title: data.title,
      body: data.message,
      url: data.link || '/notifications',
      tag: `staff-alert-${Date.now()}`,
      data: { type: data.type, ...data.metadata },
    }).catch((err) => {
      this.logger.error('Failed to dispatch web push to staff and admins', err);
    });

    return saved;
  }

  /**
   * Generic create notification
   */
  async createNotification(dto: CreateNotificationDto) {
    if (dto.userId) {
      return this.sendToUser(dto.userId, {
        title: dto.title,
        message: dto.message,
        type: dto.type,
        link: dto.link,
        metadata: dto.metadata,
      });
    }

    if (dto.targetRole) {
      const users = await this.userRepository.find({
        where: { role: dto.targetRole, isActive: true },
        select: { id: true },
      });
      const notifications = users.map((u) =>
        this.notificationRepository.create({
          userId: u.id,
          targetRole: dto.targetRole,
          title: dto.title,
          message: dto.message,
          type: dto.type || NotificationType.SYSTEM,
          link: dto.link || null,
          metadata: dto.metadata || null,
          isRead: false,
        }),
      );
      const saved = await this.notificationRepository.save(notifications);
      this.pushToUsers(
        users.map((u) => u.id),
        {
          title: dto.title,
          body: dto.message,
          url: dto.link || '/notifications',
        },
      ).catch(() => {});
      return saved;
    }

    // Default: send to staff & admins
    return this.sendToStaffAndAdmin(dto);
  }

  /**
   * Dispatch Web Push payloads to specified user IDs
   */
  async pushToUsers(
    userIds: string[],
    payload: {
      title: string;
      body: string;
      url?: string;
      icon?: string;
      tag?: string;
      data?: any;
    },
  ) {
    if (!userIds || userIds.length === 0) return;

    const subscriptions = await this.pushSubRepository.find({
      where: { userId: In(userIds) },
    });

    if (subscriptions.length === 0) return;

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || '/notifications',
      icon: payload.icon || '/icon.svg',
      tag: payload.tag || 'general-notification',
      data: payload.data || {},
    });

    const sendPromises = subscriptions.map((sub) =>
      this.deliverPushToSubscription(sub, payload),
    );

    await Promise.allSettled(sendPromises);
  }

  private async deliverPushToSubscription(
    sub: PushSubscriptionEntity,
    payload: {
      title: string;
      body: string;
      url?: string;
      icon?: string;
      tag?: string;
      data?: any;
    },
  ) {
    const pushConfig = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || '/notifications',
      icon: payload.icon || '/icon.svg',
      tag: payload.tag || 'default-tag',
      data: payload.data || {},
    });

    try {
      await webpush.sendNotification(pushConfig, notificationPayload);
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        // The subscription has expired or is no longer valid
        this.logger.warn(`Removing expired push subscription ${sub.id}`);
        await this.pushSubRepository.delete(sub.id).catch(() => {});
      } else {
        this.logger.error(`Error sending push notification to sub ${sub.id}: ${err?.message}`);
      }
    }
  }

  /**
   * Find notifications for a given user
   */
  async findAll(userId: string, userRole: UserRole, query: QueryNotificationsDto) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;

    const qb = this.notificationRepository
      .createQueryBuilder('n')
      .where('(n.userId = :userId OR (n.userId IS NULL AND (n.targetRole = :userRole OR n.targetRole IS NULL)))', {
        userId,
        userRole,
      });

    if (query.isRead !== undefined) {
      const isReadBool = query.isRead === 'true';
      qb.andWhere('n.isRead = :isReadBool', { isReadBool });
    }

    if (query.type) {
      qb.andWhere('n.type = :type', { type: query.type });
    }

    qb.orderBy('n.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    const unreadCount = await this.getUnreadCount(userId, userRole);

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        unreadCount,
      },
    };
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string, userRole: UserRole): Promise<number> {
    return this.notificationRepository
      .createQueryBuilder('n')
      .where('(n.userId = :userId OR (n.userId IS NULL AND (n.targetRole = :userRole OR n.targetRole IS NULL)))', {
        userId,
        userRole,
      })
      .andWhere('n.isRead = false')
      .getCount();
  }

  /**
   * Mark single notification as read
   */
  async markAsRead(id: string, userId: string) {
    const notification = await this.notificationRepository.findOne({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found.');
    }

    if (notification.userId && notification.userId !== userId) {
      // not their notification
      return notification;
    }

    notification.isRead = true;
    notification.readAt = new Date();
    return this.notificationRepository.save(notification);
  }

  /**
   * Mark all notifications as read for current user
   */
  async markAllAsRead(userId: string, userRole: UserRole) {
    await this.notificationRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true, readAt: new Date() })
      .where('(userId = :userId OR (userId IS NULL AND (targetRole = :userRole OR targetRole IS NULL)))', {
        userId,
        userRole,
      })
      .andWhere('isRead = false')
      .execute();

    return { success: true, message: 'All notifications marked as read.' };
  }

  /**
   * Delete a notification
   */
  async deleteNotification(id: string, userId: string) {
    const notification = await this.notificationRepository.findOne({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found.');
    }

    if (notification.userId && notification.userId !== userId) {
      return { success: false, message: 'Unauthorized' };
    }

    await this.notificationRepository.delete(id);
    return { success: true, message: 'Notification deleted successfully.' };
  }
}
