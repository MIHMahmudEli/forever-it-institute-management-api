import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Student, StudentStatus } from '../students/entities/student.entity.js';
import { Course } from '../courses/entities/course.entity.js';
import { Enrollment, EnrollmentStatus } from '../enrollments/entities/enrollment.entity.js';
import { Payment, PaymentMethod, PaymentStatus } from '../payments/entities/payment.entity.js';
import { AuditLog } from '../audit-logs/entities/audit-log.entity.js';
import { User, UserRole } from '../users/entities/user.entity.js';
import { CreateRegistrationDto } from './dto/create-registration.dto.js';
import { numberToWordsBDT } from '../common/utils/amount-in-words.util.js';
import { generateTemporaryPassword } from '../common/utils/password-generator.util.js';
import bcrypt from 'bcrypt';

@Injectable()
export class RegistrationsService {
  constructor(private readonly dataSource: DataSource) {}

  private async generateRegistrationNumber(queryRunner: any): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `FIT-${yearMonth}-`;

    const lastStudent = await queryRunner.manager
      .createQueryBuilder(Student, 'student')
      .where('student.registrationNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('student.registrationNumber', 'DESC')
      .getOne();

    let nextNumber = 1;
    if (lastStudent) {
      const parts = lastStudent.registrationNumber.split('-');
      const lastSeq = parseInt(parts[2], 10);
      if (!isNaN(lastSeq)) {
        nextNumber = lastSeq + 1;
      }
    }

    return `${prefix}${String(nextNumber).padStart(4, '0')}`;
  }

  private async generateReceiptNumber(queryRunner: any): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `RCP-${yearMonth}-`;

    const lastPayment = await queryRunner.manager
      .createQueryBuilder(Payment, 'payment')
      .where('payment.receiptNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('payment.receiptNumber', 'DESC')
      .getOne();

    let nextNumber = 1;
    if (lastPayment) {
      const parts = lastPayment.receiptNumber.split('-');
      const lastSeq = parseInt(parts[2], 10);
      if (!isNaN(lastSeq)) {
        nextNumber = lastSeq + 1;
      }
    }

    return `${prefix}${String(nextNumber).padStart(4, '0')}`;
  }

  /**
   * Transactional Student Registration Workflow
   */
  async register(dto: CreateRegistrationDto, performedBy: { id?: string; name?: string; email?: string }) {
    if (!dto.courses || dto.courses.length === 0) {
      throw new BadRequestException('At least one course must be selected for registration.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Check duplicate mobile or NID
      const existing = await queryRunner.manager.findOne(Student, {
        where: [
          { mobileNumber: dto.mobileNumber.trim(), isArchived: false },
          { nidOrBirthCertificateNumber: dto.nidOrBirthCertificateNumber.trim(), isArchived: false },
        ],
      });

      if (existing) {
        throw new ConflictException(
          `A student with this Mobile (${dto.mobileNumber}) or NID/Birth Certificate (${dto.nidOrBirthCertificateNumber}) already exists. Existing Reg: ${existing.registrationNumber}`
        );
      }

      // 2. Validate all selected courses
      const courseIds = dto.courses.map((c) => c.courseId);
      const courses = await queryRunner.manager
        .createQueryBuilder(Course, 'course')
        .where('course.id IN (:...courseIds)', { courseIds })
        .getMany();

      if (courses.length !== courseIds.length) {
        throw new NotFoundException('One or more selected courses could not be found.');
      }

      const courseMap = new Map(courses.map((c) => [c.id, c]));

      // 3. Generate Registration Number & Create Student User Account
      const regNumber = await this.generateRegistrationNumber(queryRunner);
      const studentUsername = regNumber;
      const studentEmail = dto.email
        ? dto.email.trim().toLowerCase()
        : `${regNumber.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.foreveritbd.com`;

      // Check if user with this email or username already exists
      const existingUser = await queryRunner.manager.findOne(User, {
        where: [{ email: studentEmail }, { username: studentUsername }],
      });
      if (existingUser) {
        throw new ConflictException(
          `A portal account with email "${studentEmail}" or username "${studentUsername}" already exists.`
        );
      }

      // Generate secure temporary password
      const tempPassword = generateTemporaryPassword(10);
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      const studentUser = queryRunner.manager.create(User, {
        email: studentEmail,
        username: studentUsername,
        fullName: dto.fullName.trim(),
        passwordHash,
        role: UserRole.STUDENT,
        isActive: true,
        mustChangePassword: true,
      });
      const savedUser = await queryRunner.manager.save(User, studentUser);

      const student = queryRunner.manager.create(Student, {
        registrationNumber: regNumber,
        fullName: dto.fullName.trim(),
        nidOrBirthCertificateNumber: dto.nidOrBirthCertificateNumber.trim(),
        presentAddress: dto.presentAddress.trim(),
        mobileNumber: dto.mobileNumber.trim(),
        parentName: dto.parentName.trim(),
        parentMobileNumber: dto.parentMobileNumber.trim(),
        status: StudentStatus.ACTIVE,
        userId: savedUser.id,
        createdBy: performedBy.id || performedBy.email || 'SYSTEM',
      });

      const savedStudent = await queryRunner.manager.save(Student, student);

      // 4. Create Enrollments with fee snapshots
      const savedEnrollments: Enrollment[] = [];
      let totalPayable = 0;

      for (const item of dto.courses) {
        const course = courseMap.get(item.courseId)!;
        const agreedFee = item.agreedFee !== undefined ? Number(item.agreedFee) : Number(course.totalFee);
        const discount = Number(item.discount || 0);

        if (discount > agreedFee) {
          throw new BadRequestException(`Discount for course "${course.name}" cannot exceed agreed fee.`);
        }

        const finalFee = agreedFee - discount;
        totalPayable += finalFee;

        const enrollment = queryRunner.manager.create(Enrollment, {
          studentId: savedStudent.id,
          courseId: course.id,
          enrollmentDate: dto.registrationDate || new Date().toISOString().split('T')[0],
          agreedFee,
          discount,
          finalFee,
          status: EnrollmentStatus.ACTIVE,
          notes: dto.notes || null,
        });

        const savedEnrollment = await queryRunner.manager.save(Enrollment, enrollment);
        savedEnrollment.course = course;
        savedEnrollments.push(savedEnrollment);
      }

      // 5. Record Initial / Advance Payment if supplied
      const advanceAmount = Number(dto.advancePayment || 0);
      let savedPayment: Payment | null = null;

      if (advanceAmount > 0) {
        if (advanceAmount > totalPayable) {
          throw new BadRequestException(
            `Advance payment (${advanceAmount} BDT) cannot exceed total course payable (${totalPayable} BDT).`
          );
        }

        const receiptNumber = await this.generateReceiptNumber(queryRunner);
        const payment = queryRunner.manager.create(Payment, {
          receiptNumber,
          studentId: savedStudent.id,
          enrollmentId: savedEnrollments[0]?.id || null,
          amount: advanceAmount,
          paymentDate: dto.registrationDate || new Date().toISOString().split('T')[0],
          paymentMethod: dto.paymentMethod || PaymentMethod.CASH,
          transactionReference: dto.transactionReference || null,
          status: PaymentStatus.COMPLETED,
          notes: 'Advance registration payment',
          receivedBy: performedBy.name || performedBy.email || 'Registration Officer',
        });

        savedPayment = await queryRunner.manager.save(Payment, payment);
      }

      // 6. Record Audit Log
      const auditLog = queryRunner.manager.create(AuditLog, {
        action: 'CREATE_REGISTRATION',
        entityType: 'Student',
        entityId: savedStudent.id,
        performedBy: performedBy.email || 'SYSTEM',
        details: {
          registrationNumber: regNumber,
          userId: savedUser.id,
          username: studentUsername,
          coursesCount: savedEnrollments.length,
          totalPayable,
          advancePaid: advanceAmount,
          receiptNumber: savedPayment?.receiptNumber,
        },
      });
      await queryRunner.manager.save(AuditLog, auditLog);

      // Commit transaction
      await queryRunner.commitTransaction();

      const outstandingDue = Math.max(0, totalPayable - advanceAmount);

      return {
        success: true,
        message: 'Student registered successfully and portal account created.',
        registrationNumber: savedStudent.registrationNumber,
        student: savedStudent,
        studentCredentials: {
          username: studentUsername,
          email: studentEmail,
          temporaryPassword: tempPassword,
          mustChangePassword: true,
        },
        enrollments: savedEnrollments,
        payment: savedPayment
          ? {
              ...savedPayment,
              amount: Number(savedPayment.amount),
              amountInWords: numberToWordsBDT(Number(savedPayment.amount)),
            }
          : null,
        financials: {
          totalPayable,
          advancePaid: advanceAmount,
          outstandingDue,
          advancePaidInWords: numberToWordsBDT(advanceAmount),
          dueInWords: numberToWordsBDT(outstandingDue),
        },
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      if (err instanceof BadRequestException || err instanceof ConflictException || err instanceof NotFoundException) {
        throw err;
      }
      throw new InternalServerErrorException(
        'Registration transaction failed: ' + (err instanceof Error ? err.message : String(err))
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Retrieves the comprehensive registration document for printing
   */
  async getRegistrationDocument(idOrRegNo: string, user?: { id: string; role: UserRole }) {
    const student = await this.dataSource.getRepository(Student).findOne({
      where: [{ id: idOrRegNo }, { registrationNumber: idOrRegNo }],
      relations: { enrollments: { course: true }, payments: true },
    });

    if (!student) {
      throw new NotFoundException(`Registration record for "${idOrRegNo}" not found.`);
    }

    if (user && user.role === UserRole.STUDENT) {
      if (student.userId !== user.id) {
        throw new ForbiddenException('You are not authorized to view registration documents for another student.');
      }
    }

    const totalPayable = (student.enrollments || []).reduce((sum, e) => {
      if (e.status === 'CANCELLED') return sum;
      if (e.status === 'DROPPED') {
        const paidForE = (student.payments || [])
          .filter((p) => p.enrollmentId === e.id && p.status === 'COMPLETED')
          .reduce((s, p) => s + Number(p.amount), 0);
        return sum + Math.min(Number(e.finalFee), paidForE);
      }
      return sum + Number(e.finalFee);
    }, 0);

    const totalPaid = (student.payments || []).reduce(
      (sum, p) => sum + (p.status === 'COMPLETED' ? Number(p.amount) : 0),
      0
    );

    const outstandingDue = Math.max(0, totalPayable - totalPaid);

    // Latest or initial payment
    const advancePayment = student.payments?.[0] ? Number(student.payments[0].amount) : totalPaid;

    return {
      institute: {
        name: 'FOREVER IT INSTITUTE',
        tagline: 'দক্ষতা গড়ুন, গড়ুন সফল ভবিষ্যৎ',
        description: 'Professional IT & Business Development Training',
        website: 'www.foreveritbd.com',
        currency: 'BDT',
      },
      student: {
        id: student.id,
        registrationNumber: student.registrationNumber,
        fullName: student.fullName,
        nidOrBirthCertificateNumber: student.nidOrBirthCertificateNumber,
        presentAddress: student.presentAddress,
        mobileNumber: student.mobileNumber,
        parentName: student.parentName,
        parentMobileNumber: student.parentMobileNumber,
        status: student.status,
        createdAt: student.createdAt,
      },
      courses: (student.enrollments || []).map((e) => ({
        id: e.course.id,
        code: e.course.code,
        name: e.course.name,
        category: e.course.category,
        duration: e.course.duration,
        agreedFee: Number(e.agreedFee),
        discount: Number(e.discount),
        finalFee: Number(e.finalFee),
        status: e.status,
      })),
      financials: {
        totalPayable,
        advancePayment,
        amountInWords: numberToWordsBDT(advancePayment),
        dueAmount: outstandingDue,
        totalPaid,
      },
      registrationDate: student.enrollments?.[0]?.enrollmentDate || student.createdAt.toISOString().split('T')[0],
      payments: (student.payments || []).map((p) => ({
        id: p.id,
        receiptNumber: p.receiptNumber,
        amount: Number(p.amount),
        amountInWords: numberToWordsBDT(Number(p.amount)),
        paymentDate: p.paymentDate,
        paymentMethod: p.paymentMethod,
        transactionReference: p.transactionReference,
      })),
    };
  }
}
