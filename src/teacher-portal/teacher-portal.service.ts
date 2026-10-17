import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import bcrypt from 'bcrypt';
import { TeacherProfile } from '../teachers/entities/teacher.entity.js';
import { User } from '../users/entities/user.entity.js';
import { CourseOffering, CourseOfferingStatus } from '../course-offerings/entities/course-offering.entity.js';
import { ClassSession, ClassSessionStatus } from '../class-sessions/entities/class-session.entity.js';
import { Enrollment, EnrollmentStatus } from '../enrollments/entities/enrollment.entity.js';
import { AttendanceService } from '../attendance/attendance.service.js';
import { GradebookService } from '../gradebook/gradebook.service.js';
import { ChangePasswordDto } from '../users/dto/change-password.dto.js';
import { CreateAssessmentDto, RecordGradesDto } from '../gradebook/dto/gradebook.dto.js';
import { BulkMarkAttendanceDto } from '../attendance/dto/attendance.dto.js';
import { CreateClassSessionDto } from '../class-sessions/dto/class-session.dto.js';

@Injectable()
export class TeacherPortalService {
  constructor(
    @InjectRepository(TeacherProfile)
    private readonly teacherRepo: Repository<TeacherProfile>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(CourseOffering)
    private readonly offeringRepo: Repository<CourseOffering>,
    @InjectRepository(ClassSession)
    private readonly sessionRepo: Repository<ClassSession>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepo: Repository<Enrollment>,
    private readonly attendanceService: AttendanceService,
    private readonly gradebookService: GradebookService,
  ) {}

  private async getTeacherByUserId(userId: string): Promise<TeacherProfile> {
    const teacher = await this.teacherRepo.findOne({
      where: { userId },
      relations: { user: true },
    });
    if (!teacher) {
      throw new NotFoundException('Teacher profile not found for authenticated user');
    }
    return teacher;
  }

  async getMe(userId: string) {
    const teacher = await this.getTeacherByUserId(userId);
    return teacher;
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const isValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (dto.newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters');
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    user.mustChangePassword = false;
    await this.userRepo.save(user);

    return { message: 'Password updated successfully' };
  }

  async getDashboard(userId: string) {
    const teacher = await this.getTeacherByUserId(userId);

    const offerings = await this.offeringRepo.find({
      where: {
        teacherId: teacher.id,
        status: In([CourseOfferingStatus.PUBLISHED, CourseOfferingStatus.IN_PROGRESS]),
      },
      relations: { course: true, term: true, schedules: true },
    });

    const offeringIds = offerings.map((o) => o.id);
    let totalStudents = 0;
    if (offeringIds.length > 0) {
      totalStudents = await this.enrollmentRepo.count({
        where: {
          offeringId: In(offeringIds),
          status: In([EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED]),
        },
      });
    }

    // Today's classes
    const today = new Date().toISOString().split('T')[0];
    const todaySessions = offeringIds.length > 0
      ? await this.sessionRepo.find({
          where: {
            offeringId: In(offeringIds),
            sessionDate: today,
          },
          relations: { offering: { course: true } },
          order: { startTime: 'ASC' },
        })
      : [];

    return {
      teacher,
      activeOfferingsCount: offerings.length,
      totalStudentsEnrolled: totalStudents,
      todaySessionsCount: todaySessions.length,
      todaySessions,
      offerings,
    };
  }

  async getTimetable(userId: string) {
    const teacher = await this.getTeacherByUserId(userId);

    const offerings = await this.offeringRepo.find({
      where: {
        teacherId: teacher.id,
        status: In([CourseOfferingStatus.PUBLISHED, CourseOfferingStatus.IN_PROGRESS]),
      },
      relations: {
        course: true,
        term: true,
        schedules: true,
      },
    });

    const weeklyRoutine: any[] = [];
    for (const off of offerings) {
      for (const sch of off.schedules || []) {
        weeklyRoutine.push({
          offeringId: off.id,
          offeringCode: off.code,
          courseName: off.course.name,
          section: off.section,
          classroom: sch.classroom || off.classroom,
          dayOfWeek: sch.dayOfWeek,
          dayName: sch.dayName,
          startTime: sch.startTime,
          endTime: sch.endTime,
        });
      }
    }

    weeklyRoutine.sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      return a.startTime.localeCompare(b.startTime);
    });

    return {
      teacherId: teacher.id,
      routine: weeklyRoutine,
    };
  }

  async getCourses(userId: string) {
    const teacher = await this.getTeacherByUserId(userId);
    return this.offeringRepo.find({
      where: { teacherId: teacher.id },
      relations: { course: true, term: true, schedules: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getCourse(userId: string, offeringId: string) {
    const teacher = await this.getTeacherByUserId(userId);
    const offering = await this.offeringRepo.findOne({
      where: { id: offeringId, teacherId: teacher.id },
      relations: {
        course: true,
        term: true,
        schedules: true,
        classSessions: true,
        assessments: true,
      },
    });
    if (!offering) {
      throw new NotFoundException('Course offering not found or not assigned to you');
    }
    return offering;
  }

  async getCourseRoster(userId: string, offeringId: string) {
    const teacher = await this.getTeacherByUserId(userId);
    const offering = await this.offeringRepo.findOne({
      where: { id: offeringId, teacherId: teacher.id },
      relations: { course: true },
    });
    if (!offering) {
      throw new NotFoundException('Course offering not found or not assigned to you');
    }

    const enrollments = await this.enrollmentRepo.find({
      where: {
        offeringId,
        status: In([EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED]),
      },
      relations: { student: { user: true } },
      order: { student: { registrationNumber: 'ASC' } },
    });

    const students = await Promise.all(
      enrollments.map(async (enr) => {
        const attReport = await this.attendanceService.getStudentAttendanceReport(
          enr.student.id,
          offeringId,
        );
        return {
          id: enr.student.id,
          registrationNumber: enr.student.registrationNumber,
          fullName: enr.student.fullName,
          email: enr.student.user?.email || null,
          mobileNumber: enr.student.mobileNumber,
          enrollmentDate: enr.enrollmentDate,
          attendancePercentage: attReport.attendancePercentage,
          totalClassesAttended: attReport.presentCount + attReport.lateCount,
          totalClassesHeld: attReport.totalSessions,
        };
      }),
    );

    return {
      offering,
      students,
    };
  }

  async getCourseSessions(userId: string, offeringId: string) {
    const teacher = await this.getTeacherByUserId(userId);
    const offering = await this.offeringRepo.findOne({
      where: { id: offeringId, teacherId: teacher.id },
      relations: {
        schedules: true,
        course: true,
      },
    });
    if (!offering) {
      throw new NotFoundException('Course offering not found or not assigned to you');
    }

    let sessions = await this.sessionRepo.find({
      where: { offeringId },
      order: { sessionNumber: 'ASC' },
    });

    if (sessions.length === 0) {
      sessions = await this.generateSessionsForOffering(offering);
    }

    return sessions;
  }

  async generateSessionsForOffering(offering: CourseOffering): Promise<ClassSession[]> {
    const schedules = offering.schedules || [];
    const createdSessions: ClassSession[] = [];

    if (schedules.length > 0) {
      const startDate = offering.startDate
        ? new Date(offering.startDate + 'T00:00:00')
        : new Date();
      const endDate = offering.endDate
        ? new Date(offering.endDate + 'T00:00:00')
        : new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days

      const currentDate = new Date(startDate);
      let sessionNumber = 1;

      while (currentDate <= endDate && sessionNumber <= 30) {
        const dayOfWeek = currentDate.getDay();
        const matchingSchedule = schedules.find((s) => s.dayOfWeek === dayOfWeek);

        if (matchingSchedule) {
          const dateStr = currentDate.toISOString().split('T')[0];
          const newSession = this.sessionRepo.create({
            offeringId: offering.id,
            sessionNumber,
            title: `${offering.course?.name || 'Class'} - Session #${sessionNumber}`,
            sessionDate: dateStr,
            startTime: matchingSchedule.startTime.substring(0, 5),
            endTime: matchingSchedule.endTime.substring(0, 5),
            classroom: matchingSchedule.classroom || offering.classroom || 'Lab 1',
            status: ClassSessionStatus.SCHEDULED,
            topic: null,
          });
          createdSessions.push(newSession);
          sessionNumber++;
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    if (createdSessions.length === 0) {
      const baseDate = offering.startDate
        ? new Date(offering.startDate + 'T00:00:00')
        : new Date();

      for (let i = 1; i <= 12; i++) {
        const d = new Date(baseDate.getTime() + (i - 1) * 7 * 24 * 60 * 60 * 1000);
        const dateStr = d.toISOString().split('T')[0];
        const newSession = this.sessionRepo.create({
          offeringId: offering.id,
          sessionNumber: i,
          title: `${offering.course?.name || 'Class'} - Session #${i}`,
          sessionDate: dateStr,
          startTime: '10:00',
          endTime: '12:00',
          classroom: offering.classroom || 'Lab 1',
          status: ClassSessionStatus.SCHEDULED,
          topic: `Module ${i} Discussion & Lab Practice`,
        });
        createdSessions.push(newSession);
      }
    }

    return this.sessionRepo.save(createdSessions);
  }

  async createCourseSession(
    userId: string,
    offeringId: string,
    dto: CreateClassSessionDto,
  ): Promise<ClassSession> {
    const teacher = await this.getTeacherByUserId(userId);
    const offering = await this.offeringRepo.findOne({
      where: { id: offeringId, teacherId: teacher.id },
      relations: { course: true },
    });
    if (!offering) {
      throw new NotFoundException('Course offering not found or not assigned to you');
    }

    const maxSession = await this.sessionRepo.findOne({
      where: { offeringId },
      order: { sessionNumber: 'DESC' },
    });
    const nextNumber = (maxSession?.sessionNumber || 0) + 1;

    const session = this.sessionRepo.create({
      offeringId,
      sessionNumber: nextNumber,
      title: dto.title?.trim() || `${offering.course?.name || 'Class'} - Session #${nextNumber}`,
      sessionDate: dto.sessionDate,
      startTime: dto.startTime.substring(0, 5),
      endTime: dto.endTime.substring(0, 5),
      classroom: dto.classroom?.trim() || offering.classroom || 'Lab 1',
      status: ClassSessionStatus.SCHEDULED,
      topic: dto.topic?.trim() || null,
    });

    return this.sessionRepo.save(session);
  }

  async markSessionAttendance(
    userId: string,
    sessionId: string,
    dto: BulkMarkAttendanceDto,
  ) {
    const teacher = await this.getTeacherByUserId(userId);
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: { offering: true },
    });
    if (!session || session.offering.teacherId !== teacher.id) {
      throw new NotFoundException('Class session not found or not assigned to you');
    }

    return this.attendanceService.bulkMarkAttendance(sessionId, dto, userId);
  }

  async getCourseGradebook(userId: string, offeringId: string) {
    const teacher = await this.getTeacherByUserId(userId);
    const offering = await this.offeringRepo.findOne({
      where: { id: offeringId, teacherId: teacher.id },
    });
    if (!offering) {
      throw new NotFoundException('Course offering not found or not assigned to you');
    }

    return this.gradebookService.getOfferingGradebook(offeringId);
  }

  async createAssessment(userId: string, dto: CreateAssessmentDto) {
    const teacher = await this.getTeacherByUserId(userId);
    const offering = await this.offeringRepo.findOne({
      where: { id: dto.offeringId, teacherId: teacher.id },
    });
    if (!offering) {
      throw new NotFoundException('Course offering not found or not assigned to you');
    }

    return this.gradebookService.createAssessment(dto);
  }

  async recordGrades(userId: string, assessmentId: string, dto: RecordGradesDto) {
    return this.gradebookService.recordGrades(assessmentId, dto, userId);
  }
}
