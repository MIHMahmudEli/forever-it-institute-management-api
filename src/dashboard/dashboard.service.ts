import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Student, StudentStatus } from '../students/entities/student.entity.js';
import { Course, CourseStatus } from '../courses/entities/course.entity.js';
import { Enrollment, EnrollmentStatus } from '../enrollments/entities/enrollment.entity.js';
import { Payment, PaymentStatus } from '../payments/entities/payment.entity.js';

@Injectable()
export class DashboardService {
  constructor(private readonly dataSource: DataSource) {}

  async getSummary() {
    const studentRepo = this.dataSource.getRepository(Student);
    const courseRepo = this.dataSource.getRepository(Course);
    const enrollmentRepo = this.dataSource.getRepository(Enrollment);
    const paymentRepo = this.dataSource.getRepository(Payment);

    // Counts
    const totalStudents = await studentRepo.count({ where: { isArchived: false } });
    const activeStudents = await studentRepo.count({
      where: { isArchived: false, status: StudentStatus.ACTIVE },
    });
    const totalActiveCourses = await courseRepo.count({ where: { status: CourseStatus.ACTIVE } });
    const totalEnrollments = await enrollmentRepo.count();

    // Financial aggregates via SQL queries
    const paymentSumResult = await paymentRepo
      .createQueryBuilder('payment')
      .select('COALESCE(SUM(payment.amount), 0)', 'total')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .getRawOne();

    const totalCollected = parseFloat(paymentSumResult?.total || '0');

    const payableSumResult = await enrollmentRepo
      .createQueryBuilder('enrollment')
      .select('COALESCE(SUM(enrollment.finalFee), 0)', 'total')
      .where('enrollment.status != :cancelledStatus', { cancelledStatus: EnrollmentStatus.CANCELLED })
      .getRawOne();

    const totalPayable = parseFloat(payableSumResult?.total || '0');
    const outstandingDue = Math.max(0, totalPayable - totalCollected);

    // Recent 5 registrations
    const recentStudents = await studentRepo.find({
      where: { isArchived: false },
      relations: { enrollments: { course: true } },
      order: { createdAt: 'DESC' },
      take: 5,
    });

    // Recent 5 payments
    const recentPayments = await paymentRepo.find({
      relations: {
        student: true,
        enrollment: {
          course: true,
        },
      },
      order: { createdAt: 'DESC' },
      take: 5,
    });

    // Enrollment distribution by course
    const courseDistribution = await enrollmentRepo
      .createQueryBuilder('enrollment')
      .leftJoin('enrollment.course', 'course')
      .select('course.name', 'courseName')
      .addSelect('COUNT(enrollment.id)', 'count')
      .groupBy('course.name')
      .orderBy('count', 'DESC')
      .getRawMany();

    // Monthly payment summaries (last 6 months)
    const monthlyPayments = await paymentRepo
      .createQueryBuilder('payment')
      .select("TO_CHAR(payment.paymentDate, 'YYYY-MM')", 'month')
      .addSelect('COALESCE(SUM(payment.amount), 0)', 'amount')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .groupBy("TO_CHAR(payment.paymentDate, 'YYYY-MM')")
      .orderBy('month', 'ASC')
      .limit(6)
      .getRawMany();

    // Enrollment status distribution
    const statusDistribution = await enrollmentRepo
      .createQueryBuilder('enrollment')
      .select('enrollment.status', 'status')
      .addSelect('COUNT(enrollment.id)', 'count')
      .groupBy('enrollment.status')
      .getRawMany();

    return {
      kpis: {
        totalStudents,
        activeStudents,
        totalActiveCourses,
        totalEnrollments,
        totalCollected,
        totalPayable,
        outstandingDue,
      },
      recentRegistrations: recentStudents.map((s) => ({
        id: s.id,
        registrationNumber: s.registrationNumber,
        fullName: s.fullName,
        mobileNumber: s.mobileNumber,
        courses: (s.enrollments || []).map((e) => e.course?.name).filter(Boolean),
        createdAt: s.createdAt,
      })),
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        receiptNumber: p.receiptNumber,
        studentName: p.student?.fullName,
        registrationNumber: p.student?.registrationNumber,
        amount: Number(p.amount),
        paymentMethod: p.paymentMethod,
        paymentDate: p.paymentDate,
        status: p.status,
        reversalReason: p.reversalReason,
        reversedBy: p.reversedBy,
        reversedAt: p.reversedAt,
        transactionReference: p.transactionReference,
        student: p.student,
        enrollment: p.enrollment,
      })),
      courseDistribution: courseDistribution.map((item) => ({
        name: item.courseName || 'Unassigned',
        value: parseInt(item.count, 10),
      })),
      monthlyPayments: monthlyPayments.map((item) => ({
        month: item.month,
        amount: parseFloat(item.amount),
      })),
      statusDistribution: statusDistribution.map((item) => ({
        status: item.status,
        count: parseInt(item.count, 10),
      })),
    };
  }
}
