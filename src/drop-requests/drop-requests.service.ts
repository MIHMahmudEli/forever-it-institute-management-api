import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { DropRequest, DropRequestStatus } from './entities/drop-request.entity.js';
import { Enrollment, EnrollmentStatus } from '../enrollments/entities/enrollment.entity.js';
import { Payment, PaymentStatus } from '../payments/entities/payment.entity.js';
import { Student } from '../students/entities/student.entity.js';
import { QueryDropRequestDto, ReviewDropRequestDto } from './dto/drop-request.dto.js';

@Injectable()
export class DropRequestsService {
  private readonly logger = new Logger(DropRequestsService.name);

  constructor(
    @InjectRepository(DropRequest)
    private readonly dropRequestRepository: Repository<DropRequest>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(query: QueryDropRequestDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const qb = this.dropRequestRepository
      .createQueryBuilder('dr')
      .leftJoinAndSelect('dr.student', 'student')
      .leftJoinAndSelect('dr.enrollment', 'enrollment')
      .leftJoinAndSelect('enrollment.course', 'course');

    if (query.status) {
      qb.andWhere('dr.status = :status', { status: query.status });
    }

    if (query.search && query.search.trim()) {
      const term = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(student.fullName) LIKE :term OR LOWER(student.registrationNumber) LIKE :term OR LOWER(student.mobileNumber) LIKE :term OR LOWER(course.name) LIKE :term)',
        { term },
      );
    }

    qb.orderBy('dr.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const dropRequest = await this.dropRequestRepository.findOne({
      where: { id },
      relations: {
        student: true,
        enrollment: { course: true },
      },
    });

    if (!dropRequest) {
      throw new NotFoundException(`Drop request with ID ${id} not found.`);
    }

    return dropRequest;
  }

  async approve(id: string, reviewerId: string, reviewerName: string, dto?: ReviewDropRequestDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const dropRequest = await queryRunner.manager.findOne(DropRequest, {
        where: { id },
        relations: { enrollment: true },
      });

      if (!dropRequest) {
        throw new NotFoundException(`Drop request with ID ${id} not found.`);
      }

      if (dropRequest.status !== DropRequestStatus.PENDING) {
        throw new BadRequestException(`Cannot approve request in ${dropRequest.status} state.`);
      }

      dropRequest.status = DropRequestStatus.APPROVED;
      dropRequest.reviewedBy = reviewerId;
      dropRequest.reviewerName = reviewerName;
      dropRequest.reviewedAt = new Date();
      if (dto?.adminNotes) {
        dropRequest.adminNotes = dto.adminNotes.trim();
      }

      await queryRunner.manager.save(DropRequest, dropRequest);

      // Update enrollment status to DROPPED and automatically clear any remaining course due to 0
      const enrollment = dropRequest.enrollment;
      enrollment.status = EnrollmentStatus.DROPPED;

      // Find payments already collected for this enrollment
      const payments = await queryRunner.manager.find(Payment, {
        where: { enrollmentId: enrollment.id, status: PaymentStatus.COMPLETED },
      });
      let totalPaidForEnrollment = payments.reduce((sum, p) => sum + Number(p.amount), 0);

      // If no payments were directly tagged with enrollmentId, check if student has only this enrollment
      if (totalPaidForEnrollment === 0) {
        const studentEnrollments = await queryRunner.manager.find(Enrollment, {
          where: { studentId: enrollment.studentId },
        });
        if (studentEnrollments.length === 1) {
          const allStudentPayments = await queryRunner.manager.find(Payment, {
            where: { studentId: enrollment.studentId, status: PaymentStatus.COMPLETED },
          });
          totalPaidForEnrollment = allStudentPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        }
      }

      // Automatically reduce finalFee to amount already collected so remaining due is 0
      enrollment.finalFee = Math.min(Number(enrollment.finalFee), totalPaidForEnrollment);
      enrollment.discount = Math.max(0, Number(enrollment.agreedFee) - enrollment.finalFee);
      enrollment.notes = enrollment.notes
        ? `${enrollment.notes} | Course drop approved; remaining due waived to 0`
        : 'Course drop approved; remaining due waived to 0';

      await queryRunner.manager.save(Enrollment, enrollment);

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Course drop request approved successfully.',
        dropRequest,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async reject(id: string, reviewerId: string, reviewerName: string, dto?: ReviewDropRequestDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const dropRequest = await queryRunner.manager.findOne(DropRequest, {
        where: { id },
        relations: { enrollment: true },
      });

      if (!dropRequest) {
        throw new NotFoundException(`Drop request with ID ${id} not found.`);
      }

      if (dropRequest.status !== DropRequestStatus.PENDING) {
        throw new BadRequestException(`Cannot reject request in ${dropRequest.status} state.`);
      }

      dropRequest.status = DropRequestStatus.REJECTED;
      dropRequest.reviewedBy = reviewerId;
      dropRequest.reviewerName = reviewerName;
      dropRequest.reviewedAt = new Date();
      if (dto?.adminNotes) {
        dropRequest.adminNotes = dto.adminNotes.trim();
      }

      await queryRunner.manager.save(DropRequest, dropRequest);

      // Revert enrollment status back to ACTIVE
      const enrollment = dropRequest.enrollment;
      enrollment.status = EnrollmentStatus.ACTIVE;
      await queryRunner.manager.save(Enrollment, enrollment);

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Course drop request rejected. Enrollment returned to ACTIVE status.',
        dropRequest,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
