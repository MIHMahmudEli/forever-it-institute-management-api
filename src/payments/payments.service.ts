import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from './entities/payment.entity.js';
import { Student } from '../students/entities/student.entity.js';
import { Enrollment, EnrollmentStatus } from '../enrollments/entities/enrollment.entity.js';
import { CreatePaymentDto, ReversePaymentDto, QueryPaymentDto } from './dto/create-payment.dto.js';
import { numberToWordsBDT } from '../common/utils/amount-in-words.util.js';
import { UserRole } from '../users/entities/user.entity.js';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
  ) {}

  /**
   * Generates a unique sequential receipt number: RCP-YYYYMM-XXXX
   */
  async generateReceiptNumber(): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `RCP-${yearMonth}-`;

    const lastPayment = await this.paymentRepository
      .createQueryBuilder('payment')
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

  async create(createPaymentDto: CreatePaymentDto, receivedBy?: string) {
    const student = await this.studentRepository.findOne({
      where: { id: createPaymentDto.studentId, isArchived: false },
      relations: { enrollments: { course: true }, payments: true },
    });
    if (!student) {
      throw new NotFoundException(`Student with ID ${createPaymentDto.studentId} not found.`);
    }

    const amount = Number(createPaymentDto.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero.');
    }

    // 1. Calculate overall student totals
    const totalPayable = (student.enrollments || []).reduce((sum, e) => {
      if (e.status === EnrollmentStatus.CANCELLED) return sum;
      if (e.status === EnrollmentStatus.DROPPED) {
        const paidForE = (student.payments || [])
          .filter((p) => p.enrollmentId === e.id && p.status === PaymentStatus.COMPLETED)
          .reduce((s, p) => s + Number(p.amount), 0);
        return sum + Math.min(Number(e.finalFee), paidForE);
      }
      return sum + Number(e.finalFee);
    }, 0);

    const totalPaid = (student.payments || [])
      .reduce((sum, p) => sum + (p.status === PaymentStatus.COMPLETED ? Number(p.amount) : 0), 0);

    const outstandingDue = Math.max(0, totalPayable - totalPaid);

    if (totalPayable > 0 && totalPaid >= totalPayable) {
      throw new BadRequestException(
        `Total Payable Fee (৳${totalPayable.toLocaleString()}) and Total Paid to Date (৳${totalPaid.toLocaleString()}) are equal. There is no outstanding due remaining for this student.`
      );
    }

    if (totalPayable === 0 && (student.enrollments || []).length === 0) {
      throw new BadRequestException('Student has no enrolled courses with payable fees.');
    }

    if (amount > outstandingDue) {
      throw new BadRequestException(
        `Payment amount of ৳${amount.toLocaleString()} exceeds the remaining outstanding due (৳${outstandingDue.toLocaleString()}). Total Paid to Date cannot exceed Total Payable Fee.`
      );
    }

    let enrollment: Enrollment | null = null;
    if (createPaymentDto.enrollmentId) {
      const selectedEnrollment = await this.enrollmentRepository.findOne({
        where: { id: createPaymentDto.enrollmentId, studentId: student.id },
        relations: { course: true },
      });
      if (!selectedEnrollment) {
        throw new NotFoundException(`Enrollment with ID ${createPaymentDto.enrollmentId} not found for this student.`);
      }

      if (selectedEnrollment.status === EnrollmentStatus.CANCELLED) {
        throw new BadRequestException('Cannot record payment for a CANCELLED course enrollment.');
      }
      if (selectedEnrollment.status === EnrollmentStatus.DROPPED) {
        throw new BadRequestException('Cannot record payment for a DROPPED course. Dropped courses have no remaining due.');
      }

      const courseFee = Number(selectedEnrollment.finalFee);
      const enrollmentId = selectedEnrollment.id;
      const coursePaid = (student.payments || [])
        .filter((p) => p.enrollmentId === enrollmentId && p.status === PaymentStatus.COMPLETED)
        .reduce((sum, p) => sum + Number(p.amount), 0);
      const courseDue = Math.max(0, courseFee - coursePaid);

      if (coursePaid >= courseFee) {
        throw new BadRequestException(
          `The selected course "${selectedEnrollment.course?.name || 'Course'}" is already fully paid (৳${coursePaid.toLocaleString()} of ৳${courseFee.toLocaleString()}).`
        );
      }

      if (amount > courseDue) {
        throw new BadRequestException(
          `Payment amount of ৳${amount.toLocaleString()} exceeds remaining course due (৳${courseDue.toLocaleString()}) for "${selectedEnrollment.course?.name || 'Course'}". Total Paid to Date cannot exceed Total Payable Fee.`
        );
      }

      enrollment = selectedEnrollment;
    }

    const receiptNumber = await this.generateReceiptNumber();

    const payment = this.paymentRepository.create({
      receiptNumber,
      studentId: student.id,
      enrollmentId: enrollment ? enrollment.id : null,
      amount,
      paymentDate: createPaymentDto.paymentDate || new Date().toISOString().split('T')[0],
      paymentMethod: createPaymentDto.paymentMethod,
      transactionReference: createPaymentDto.transactionReference || null,
      status: PaymentStatus.COMPLETED,
      notes: createPaymentDto.notes || null,
      receivedBy: receivedBy || null,
    });

    const savedPayment = await this.paymentRepository.save(payment);

    return {
      ...savedPayment,
      amountInWords: numberToWordsBDT(amount),
    };
  }

  async findAll(queryDto: QueryPaymentDto) {
    const page = Math.max(1, Number(queryDto.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(queryDto.limit) || 20));
    const skip = (page - 1) * limit;

    const qb = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.student', 'student')
      .leftJoinAndSelect('payment.enrollment', 'enrollment')
      .leftJoinAndSelect('enrollment.course', 'course');

    if (queryDto.studentId) {
      qb.andWhere('payment.studentId = :studentId', { studentId: queryDto.studentId });
    }
    if (queryDto.enrollmentId) {
      qb.andWhere('payment.enrollmentId = :enrollmentId', { enrollmentId: queryDto.enrollmentId });
    }
    if (queryDto.status) {
      qb.andWhere('payment.status = :status', { status: queryDto.status });
    }
    if (queryDto.paymentMethod) {
      qb.andWhere('payment.paymentMethod = :paymentMethod', { paymentMethod: queryDto.paymentMethod });
    }
    if (queryDto.startDate) {
      qb.andWhere('payment.paymentDate >= :startDate', { startDate: queryDto.startDate });
    }
    if (queryDto.endDate) {
      qb.andWhere('payment.paymentDate <= :endDate', { endDate: queryDto.endDate });
    }

    qb.orderBy('payment.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    const data = items.map((p) => ({
      ...p,
      amount: Number(p.amount),
      amountInWords: numberToWordsBDT(Number(p.amount)),
    }));

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
    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: { student: true, enrollment: { course: true } },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found.`);
    }

    return {
      ...payment,
      amount: Number(payment.amount),
      amountInWords: numberToWordsBDT(Number(payment.amount)),
    };
  }

  async getReceipt(id: string, user?: { id: string; role: UserRole }) {
    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: { student: true, enrollment: { course: true } },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found.`);
    }

    if (user && user.role === UserRole.STUDENT) {
      const student = await this.studentRepository.findOne({
        where: { userId: user.id },
      });
      if (!student || student.id !== payment.studentId) {
        throw new ForbiddenException('You are not authorized to view receipts belonging to another student.');
      }
    }

    // Compute student's overall financial balance
    const student = await this.studentRepository.findOne({
      where: { id: payment.studentId },
      relations: { enrollments: true, payments: true },
    });

    const totalPayable = (student?.enrollments || []).reduce((sum, e) => {
      if (e.status === 'CANCELLED') return sum;
      if (e.status === 'DROPPED') {
        const paidForE = (student?.payments || [])
          .filter((p) => p.enrollmentId === e.id && p.status === 'COMPLETED')
          .reduce((s, p) => s + Number(p.amount), 0);
        return sum + Math.min(Number(e.finalFee), paidForE);
      }
      return sum + Number(e.finalFee);
    }, 0);
    const totalPaid = (student?.payments || []).reduce(
      (sum, p) => sum + (p.status === 'COMPLETED' ? Number(p.amount) : 0),
      0
    );
    const outstandingDue = Math.max(0, totalPayable - totalPaid);

    return {
      receiptNumber: payment.receiptNumber,
      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      transactionReference: payment.transactionReference,
      amount: Number(payment.amount),
      amountInWords: numberToWordsBDT(Number(payment.amount)),
      status: payment.status,
      notes: payment.notes,
      receivedBy: payment.receivedBy || 'Authorized Officer',
      student: {
        id: payment.student.id,
        registrationNumber: payment.student.registrationNumber,
        fullName: payment.student.fullName,
        mobileNumber: payment.student.mobileNumber,
        presentAddress: payment.student.presentAddress,
      },
      course: payment.enrollment?.course
        ? {
            name: payment.enrollment.course.name,
            code: payment.enrollment.course.code,
            duration: payment.enrollment.course.duration,
          }
        : null,
      financialSummary: {
        totalPayable,
        totalPaid,
        outstandingDue,
      },
      institute: {
        name: 'FOREVER IT INSTITUTE',
        tagline: 'দক্ষতা গড়ুন, গড়ুন সফল ভবিষ্যৎ',
        description: 'Professional IT & Business Development Training',
        website: 'www.foreveritbd.com',
        currency: 'BDT',
      },
    };
  }

  async reverse(id: string, reversePaymentDto: ReversePaymentDto, reversedBy: string) {
    const payment = await this.paymentRepository.findOne({ where: { id } });
    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found.`);
    }

    if (payment.status === PaymentStatus.REVERSED) {
      throw new BadRequestException('This payment has already been reversed.');
    }

    payment.status = PaymentStatus.REVERSED;
    payment.reversalReason = reversePaymentDto.reversalReason.trim();
    payment.reversedBy = reversedBy;
    payment.reversedAt = new Date();

    return this.paymentRepository.save(payment);
  }
}
