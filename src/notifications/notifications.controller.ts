import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service.js';
import {
  SubscribePushDto,
  UnsubscribePushDto,
  QueryNotificationsDto,
} from './dto/notifications.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../users/entities/user.entity.js';
import { NotificationType } from './entities/notification.entity.js';

@ApiTags('Notifications')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('vapid-public-key')
  @ApiOperation({ summary: 'Get public VAPID key for web push subscription' })
  @ApiResponse({ status: 200, description: 'VAPID public key returned' })
  getVapidPublicKey() {
    return this.notificationsService.getVapidPublicKey();
  }

  @Get()
  @ApiOperation({ summary: 'List notifications for the logged-in user' })
  @ApiResponse({ status: 200, description: 'Notifications list returned' })
  async findAll(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Query() query: QueryNotificationsDto,
  ) {
    return this.notificationsService.findAll(userId, role, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get count of unread notifications' })
  @ApiResponse({ status: 200, description: 'Unread notification count returned' })
  async getUnreadCount(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    const unreadCount = await this.notificationsService.getUnreadCount(userId, role);
    return { unreadCount };
  }

  @Post('push-subscription')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register browser Web Push subscription' })
  @ApiResponse({ status: 200, description: 'Subscription saved' })
  async subscribePush(
    @CurrentUser('id') userId: string,
    @Body() dto: SubscribePushDto,
  ) {
    return this.notificationsService.subscribePush(userId, dto);
  }

  @Delete('push-subscription')
  @ApiOperation({ summary: 'Unsubscribe browser Web Push' })
  @ApiResponse({ status: 200, description: 'Subscription removed' })
  async unsubscribePush(
    @CurrentUser('id') userId: string,
    @Body() dto: UnsubscribePushDto,
  ) {
    return this.notificationsService.unsubscribePush(userId, dto.endpoint);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read for current user' })
  @ApiResponse({ status: 200, description: 'All marked as read' })
  async markAllAsRead(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.notificationsService.markAllAsRead(userId, role);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a single notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markAsRead(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(id, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiResponse({ status: 200, description: 'Notification deleted' })
  async deleteNotification(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.notificationsService.deleteNotification(id, userId);
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a test notification to the current user' })
  @ApiResponse({ status: 200, description: 'Test notification dispatched' })
  async sendTestNotification(
    @CurrentUser('id') userId: string,
    @CurrentUser('fullName') fullName: string,
  ) {
    return this.notificationsService.sendToUser(userId, {
      title: 'Test Notification Received',
      message: `Hello ${fullName || 'there'}, your central notification and push connection is active and working perfectly!`,
      type: NotificationType.SYSTEM,
      link: '/notifications',
    });
  }
}
