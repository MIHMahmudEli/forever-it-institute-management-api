import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity.js';
import { PushSubscriptionEntity } from './entities/push-subscription.entity.js';
import { User } from '../users/entities/user.entity.js';
import { NotificationsService } from './notifications.service.js';
import { NotificationsController } from './notifications.controller.js';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, PushSubscriptionEntity, User]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
