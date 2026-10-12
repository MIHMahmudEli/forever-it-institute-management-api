import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import bcrypt from 'bcrypt';
import { Student } from '../students/entities/student.entity.js';
import { Enrollment, EnrollmentStatus } from '../enrollments/entities/enrollment.entity.js';
import { Payment } from '../payments/entities/payment.entity.js';
import { DropRequest, DropRequestStatus } from '../drop-requests/entities/drop-request.entity.js';
import { User } from '../users/entities/user.entity.js';
import { CreateStudentDropRequestDto, UpdateStudentProfileDto } from './dto/student-portal.dto.js';
import { ChangePasswordDto } from '../users/dto/change-password.dto.js';

@Injectable()
export class StudentPortalService {
  private readonly logger = new Logger(StudentPortalService.name);

  constructor(
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(DropRequest)
    private readonly dropRequestRepository: Repository<DropRequest>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  private async getStudentByUserId(userId: string): Promise<Student> {
    const student = await this.studentRepository.findOne({
      where: { userId, isArchived: false },
      relations: { user: true },
    });

    if (!student) {
      throw new NotFoundException('Student profile not found for the logged-in user.');
    }

    return student;
  }

  async getMe(userId: string) {
    const student = await this.getStudentByUserId(userId);
    return {
      id: student.id,
      registrationNumber: student.registrationNumber,
      fullName: student.fullName,
      nidOrBirthCertificateNumber: student.nidOrBirthCertificateNumber,
      presentAddress: student.presentAddress,
      mobileNumber: student.mobileNumber,
      parentName: student.parentName,
      parentMobileNumber: student.parentMobileNumber,
      status: student.status,
      user: {
        id: student.user?.id,
        email: student.user?.email,
        username: student.user?.username,
        mustChangePassword: student.user?.mustChangePassword,
      },
      createdAt: student.createdAt,
    };
  }

  async updateProfile(userId: string, dto: UpdateStudentProfileDto) {
    const student = await this.getStudentByUserId(userId);

    if (dto.presentAddress !== undefined) {
      student.presentAddress = dto.presentAddress.trim();
    }
    if (dto.parentName !== undefined) {
      student.parentName = dto.parentName.trim();
    }
    if (dto.parentMobileNumber !== undefined) {
      student.parentMobileNumber = dto.parentMobileNumber.trim();
    }

    const updated = await this.studentRepository.save(student);
    return {
      success: true,
      message: 'Profile contact details updated successfully.',
      student: {
        id: updated.id,
        fullName: updated.fullName,
        presentAddress: updated.presentAddress,
        parentName: updated.parentName,
        parentMobileNumber: updated.parentMobileNumber,
      },
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('New password and confirmation password do not match.');
    }

    const user = await this.userRepository.findOne({ where: { id: userId, isActive: true } });
    if (!user) {
      throw new NotFoundException('User account not found.');
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Current password is incorrect.');
    }

    const isSameAsCurrent = await bcrypt.compare(dto.newPassword, user.passwordHash);
    if (isSameAsCurrent) {
      throw new BadRequestException('New password must be different from current password.');
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    user.mustChangePassword = false;
    await this.userRepository.save(user);

    return {
      success: true,
      message: 'Password changed successfully. Your portal account is fully active.',
    };
  }

  async getDashboard(userId: string) {
    const student = await this.studentRepository.findOne({
      where: { userId, isArchived: false },
      relations: {
        enrollments: { course: true },
        payments: true,
      },
    });

    if (!student) {
      throw new NotFoundException('Student profile not found for the logged-in user.');
    }

    const enrollments = student.enrollments || [];
    const payments = student.payments || [];

    const activeEnrollments = enrollments.filter(
      (e) => e.status === EnrollmentStatus.ACTIVE || e.status === EnrollmentStatus.DROP_REQUESTED,
    );
    const completedEnrollments = enrollments.filter((e) => e.status === EnrollmentStatus.COMPLETED);
    const droppedEnrollments = enrollments.filter((e) => e.status === EnrollmentStatus.DROPPED);

    const totalPayable = enrollments.reduce((sum, e) => {
      if (e.status === EnrollmentStatus.CANCELLED) return sum;
      if (e.status === EnrollmentStatus.DROPPED) {
        const paidForE = payments
          .filter((p) => p.enrollmentId === e.id && p.status === 'COMPLETED')
          .reduce((s, p) => s + Number(p.amount), 0);
        return sum + Math.min(Number(e.finalFee), paidForE);
      }
      return sum + Number(e.finalFee);
    }, 0);
    const totalPaid = payments.reduce(
      (sum, p) => sum + (p.status === 'COMPLETED' ? Number(p.amount) : 0),
      0,
    );
    const outstandingDue = Math.max(0, totalPayable - totalPaid);

    // Fetch drop requests
    const dropRequests = await this.dropRequestRepository.find({
      where: { studentId: student.id },
      relations: { enrollment: { course: true } },
      order: { createdAt: 'DESC' },
      take: 5,
    });

    const pendingDropRequestsCount = dropRequests.filter(
      (dr) => dr.status === DropRequestStatus.PENDING,
    ).length;

    // Recent payments sorted DESC
    const recentPayments = [...payments]
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
      .slice(0, 5);

    return {
      student: {
        id: student.id,
        fullName: student.fullName,
        registrationNumber: student.registrationNumber,
      },
      stats: {
        totalEnrolledCourses: enrollments.length,
        activeCoursesCount: activeEnrollments.length,
        completedCoursesCount: completedEnrollments.length,
        droppedCoursesCount: droppedEnrollments.length,
        pendingDropRequestsCount,
      },
      financials: {
        totalPayable,
        totalPaid,
        outstandingDue,
      },
      recentPayments,
      activeEnrollments,
      recentDropRequests: dropRequests,
    };
  }

  async getCourses(userId: string) {
    const student = await this.getStudentByUserId(userId);

    const enrollments = await this.enrollmentRepository.find({
      where: { studentId: student.id },
      relations: { course: true, payments: true },
      order: { createdAt: 'DESC' },
    });

    // Check which enrollments have pending drop requests
    const pendingDropRequests = await this.dropRequestRepository.find({
      where: { studentId: student.id, status: DropRequestStatus.PENDING },
    });
    const pendingEnrollmentIds = new Set(pendingDropRequests.map((dr) => dr.enrollmentId));

    return enrollments.map((e) => {
      const paidForCourse = (e.payments || []).reduce(
        (sum, p) => sum + (p.status === 'COMPLETED' ? Number(p.amount) : 0),
        0,
      );
      const isDropped = e.status === EnrollmentStatus.DROPPED || e.status === EnrollmentStatus.CANCELLED;
      const dueForCourse = isDropped ? 0 : Math.max(0, Number(e.finalFee) - paidForCourse);

      return {
        ...e,
        paidAmount: paidForCourse,
        dueAmount: dueForCourse,
        hasPendingDropRequest: pendingEnrollmentIds.has(e.id),
      };
    });
  }

  async getCourse(userId: string, enrollmentId: string) {
    const student = await this.getStudentByUserId(userId);

    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: enrollmentId, studentId: student.id },
      relations: { course: true, payments: true },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrolled course not found.`);
    }

    const dropRequests = await this.dropRequestRepository.find({
      where: { enrollmentId, studentId: student.id },
      order: { createdAt: 'DESC' },
    });

    const paidForCourse = (enrollment.payments || []).reduce(
      (sum, p) => sum + (p.status === 'COMPLETED' ? Number(p.amount) : 0),
      0,
    );
    const isDropped = enrollment.status === EnrollmentStatus.DROPPED || enrollment.status === EnrollmentStatus.CANCELLED;
    const dueForCourse = isDropped ? 0 : Math.max(0, Number(enrollment.finalFee) - paidForCourse);

    return {
      ...enrollment,
      paidAmount: paidForCourse,
      dueAmount: dueForCourse,
      dropRequests,
    };
  }

  async getPayments(userId: string) {
    const student = await this.getStudentByUserId(userId);

    const payments = await this.paymentRepository.find({
      where: { studentId: student.id },
      relations: { enrollment: { course: true }, student: true },
      order: { paymentDate: 'DESC' },
    });

    return payments;
  }

  async getPayment(userId: string, paymentId: string) {
    const student = await this.getStudentByUserId(userId);

    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId, studentId: student.id },
      relations: {
        enrollment: { course: true },
        student: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment receipt not found.');
    }

    return payment;
  }

  async getDropRequests(userId: string) {
    const student = await this.getStudentByUserId(userId);

    const requests = await this.dropRequestRepository.find({
      where: { studentId: student.id },
      relations: { enrollment: { course: true } },
      order: { createdAt: 'DESC' },
    });

    return requests;
  }

  async createDropRequest(userId: string, dto: CreateStudentDropRequestDto) {
    const student = await this.getStudentByUserId(userId);

    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: dto.enrollmentId, studentId: student.id },
      relations: { course: true },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found for your account.');
    }

    if (enrollment.status === EnrollmentStatus.DROPPED) {
      throw new BadRequestException('This course is already marked as DROPPED.');
    }

    if (enrollment.status === EnrollmentStatus.COMPLETED) {
      throw new BadRequestException('Cannot drop a completed course.');
    }

    if (enrollment.status === EnrollmentStatus.CANCELLED) {
      throw new BadRequestException('Cannot drop a cancelled enrollment.');
    }

    const existingPending = await this.dropRequestRepository.findOne({
      where: {
        enrollmentId: enrollment.id,
        studentId: student.id,
        status: DropRequestStatus.PENDING,
      },
    });

    if (existingPending) {
      throw new ConflictException('A drop request for this course is already pending administrative review.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      enrollment.status = EnrollmentStatus.DROP_REQUESTED;
      await queryRunner.manager.save(Enrollment, enrollment);

      const dropRequest = queryRunner.manager.create(DropRequest, {
        studentId: student.id,
        enrollmentId: enrollment.id,
        reason: dto.reason.trim(),
        status: DropRequestStatus.PENDING,
        requestDate: new Date(),
      });

      const savedRequest = await queryRunner.manager.save(DropRequest, dropRequest);

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Drop request submitted successfully. Institute administration will review your request.',
        dropRequest: {
          ...savedRequest,
          enrollment: {
            id: enrollment.id,
            course: enrollment.course,
          },
        },
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async cancelDropRequest(userId: string, dropRequestId: string) {
    const student = await this.getStudentByUserId(userId);

    const dropRequest = await this.dropRequestRepository.findOne({
      where: { id: dropRequestId, studentId: student.id },
      relations: { enrollment: true },
    });

    if (!dropRequest) {
      throw new NotFoundException('Drop request not found.');
    }

    if (dropRequest.status !== DropRequestStatus.PENDING) {
      throw new BadRequestException(`Cannot cancel a request that is already ${dropRequest.status}.`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      dropRequest.status = DropRequestStatus.CANCELLED;
      await queryRunner.manager.save(DropRequest, dropRequest);

      if (dropRequest.enrollment) {
        dropRequest.enrollment.status = EnrollmentStatus.ACTIVE;
        await queryRunner.manager.save(Enrollment, dropRequest.enrollment);
      }

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Drop request cancelled. Your course enrollment remains active.',
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
