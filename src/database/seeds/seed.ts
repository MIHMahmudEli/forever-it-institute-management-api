import * as dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import AppDataSource from '../data-source.js';
import { User, UserRole } from '../../users/entities/user.entity.js';
import { Course, CourseStatus } from '../../courses/entities/course.entity.js';
import { Student, StudentStatus } from '../../students/entities/student.entity.js';
import { Enrollment, EnrollmentStatus } from '../../enrollments/entities/enrollment.entity.js';
import { Payment, PaymentMethod, PaymentStatus } from '../../payments/entities/payment.entity.js';

dotenv.config();

export async function runSeeds() {
  console.log('🌱 Starting database seeding...');
  await AppDataSource.initialize();

  try {
    const userRepository = AppDataSource.getRepository(User);
    const courseRepository = AppDataSource.getRepository(Course);
    const studentRepository = AppDataSource.getRepository(Student);
    const enrollmentRepository = AppDataSource.getRepository(Enrollment);
    const paymentRepository = AppDataSource.getRepository(Payment);

    // 1. Seed Initial Admin User
    const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@foreveritbd.com';
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'Admin123456!';
    const adminName = process.env.INITIAL_ADMIN_NAME || 'System Administrator';

    let admin = await userRepository.findOne({ where: { email: adminEmail } });
    if (!admin) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      admin = userRepository.create({
        email: adminEmail,
        passwordHash,
        fullName: adminName,
        role: UserRole.ADMIN,
        isActive: true,
      });
      await userRepository.save(admin);
      console.log(`✅ Admin user created: ${adminEmail}`);
    } else {
      console.log(`ℹ️ Admin user already exists: ${adminEmail}`);
    }

    // Also seed a default staff user for testing/demo
    const staffEmail = 'staff@foreveritbd.com';
    let staff = await userRepository.findOne({ where: { email: staffEmail } });
    if (!staff) {
      const staffPasswordHash = await bcrypt.hash('Staff123456!', 10);
      staff = userRepository.create({
        email: staffEmail,
        passwordHash: staffPasswordHash,
        fullName: 'Registration Officer',
        role: UserRole.STAFF,
        isActive: true,
      });
      await userRepository.save(staff);
      console.log(`✅ Staff user created: ${staffEmail}`);
    }

    // 2. Seed Default Courses from Registration Form
    const defaultCourses = [
      {
        code: 'BOC-01',
        name: 'Basic Office Course',
        category: 'Basic Office Course',
        description: 'Complete computer fundamentals, MS Word, Excel, PowerPoint, and Internet essentials.',
        duration: '3 Months',
        totalFee: 4000.0,
      },
      {
        code: 'BD-01',
        name: 'Business Development',
        category: 'Business Development',
        description: 'Client acquisition, freelance marketplace mastery, communication, and business pitching.',
        duration: '4 Months',
        totalFee: 8000.0,
      },
      {
        code: 'SEO-01',
        name: 'Search Engine Optimization (SEO)',
        category: 'Search Engine Optimization (SEO)',
        description: 'Technical SEO, On-page & Off-page optimization, Keyword Research, and Google Analytics.',
        duration: '3 Months',
        totalFee: 10000.0,
      },
      {
        code: 'WD-01',
        name: 'Website Development',
        category: 'Website Development',
        description: 'Frontend HTML, CSS, JavaScript, React/Next.js, responsive layouts, and hosting deployment.',
        duration: '6 Months',
        totalFee: 15000.0,
      },
      {
        code: 'SD-01',
        name: 'Software Development',
        category: 'Software Development',
        description: 'Full-stack application development, Node.js/NestJS, PostgreSQL, architecture & cloud APIs.',
        duration: '6 Months',
        totalFee: 20000.0,
      },
    ];

    for (const c of defaultCourses) {
      const existing = await courseRepository.findOne({ where: { code: c.code } });
      if (!existing) {
        const created = courseRepository.create({
          ...c,
          status: CourseStatus.ACTIVE,
        });
        await courseRepository.save(created);
        console.log(`✅ Course seeded: ${c.name} (${c.code})`);
      }
    }

    // 3. Seed Sample Demo Student if no students exist
    const studentCount = await studentRepository.count();
    if (studentCount === 0) {
      const sampleStudent = studentRepository.create({
        registrationNumber: 'FIT-202610-0001',
        fullName: 'Mahmudul Hasan',
        nidOrBirthCertificateNumber: '19982691234567890',
        presentAddress: 'House 42, Road 7, Sector 3, Uttara, Dhaka-1230',
        mobileNumber: '01712345678',
        parentName: 'Md. Rafiqul Islam',
        parentMobileNumber: '01812345678',
        status: StudentStatus.ACTIVE,
        createdBy: admin.id,
      });
      await studentRepository.save(sampleStudent);

      const wdCourse = await courseRepository.findOne({ where: { code: 'WD-01' } });
      if (wdCourse) {
        const enrollment = enrollmentRepository.create({
          studentId: sampleStudent.id,
          courseId: wdCourse.id,
          agreedFee: wdCourse.totalFee,
          discount: 1000.0,
          finalFee: Number(wdCourse.totalFee) - 1000.0,
          status: EnrollmentStatus.ACTIVE,
          notes: 'Admitted with seasonal merit discount',
        });
        await enrollmentRepository.save(enrollment);

        const payment = paymentRepository.create({
          receiptNumber: 'RCP-202610-0001',
          studentId: sampleStudent.id,
          enrollmentId: enrollment.id,
          amount: 5000.0,
          paymentDate: new Date().toISOString().split('T')[0],
          paymentMethod: PaymentMethod.BKASH,
          transactionReference: 'BK9X87Y21A',
          status: PaymentStatus.COMPLETED,
          notes: 'Advance registration payment',
          receivedBy: 'Registration Officer',
        });
        await paymentRepository.save(payment);
      }
      console.log('✅ Demo student, enrollment, and advance payment seeded.');
    }

    console.log('🎉 Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

// Execute if run directly
if (process.argv[1]?.endsWith('seed.ts')) {
  void runSeeds();
}
