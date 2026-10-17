import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import bcrypt from 'bcrypt';
import { ParentProfile } from './entities/parent.entity.js';
import { ParentStudentRelationship } from './entities/parent-student-relationship.entity.js';
import { User, UserRole } from '../users/entities/user.entity.js';
import { Student } from '../students/entities/student.entity.js';
import { Enrollment, EnrollmentStatus } from '../enrollments/entities/enrollment.entity.js';
import { Payment } from '../payments/entities/payment.entity.js';
import { CreateParentDto, LinkStudentDto } from './dto/parent.dto.js';
import { ChangePasswordDto } from '../users/dto/change-password.dto.js';
import { generateTemporaryPassword } from '../common/utils/password-generator.util.js';
import { AttendanceService } from '../attendance/attendance.service.js';
import { GradebookService } from '../gradebook/gradebook.service.js';

@Injectable()
export class ParentsService {
  constructor(
    @InjectRepository(ParentProfile)
    private readonly parentRepo: Repository<ParentProfile>,
    @InjectRepository(ParentStudentRelationship)
    private readonly relationRepo: Repository<ParentStudentRelationship>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly attendanceService: AttendanceService,
    private readonly gradebookService: GradebookService,
    private readonly dataSource: DataSource,
  ) {}

  private async generateParentCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.parentRepo.count();
    const nextSeq = (count + 1).toString().padStart(4, '0');
    return `PRN-${year}-${nextSeq}`;
  }

  async create(dto: CreateParentDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const existing = await this.userRepo.findOne({ where: { email: normalizedEmail } });
    if (existing) {
      throw new BadRequestException(`A user with email ${dto.email} already exists.`);
    }

    const parentCode = await this.generateParentCode();
    const tempPassword = generateTemporaryPassword(10);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    return this.dataSource.transaction(async (manager) => {
      const user = manager.create(User, {
        email: normalizedEmail,
        username: parentCode,
        fullName: dto.fullName.trim(),
        passwordHash,
        role: UserRole.PARENT,
        isActive: true,
        mustChangePassword: true,
      });
      const savedUser = await manager.save(user);

      const parent = manager.create(ParentProfile, {
        userId: savedUser.id,
        phone: dto.phone.trim(),
        relationship: dto.relationship?.trim() || 'Guardian',
        occupation: dto.occupation?.trim() || null,
        emergencyContact: dto.emergencyContact?.trim() || null,
      });
      const savedParent = await manager.save(parent);

      if (dto.studentIds && dto.studentIds.length > 0) {
        for (const studentId of dto.studentIds) {
          const rel = manager.create(ParentStudentRelationship, {
            parentId: savedParent.id,
            studentId,
            isPrimaryGuardian: true,
            isVerified: true,
            verifiedAt: new Date(),
          });
          await manager.save(ParentStudentRelationship, rel);
        }
      }

      return {
        ...savedParent,
        user: {
          id: savedUser.id,
          email: savedUser.email,
          username: savedUser.username,
          fullName: savedUser.fullName,
          role: savedUser.role,
        },
        temporaryPassword: tempPassword,
      };
    });
  }

  async findAll() {
    return this.parentRepo.find({
      relations: {
        user: true,
        studentRelationships: { student: true },
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const parent = await this.parentRepo.findOne({
      where: { id },
      relations: {
        user: true,
        studentRelationships: { student: true },
      },
    });
    if (!parent) throw new NotFoundException('Parent profile not found');
    return parent;
  }

  async linkStudent(parentId: string, dto: LinkStudentDto) {
    const parent = await this.parentRepo.findOne({ where: { id: parentId } });
    if (!parent) throw new NotFoundException('Parent profile not found');

    const student = await this.studentRepo.findOne({ where: { id: dto.studentId } });
    if (!student) throw new NotFoundException('Student not found');

    const existing = await this.relationRepo.findOne({
      where: { parentId, studentId: dto.studentId },
    });
    if (existing) {
      existing.isVerified = true;
      existing.verifiedAt = new Date();
      return this.relationRepo.save(existing);
    }

    const rel = this.relationRepo.create({
      parentId,
      studentId: dto.studentId,
      isPrimaryGuardian: dto.isPrimaryGuardian ?? true,
      isVerified: true,
      verifiedAt: new Date(),
    });

    return this.relationRepo.save(rel);
  }

  // --- Parent Portal Self Methods ---

  private async getParentByUserId(userId: string): Promise<ParentProfile> {
    const parent = await this.parentRepo.findOne({
      where: { userId },
      relations: {
        user: true,
        studentRelationships: { student: true },
      },
    });
    if (!parent) {
      throw new NotFoundException('Parent profile not found for user');
    }
    return parent;
  }

  async verifyParentChildOwnership(userId: string, studentId: string): Promise<Student> {
    const parent = await this.getParentByUserId(userId);
    const rel = await this.relationRepo.findOne({
      where: {
        parentId: parent.id,
        studentId,
        isVerified: true,
      },
      relations: { student: true },
    });

    if (!rel || !rel.student) {
      throw new ForbiddenException('You do not have authorized verified access to this student account.');
    }

    return rel.student;
  }

  async getMe(userId: string) {
    return this.getParentByUserId(userId);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const isValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (dto.newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters');
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    user.mustChangePassword = false;
    await this.userRepo.save(user);

    return { message: 'Password updated successfully' };
  }

  async getChildren(userId: string) {
    const parent = await this.getParentByUserId(userId);
    const rels = await this.relationRepo.find({
      where: { parentId: parent.id, isVerified: true },
      relations: {
        student: {
          user: true,
          enrollments: { course: true, offering: true },
        },
      },
    });

    return rels.map((r) => ({
      relationshipId: r.id,
      isPrimaryGuardian: r.isPrimaryGuardian,
      student: r.student,
    }));
  }

  async getChildDashboard(userId: string, studentId: string) {
    const student = await this.verifyParentChildOwnership(userId, studentId);

    // Active enrollments
    const enrollments = await this.enrollmentRepo.find({
      where: {
        studentId,
        status: In([EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED]),
      },
      relations: {
        course: true,
        offering: {
          schedules: true,
          teacher: { user: true },
        },
      },
    });

    // Attendance summary
    const attReport = await this.attendanceService.getStudentAttendanceReport(studentId);

    // Grades summary
    const gradesReport = await this.gradebookService.getStudentGrades(studentId);

    // Financial balance
    const payments = await this.paymentRepo.find({ where: { studentId } });
    const totalAgreedFee = enrollments.reduce((sum, e) => sum + Number(e.finalFee || 0), 0);
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const dueBalance = Math.max(0, totalAgreedFee - totalPaid);

    return {
      student,
      enrollments,
      attendancePercentage: attReport.attendancePercentage,
      totalClassesHeld: attReport.totalSessions,
      totalClassesAttended: attReport.presentCount + attReport.lateCount,
      coursesWithGrades: gradesReport.courses,
      financialSummary: {
        totalAgreedFee,
        totalPaid,
        dueBalance,
      },
    };
  }

  async getChildTimetable(userId: string, studentId: string) {
    await this.verifyParentChildOwnership(userId, studentId);

    const enrollments = await this.enrollmentRepo.find({
      where: {
        studentId,
        status: In([EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED]),
      },
      relations: {
        course: true,
        offering: {
          schedules: true,
          teacher: { user: true },
        },
      },
    });

    const weeklyRoutine: any[] = [];
    for (const enr of enrollments) {
      if (!enr.offering) continue;
      for (const sch of enr.offering.schedules || []) {
        weeklyRoutine.push({
          offeringId: enr.offering.id,
          offeringCode: enr.offering.code,
          courseName: enr.course.name,
          section: enr.offering.section,
          classroom: sch.classroom || enr.offering.classroom,
          teacherName: enr.offering.teacher?.user?.fullName || 'Instructor',
          dayOfWeek: sch.dayOfWeek,
          dayName: sch.dayName,
          startTime: sch.startTime,
          endTime: sch.endTime,
        });
      }
    }

    weeklyRoutine.sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      return a.startTime.localeCompare(b.startTime);
    });

    return {
      studentId,
      routine: weeklyRoutine,
    };
  }

  async getChildAttendance(userId: string, studentId: string) {
    await this.verifyParentChildOwnership(userId, studentId);
    return this.attendanceService.getStudentAttendanceReport(studentId);
  }

  async getChildGrades(userId: string, studentId: string) {
    await this.verifyParentChildOwnership(userId, studentId);
    return this.gradebookService.getStudentGrades(studentId);
  }

  async getChildPayments(userId: string, studentId: string) {
    await this.verifyParentChildOwnership(userId, studentId);
    return this.paymentRepo.find({
      where: { studentId },
      relations: { enrollment: { course: true } },
      order: { paymentDate: 'DESC' },
    });
  }
}
