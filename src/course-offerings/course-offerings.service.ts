import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { CourseOffering, CourseOfferingStatus } from './entities/course-offering.entity.js';
import { OfferingSchedule } from './entities/offering-schedule.entity.js';
import { Course } from '../courses/entities/course.entity.js';
import { AcademicTerm, AcademicTermStatus } from '../academic-terms/entities/academic-term.entity.js';
import { TeacherProfile } from '../teachers/entities/teacher.entity.js';
import { Enrollment, EnrollmentStatus } from '../enrollments/entities/enrollment.entity.js';
import { Student } from '../students/entities/student.entity.js';
import { ClassSession, ClassSessionStatus } from '../class-sessions/entities/class-session.entity.js';
import {
  CreateCourseOfferingDto,
  UpdateCourseOfferingDto,
} from './dto/course-offering.dto.js';
import { TimetableConflictService } from '../timetable/timetable-conflict.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

@Injectable()
export class CourseOfferingsService {
  private readonly logger = new Logger(CourseOfferingsService.name);

  constructor(
    @InjectRepository(CourseOffering)
    private readonly offeringRepo: Repository<CourseOffering>,
    @InjectRepository(OfferingSchedule)
    private readonly scheduleRepo: Repository<OfferingSchedule>,
    @InjectRepository(Course)
    private readonly courseRepo: Repository<Course>,
    @InjectRepository(AcademicTerm)
    private readonly termRepo: Repository<AcademicTerm>,
    @InjectRepository(TeacherProfile)
    private readonly teacherRepo: Repository<TeacherProfile>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    @InjectRepository(ClassSession)
    private readonly sessionRepo: Repository<ClassSession>,
    private readonly conflictService: TimetableConflictService,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateCourseOfferingDto): Promise<CourseOffering> {
    const course = await this.courseRepo.findOne({ where: { id: dto.courseId } });
    if (!course) throw new NotFoundException('Course not found');

    const term = await this.termRepo.findOne({ where: { id: dto.termId } });
    if (!term) throw new NotFoundException('Academic term not found');

    if (dto.teacherId) {
      const teacher = await this.teacherRepo.findOne({ where: { id: dto.teacherId } });
      if (!teacher) throw new NotFoundException('Teacher profile not found');

      // Check teacher timetable conflict
      const teacherConflict = await this.conflictService.checkTeacherConflict(
        dto.teacherId,
        dto.schedules.map((s) => ({
          ...s,
          dayName: DAY_NAMES[s.dayOfWeek],
        })),
      );
      if (teacherConflict.hasConflict) {
        throw new ConflictException({
          message: 'Teacher has a schedule conflict with existing offerings',
          conflicts: teacherConflict.conflicts,
        });
      }
    }

    // Check classroom conflict
    if (dto.classroom) {
      const roomConflict = await this.conflictService.checkClassroomConflict(
        dto.classroom,
        dto.schedules.map((s) => ({
          ...s,
          dayName: DAY_NAMES[s.dayOfWeek],
        })),
      );
      if (roomConflict.hasConflict) {
        throw new ConflictException({
          message: `Classroom "${dto.classroom}" is already booked during these hours`,
          conflicts: roomConflict.conflicts,
        });
      }
    }

    // Generate unique offering code: e.g. WD101-SP26-SEC-A
    const cleanSection = dto.section.trim().replace(/\s+/g, '-').toUpperCase();
    let code = `${course.code}-${term.code}-${cleanSection}`;
    const existing = await this.offeringRepo.findOne({ where: { code } });
    if (existing) {
      code = `${code}-${Math.floor(Math.random() * 900 + 100)}`;
    }

    const offering = this.offeringRepo.create({
      courseId: dto.courseId,
      termId: dto.termId,
      teacherId: dto.teacherId || null,
      section: dto.section.trim(),
      code,
      classroom: dto.classroom?.trim() || 'Lab 1',
      capacity: dto.capacity || 30,
      enrolledCount: 0,
      status: CourseOfferingStatus.DRAFT,
      startDate: dto.startDate,
      endDate: dto.endDate,
      feeOverride: dto.feeOverride ?? null,
    });

    const saved = await this.offeringRepo.save(offering);

    if (dto.schedules && dto.schedules.length > 0) {
      const schedules = dto.schedules.map((s) =>
        this.scheduleRepo.create({
          offeringId: saved.id,
          dayOfWeek: s.dayOfWeek,
          dayName: DAY_NAMES[s.dayOfWeek],
          startTime: s.startTime,
          endTime: s.endTime,
          classroom: s.classroom?.trim() || saved.classroom,
        }),
      );
      await this.scheduleRepo.save(schedules);
    }

    return this.findOne(saved.id);
  }

  async findAll(query?: { termId?: string; courseId?: string; teacherId?: string; status?: string }) {
    const qb = this.offeringRepo
      .createQueryBuilder('offering')
      .leftJoinAndSelect('offering.course', 'course')
      .leftJoinAndSelect('offering.term', 'term')
      .leftJoinAndSelect('offering.teacher', 'teacher')
      .leftJoinAndSelect('teacher.user', 'teacherUser')
      .leftJoinAndSelect('offering.schedules', 'schedules')
      .orderBy('offering.createdAt', 'DESC');

    if (query?.termId) {
      qb.andWhere('offering.termId = :termId', { termId: query.termId });
    }
    if (query?.courseId) {
      qb.andWhere('offering.courseId = :courseId', { courseId: query.courseId });
    }
    if (query?.teacherId) {
      qb.andWhere('offering.teacherId = :teacherId', { teacherId: query.teacherId });
    }
    if (query?.status) {
      qb.andWhere('offering.status = :status', { status: query.status });
    }

    return qb.getMany();
  }

  async findOne(id: string): Promise<CourseOffering> {
    const offering = await this.offeringRepo.findOne({
      where: { id },
      relations: {
        course: true,
        term: true,
        teacher: { user: true },
        schedules: true,
        enrollments: { student: { user: true } },
        classSessions: true,
        assessments: true,
      },
    });
    if (!offering) {
      throw new NotFoundException('Course offering not found');
    }
    return offering;
  }

  async update(id: string, dto: UpdateCourseOfferingDto): Promise<CourseOffering> {
    const offering = await this.findOne(id);

    if (dto.teacherId !== undefined) {
      if (dto.teacherId) {
        const teacher = await this.teacherRepo.findOne({ where: { id: dto.teacherId } });
        if (!teacher) throw new NotFoundException('Teacher profile not found');
      }
      offering.teacherId = dto.teacherId || null;
    }

    if (dto.section !== undefined) offering.section = dto.section.trim();
    if (dto.classroom !== undefined) offering.classroom = dto.classroom.trim();
    if (dto.capacity !== undefined) offering.capacity = dto.capacity;
    if (dto.startDate !== undefined) offering.startDate = dto.startDate;
    if (dto.endDate !== undefined) offering.endDate = dto.endDate;
    if (dto.feeOverride !== undefined) offering.feeOverride = dto.feeOverride;

    await this.offeringRepo.save(offering);

    if (dto.schedules !== undefined) {
      await this.scheduleRepo.delete({ offeringId: id });
      if (dto.schedules.length > 0) {
        const schedules = dto.schedules.map((s) =>
          this.scheduleRepo.create({
            offeringId: id,
            dayOfWeek: s.dayOfWeek,
            dayName: DAY_NAMES[s.dayOfWeek],
            startTime: s.startTime,
            endTime: s.endTime,
            classroom: s.classroom?.trim() || offering.classroom,
          }),
        );
        await this.scheduleRepo.save(schedules);
      }
    }

    return this.findOne(id);
  }

  /**
   * Publish an offering: generates class session records across dates according to weekly schedules.
   */
  async publish(id: string): Promise<CourseOffering> {
    const offering = await this.offeringRepo.findOne({
      where: { id },
      relations: { course: true, schedules: true },
    });
    if (!offering) throw new NotFoundException('Course offering not found');

    if (!offering.schedules || offering.schedules.length === 0) {
      throw new BadRequestException('Cannot publish course offering without weekly schedules');
    }

    return this.dataSource.transaction(async (manager) => {
      offering.status = CourseOfferingStatus.PUBLISHED;
      await manager.save(offering);

      // Generate class sessions
      await manager.delete(ClassSession, { offeringId: id });

      const startDate = new Date(offering.startDate + 'T00:00:00Z');
      const endDate = new Date(offering.endDate + 'T23:59:59Z');
      const sessionsToCreate: Partial<ClassSession>[] = [];
      let sessionNumber = 1;

      // Iterate day by day
      const current = new Date(startDate);
      while (current <= endDate) {
        const dayOfWeek = current.getUTCDay();
        const matchingSchedules = offering.schedules.filter((s) => s.dayOfWeek === dayOfWeek);

        for (const schedule of matchingSchedules) {
          const dateString = current.toISOString().split('T')[0];
          sessionsToCreate.push({
            offeringId: id,
            sessionNumber,
            title: `Session ${sessionNumber}: ${offering.course?.name || 'Class'}`,
            sessionDate: dateString,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            classroom: schedule.classroom || offering.classroom,
            status: ClassSessionStatus.SCHEDULED,
          });
          sessionNumber++;
        }

        current.setUTCDate(current.getUTCDate() + 1);
      }

      if (sessionsToCreate.length > 0) {
        await manager.save(ClassSession, sessionsToCreate);
      }

      return offering;
    });
  }

  /**
   * Student Self-Service Open-Credit Course Registration
   * Concurrency-safe with pessimistic write lock on the offering.
   */
  async registerStudent(studentId: string, offeringId: string): Promise<Enrollment> {
    const student = await this.studentRepo.findOne({ where: { id: studentId } });
    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    return this.dataSource.transaction(async (manager) => {
      // 1. Lock offering row with pessimistic write lock (single row, no outer joins to avoid Postgres FOR UPDATE error)
      const lockedOffering = await manager
        .createQueryBuilder(CourseOffering, 'offering')
        .setLock('pessimistic_write')
        .where('offering.id = :id', { id: offeringId })
        .getOne();

      if (!lockedOffering) {
        throw new NotFoundException('Course offering not found');
      }

      // Load full offering with relations inside the locked transaction
      const offering = await manager.findOne(CourseOffering, {
        where: { id: offeringId },
        relations: {
          course: true,
          term: true,
          schedules: true,
        },
      });

      if (!offering) {
        throw new NotFoundException('Course offering not found');
      }

      if (
        offering.status !== CourseOfferingStatus.PUBLISHED &&
        offering.status !== CourseOfferingStatus.IN_PROGRESS
      ) {
        throw new BadRequestException('This course offering is not open for registration');
      }

      // Check registration period
      const today = new Date().toISOString().split('T')[0];
      if (offering.term?.registrationStartDate && today < offering.term.registrationStartDate) {
        throw new BadRequestException(
          `Course registration for ${offering.term.name} opens on ${offering.term.registrationStartDate}`,
        );
      }
      if (offering.term?.registrationEndDate && today > offering.term.registrationEndDate) {
        throw new BadRequestException(
          `Course registration for ${offering.term.name} closed on ${offering.term.registrationEndDate}`,
        );
      }

      // 2. Check Capacity
      if (offering.enrolledCount >= offering.capacity) {
        throw new ConflictException(
          `Course offering is full (${offering.enrolledCount}/${offering.capacity} seats taken).`,
        );
      }

      // 3. Check Duplicate Enrollment
      const existingEnrollment = await manager.findOne(Enrollment, {
        where: {
          studentId,
          offeringId,
          status: In([EnrollmentStatus.ACTIVE, EnrollmentStatus.PENDING]),
        },
      });
      if (existingEnrollment) {
        throw new BadRequestException('You are already registered for this course offering.');
      }

      // 4. Timetable Clash Detection
      const clashResult = await this.conflictService.checkStudentConflict(studentId, offeringId);
      if (clashResult.hasConflict) {
        throw new ConflictException({
          message: 'Registration failed due to a timetable clash with your current enrolled routine.',
          conflicts: clashResult.conflicts,
        });
      }

      // 5. Create Enrollment
      const fee = offering.feeOverride != null ? Number(offering.feeOverride) : Number(offering.course?.totalFee || 0);
      const enrollment = manager.create(Enrollment, {
        studentId,
        courseId: offering.courseId,
        offeringId: offering.id,
        enrollmentDate: today,
        agreedFee: fee,
        discount: 0,
        finalFee: fee,
        status: EnrollmentStatus.ACTIVE,
        notes: `Self-registered in section ${offering.section} (${offering.code})`,
      });

      const savedEnrollment = await manager.save(Enrollment, enrollment);

      // Increment offering enrolledCount
      offering.enrolledCount += 1;
      await manager.save(CourseOffering, offering);

      // Notification
      if (student.userId) {
        try {
          await this.notificationsService.sendToUser(student.userId, {
            title: 'Course Registration Confirmed',
            message: `Successfully registered for ${offering.course?.name || 'Course'} (${offering.code}). Check your visual routine!`,
            link: '/student/routine',
          });
        } catch (e) {
          this.logger.warn(`Failed to send registration notification: ${e}`);
        }
      }

      return savedEnrollment;
    });
  }

  /**
   * Get available course offerings for student self-service browser.
   */
  async getAvailableForStudent(studentId: string, termId?: string) {
    const qb = this.offeringRepo
      .createQueryBuilder('offering')
      .leftJoinAndSelect('offering.course', 'course')
      .leftJoinAndSelect('offering.term', 'term')
      .leftJoinAndSelect('offering.teacher', 'teacher')
      .leftJoinAndSelect('teacher.user', 'teacherUser')
      .leftJoinAndSelect('offering.schedules', 'schedules')
      .where('offering.status IN (:...statuses)', {
        statuses: [CourseOfferingStatus.PUBLISHED, CourseOfferingStatus.IN_PROGRESS],
      })
      .orderBy('course.name', 'ASC');

    if (termId) {
      qb.andWhere('offering.termId = :termId', { termId });
    }

    const offerings = await qb.getMany();

    // Check student's current enrollments
    const studentEnrollments = await this.enrollmentRepo.find({
      where: {
        studentId,
        status: In([EnrollmentStatus.ACTIVE, EnrollmentStatus.PENDING]),
      },
      relations: { offering: true },
    });

    const enrolledOfferingIds = new Set(
      studentEnrollments.map((e) => e.offeringId).filter(Boolean),
    );

    return offerings.map((o) => ({
      ...o,
      isEnrolled: enrolledOfferingIds.has(o.id),
      isFull: o.enrolledCount >= o.capacity,
      remainingSeats: Math.max(0, o.capacity - o.enrolledCount),
    }));
  }
}
