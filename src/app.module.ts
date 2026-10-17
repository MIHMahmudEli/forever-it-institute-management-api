import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { CoursesModule } from './courses/courses.module.js';
import { StudentsModule } from './students/students.module.js';
import { EnrollmentsModule } from './enrollments/enrollments.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { RegistrationsModule } from './registrations/registrations.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { HealthModule } from './health/health.module.js';
import { AuditLogsModule } from './audit-logs/audit-logs.module.js';

import { DropRequestsModule } from './drop-requests/drop-requests.module.js';
import { StudentPortalModule } from './student-portal/student-portal.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { AcademicTermsModule } from './academic-terms/academic-terms.module.js';
import { TeachersModule } from './teachers/teachers.module.js';
import { TimetableModule } from './timetable/timetable.module.js';
import { CourseOfferingsModule } from './course-offerings/course-offerings.module.js';
import { AttendanceModule } from './attendance/attendance.module.js';
import { GradebookModule } from './gradebook/gradebook.module.js';
import { TeacherPortalModule } from './teacher-portal/teacher-portal.module.js';
import { ParentsModule } from './parents/parents.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => configService.get('database')!,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    AuditLogsModule,
    AuthModule,
    UsersModule,
    CoursesModule,
    StudentsModule,
    EnrollmentsModule,
    PaymentsModule,
    RegistrationsModule,
    DashboardModule,
    ReportsModule,
    HealthModule,
    DropRequestsModule,
    StudentPortalModule,
    NotificationsModule,
    AcademicTermsModule,
    TeachersModule,
    TimetableModule,
    CourseOfferingsModule,
    AttendanceModule,
    GradebookModule,
    TeacherPortalModule,
    ParentsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
