import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment, EnrollmentStatus } from './entities/enrollment.entity.js';
import { Student } from '../students/entities/student.entity.js';
import { Course } from '../courses/entities/course.entity.js';
import { CreateEnrollmentDto, UpdateEnrollmentDto } from './dto/create-enrollment.dto.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { NotificationType } from '../notifications/entities/notification.entity.js';

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(createEnrollmentDto: CreateEnrollmentDto) {
    const student = await this.studentRepository.findOne({
      where: { id: createEnrollmentDto.studentId, isArchived: false },
    });
    if (!student) {
      throw new NotFoundException(`Student with ID ${createEnrollmentDto.studentId} not found.`);
    }

    const course = await this.courseRepository.findOne({
      where: { id: createEnrollmentDto.courseId },
    });
    if (!course) {
      throw new NotFoundException(`Course with ID ${createEnrollmentDto.courseId} not found.`);
    }

    // Check duplicate active enrollment
    const existingActive = await this.enrollmentRepository.findOne({
      where: {
        studentId: student.id,
        courseId: course.id,
        status: EnrollmentStatus.ACTIVE,
      },
    });

    if (existingActive) {
      throw new ConflictException(`Student is already actively enrolled in course: ${course.name}`);
    }

    const agreedFee = createEnrollmentDto.agreedFee !== undefined
      ? Number(createEnrollmentDto.agreedFee)
      : Number(course.totalFee);

    const discount = Number(createEnrollmentDto.discount || 0);
    if (discount > agreedFee) {
      throw new BadRequestException('Discount cannot exceed the agreed course fee.');
    }

    const finalFee = agreedFee - discount;

    // If an existing pending request exists, activate/update it
    const existingPending = await this.enrollmentRepository.findOne({
      where: {
        studentId: student.id,
        courseId: course.id,
        status: EnrollmentStatus.PENDING,
      },
    });

    if (existingPending) {
      existingPending.agreedFee = agreedFee;
      existingPending.discount = discount;
      existingPending.finalFee = finalFee;
      existingPending.status = createEnrollmentDto.status || EnrollmentStatus.ACTIVE;
      existingPending.enrollmentDate = createEnrollmentDto.enrollmentDate || new Date().toISOString().split('T')[0];
      if (createEnrollmentDto.notes) {
        existingPending.notes = createEnrollmentDto.notes;
      }
      const savedPending = await this.enrollmentRepository.save(existingPending);
      if (student.userId && savedPending.status === EnrollmentStatus.ACTIVE) {
        this.notificationsService.sendToUser(student.userId, {
          title: 'Course Enrollment Activated',
          message: `Your enrollment in "${course.name}" is now active!`,
          type: NotificationType.ENROLLMENT_APPROVED,
          link: '/student/courses',
          metadata: { courseId: course.id, enrollmentId: savedPending.id },
        }).catch(() => {});
      }
      return savedPending;
    }

    const enrollment = this.enrollmentRepository.create({
      studentId: student.id,
      courseId: course.id,
      enrollmentDate: createEnrollmentDto.enrollmentDate || new Date().toISOString().split('T')[0],
      agreedFee,
      discount,
      finalFee,
      status: createEnrollmentDto.status || EnrollmentStatus.ACTIVE,
      notes: createEnrollmentDto.notes || null,
    });

    const saved = await this.enrollmentRepository.save(enrollment);
    if (student.userId && saved.status === EnrollmentStatus.ACTIVE) {
      this.notificationsService.sendToUser(student.userId, {
        title: 'Course Enrollment Activated',
        message: `Your enrollment in "${course.name}" is now active!`,
        type: NotificationType.ENROLLMENT_APPROVED,
        link: '/student/courses',
        metadata: { courseId: course.id, enrollmentId: saved.id },
      }).catch(() => {});
    }

    return saved;
  }

  async findAll(studentId?: string, courseId?: string, status?: EnrollmentStatus) {
    const qb = this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.student', 'student')
      .leftJoinAndSelect('enrollment.course', 'course')
      .leftJoinAndSelect('enrollment.payments', 'payment');

    if (studentId) {
      qb.andWhere('enrollment.studentId = :studentId', { studentId });
    }
    if (courseId) {
      qb.andWhere('enrollment.courseId = :courseId', { courseId });
    }
    if (status) {
      qb.andWhere('enrollment.status = :status', { status });
    }

    qb.orderBy('enrollment.createdAt', 'DESC');
    return qb.getMany();
  }

  async findOne(id: string) {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id },
      relations: { student: true, course: true, payments: true },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${id} not found.`);
    }

    return enrollment;
  }

  async update(id: string, updateEnrollmentDto: UpdateEnrollmentDto) {
    const enrollment = await this.enrollmentRepository.findOne({ where: { id } });
    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${id} not found.`);
    }

    if (updateEnrollmentDto.status !== undefined) {
      enrollment.status = updateEnrollmentDto.status;
    }
    if (updateEnrollmentDto.agreedFee !== undefined) {
      enrollment.agreedFee = Number(updateEnrollmentDto.agreedFee);
    }
    const currentAgreed = Number(enrollment.agreedFee);
    if (updateEnrollmentDto.discount !== undefined) {
      const discount = Number(updateEnrollmentDto.discount);
      if (discount > currentAgreed) {
        throw new BadRequestException('Discount cannot exceed the agreed course fee.');
      }
      enrollment.discount = discount;
    }
    enrollment.finalFee = currentAgreed - Number(enrollment.discount || 0);

    if (updateEnrollmentDto.notes !== undefined) {
      enrollment.notes = updateEnrollmentDto.notes;
    }

    const saved = await this.enrollmentRepository.save(enrollment);

    if (updateEnrollmentDto.status !== undefined) {
      this.studentRepository.findOne({ where: { id: saved.studentId } }).then((st) => {
        if (st?.userId) {
          this.courseRepository.findOne({ where: { id: saved.courseId } }).then((c) => {
            const courseName = c?.name || 'course';
            const isApproved = saved.status === EnrollmentStatus.ACTIVE;
            this.notificationsService.sendToUser(st.userId!, {
              title: isApproved ? 'Course Enrollment Approved' : `Enrollment Status: ${saved.status}`,
              message: isApproved
                ? `Your enrollment for "${courseName}" has been approved and activated.`
                : `Your enrollment for "${courseName}" status is now ${saved.status}.`,
              type: isApproved ? NotificationType.ENROLLMENT_APPROVED : NotificationType.SYSTEM,
              link: '/student/courses',
              metadata: { enrollmentId: saved.id },
            }).catch(() => {});
          });
        }
      }).catch(() => {});
    }

    return saved;
  }
}
