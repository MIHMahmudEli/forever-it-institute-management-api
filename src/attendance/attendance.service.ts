import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { AttendanceRecord, AttendanceStatus } from './entities/attendance-record.entity.js';
import { ClassSession, ClassSessionStatus } from '../class-sessions/entities/class-session.entity.js';
import { Enrollment, EnrollmentStatus } from '../enrollments/entities/enrollment.entity.js';
import { Student } from '../students/entities/student.entity.js';
import { BulkMarkAttendanceDto } from './dto/attendance.dto.js';
import { NotificationsService } from '../notifications/notifications.service.js';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    @InjectRepository(AttendanceRecord)
    private readonly attendanceRepo: Repository<AttendanceRecord>,
    @InjectRepository(ClassSession)
    private readonly sessionRepo: Repository<ClassSession>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  async getSessionAttendance(sessionId: string) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: {
        offering: {
          course: true,
          term: true,
          teacher: { user: true },
        },
      },
    });
    if (!session) {
      throw new NotFoundException('Class session not found');
    }

    // Load active enrolled students in this offering
    const enrollments = await this.enrollmentRepo.find({
      where: {
        offeringId: session.offeringId,
        status: In([EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED]),
      },
      relations: {
        student: { user: true },
      },
      order: {
        student: { registrationNumber: 'ASC' },
      },
    });

    // Load existing attendance records for this session
    const existingRecords = await this.attendanceRepo.find({
      where: { sessionId },
    });
    const recordMap = new Map<string, AttendanceRecord>();
    for (const rec of existingRecords) {
      recordMap.set(rec.studentId, rec);
    }

    const students = enrollments.map((enr) => {
      const rec = recordMap.get(enr.studentId);
      return {
        studentId: enr.student.id,
        registrationNumber: enr.student.registrationNumber,
        fullName: enr.student.fullName,
        email: enr.student.user?.email || null,
        mobileNumber: enr.student.mobileNumber,
        status: rec ? rec.status : null,
        remarks: rec ? rec.remarks : null,
        markedAt: rec ? rec.markedAt : null,
      };
    });

    return {
      session,
      totalEnrolled: enrollments.length,
      markedCount: existingRecords.length,
      students,
    };
  }

  async bulkMarkAttendance(sessionId: string, dto: BulkMarkAttendanceDto, markedByUserId?: string) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: { offering: { course: true } },
    });
    if (!session) {
      throw new NotFoundException('Class session not found');
    }

    await this.dataSource.transaction(async (manager) => {
      for (const item of dto.records) {
        let rec = await manager.findOne(AttendanceRecord, {
          where: { sessionId, studentId: item.studentId },
        });

        if (rec) {
          rec.status = item.status;
          rec.remarks = item.remarks || null;
          rec.markedBy = markedByUserId || null;
          rec.markedAt = new Date();
        } else {
          rec = manager.create(AttendanceRecord, {
            sessionId,
            studentId: item.studentId,
            status: item.status,
            remarks: item.remarks || null,
            markedBy: markedByUserId || null,
            markedAt: new Date(),
          });
        }

        await manager.save(AttendanceRecord, rec);
      }

      // Mark session as COMPLETED if not already
      session.status = ClassSessionStatus.COMPLETED;
      await manager.save(ClassSession, session);
    });

    // Check attendance threshold and notify any students with attendance below 75%
    for (const item of dto.records) {
      if (item.status === AttendanceStatus.ABSENT) {
        try {
          const report = await this.getStudentAttendanceReport(item.studentId, session.offeringId);
          if (report.attendancePercentage < 75 && report.totalSessions >= 3) {
            const student = await this.studentRepo.findOne({
              where: { id: item.studentId },
              relations: { user: true },
            });
            if (student?.userId) {
              await this.notificationsService.sendToUser(student.userId, {
                title: 'Low Attendance Warning',
                message: `Your attendance in ${session.offering.course.name} is ${report.attendancePercentage}%. Please ensure regular attendance to maintain academic standing.`,
                link: '/student/attendance',
              });
            }
          }
        } catch (e) {
          this.logger.warn(`Failed to process low attendance alert: ${e}`);
        }
      }
    }

    return this.getSessionAttendance(sessionId);
  }

  async getStudentAttendanceReport(studentId: string, offeringId?: string) {
    const qb = this.attendanceRepo
      .createQueryBuilder('att')
      .innerJoinAndSelect('att.session', 'session')
      .innerJoinAndSelect('session.offering', 'offering')
      .innerJoinAndSelect('offering.course', 'course')
      .where('att.studentId = :studentId', { studentId })
      .orderBy('session.sessionDate', 'DESC');

    if (offeringId) {
      qb.andWhere('session.offeringId = :offeringId', { offeringId });
    }

    const records = await qb.getMany();

    const totalSessions = records.length;
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;

    for (const r of records) {
      if (r.status === AttendanceStatus.PRESENT) presentCount++;
      else if (r.status === AttendanceStatus.ABSENT) absentCount++;
      else if (r.status === AttendanceStatus.LATE) lateCount++;
      else if (r.status === AttendanceStatus.EXCUSED) excusedCount++;
    }

    // Rate calculation: Present = 1.0, Late = 0.5, Excused = 1.0
    const weightedScore = presentCount + lateCount * 0.5 + excusedCount;
    const attendancePercentage =
      totalSessions > 0 ? Math.round((weightedScore / totalSessions) * 100) : 100;

    return {
      studentId,
      totalSessions,
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
      attendancePercentage,
      records: records.map((r) => ({
        id: r.id,
        sessionId: r.sessionId,
        courseName: r.session.offering?.course?.name,
        offeringCode: r.session.offering?.code,
        sessionNumber: r.session.sessionNumber,
        sessionTitle: r.session.title,
        sessionDate: r.session.sessionDate,
        startTime: r.session.startTime,
        endTime: r.session.endTime,
        classroom: r.session.classroom,
        status: r.status,
        remarks: r.remarks,
        markedAt: r.markedAt,
      })),
    };
  }
}
