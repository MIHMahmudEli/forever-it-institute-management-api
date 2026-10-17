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
    });
    if (!offering) {
      throw new NotFoundException('Course offering not found or not assigned to you');
    }

    return this.sessionRepo.find({
      where: { offeringId },
      order: { sessionNumber: 'ASC' },
    });
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
