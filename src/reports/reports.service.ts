import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Enrollment, EnrollmentStatus } from '../enrollments/entities/enrollment.entity.js';
import { Payment, PaymentMethod, PaymentStatus } from '../payments/entities/payment.entity.js';
import { Student } from '../students/entities/student.entity.js';

@Injectable()
export class ReportsService {
  constructor(private readonly dataSource: DataSource) {}

  async getEnrollmentReport(startDate?: string, endDate?: string, courseId?: string, status?: EnrollmentStatus) {
    const qb = this.dataSource
      .getRepository(Enrollment)
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.student', 'student')
      .leftJoinAndSelect('enrollment.course', 'course')
      .leftJoinAndSelect('enrollment.payments', 'payment');

    if (startDate) {
      qb.andWhere('enrollment.enrollmentDate >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('enrollment.enrollmentDate <= :endDate', { endDate });
    }
    if (courseId) {
      qb.andWhere('enrollment.courseId = :courseId', { courseId });
    }
    if (status) {
      qb.andWhere('enrollment.status = :status', { status });
    }

    qb.orderBy('enrollment.enrollmentDate', 'DESC');
    const items = await qb.getMany();

    const summary = {
      totalEnrollments: items.length,
      totalAgreedAmount: items.reduce((sum, e) => sum + Number(e.agreedFee), 0),
      totalDiscountAmount: items.reduce((sum, e) => sum + Number(e.discount), 0),
      totalFinalPayable: items.reduce((sum, e) => sum + Number(e.finalFee), 0),
    };

    return { summary, items };
  }

  async getPaymentReport(startDate?: string, endDate?: string, method?: PaymentMethod, status?: PaymentStatus) {
    const qb = this.dataSource
      .getRepository(Payment)
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.student', 'student')
      .leftJoinAndSelect('payment.enrollment', 'enrollment')
      .leftJoinAndSelect('enrollment.course', 'course');

    if (startDate) {
      qb.andWhere('payment.paymentDate >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('payment.paymentDate <= :endDate', { endDate });
    }
    if (method) {
      qb.andWhere('payment.paymentMethod = :method', { method });
    }
    if (status) {
      qb.andWhere('payment.status = :status', { status });
    }

    qb.orderBy('payment.paymentDate', 'DESC');
    const items = await qb.getMany();

    const totalCollected = items
      .filter((p) => p.status === PaymentStatus.COMPLETED)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const totalReversed = items
      .filter((p) => p.status === PaymentStatus.REVERSED)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      summary: {
        totalTransactions: items.length,
        totalCollected,
        totalReversed,
      },
      items,
    };
  }

  async getDuesReport() {
    const students = await this.dataSource.getRepository(Student).find({
      where: { isArchived: false },
      relations: { enrollments: { course: true }, payments: true },
    });

    const duesList = students
      .map((student) => {
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
        const due = Math.max(0, totalPayable - totalPaid);

        return {
          studentId: student.id,
          registrationNumber: student.registrationNumber,
          fullName: student.fullName,
          mobileNumber: student.mobileNumber,
          parentMobileNumber: student.parentMobileNumber,
          totalPayable,
          totalPaid,
          due,
          enrolledCourses: (student.enrollments || []).map((e) => e.course?.name).filter(Boolean),
        };
      })
      .filter((s) => s.due > 0)
      .sort((a, b) => b.due - a.due);

    const totalOutstandingDue = duesList.reduce((sum, s) => sum + s.due, 0);

    return {
      summary: {
        totalStudentsWithDue: duesList.length,
        totalOutstandingDue,
      },
      items: duesList,
    };
  }
}
