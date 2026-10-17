import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import bcrypt from 'bcrypt';
import { TeacherProfile, TeacherStatus } from './entities/teacher.entity.js';
import { User, UserRole } from '../users/entities/user.entity.js';
import { CreateTeacherDto, UpdateTeacherDto } from './dto/teacher.dto.js';
import { generateTemporaryPassword } from '../common/utils/password-generator.util.js';

@Injectable()
export class TeachersService {
  constructor(
    @InjectRepository(TeacherProfile)
    private readonly teacherRepo: Repository<TeacherProfile>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  private async generateTeacherId(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.teacherRepo.count();
    const nextSeq = (count + 1).toString().padStart(4, '0');
    return `TCH-${year}-${nextSeq}`;
  }

  async create(dto: CreateTeacherDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const existingUser = await this.userRepo.findOne({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      throw new BadRequestException(`A user with email ${dto.email} already exists.`);
    }

    const teacherId = await this.generateTeacherId();
    const tempPassword = generateTemporaryPassword(10);
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(tempPassword, saltRounds);

    return this.dataSource.transaction(async (manager) => {
      // 1. Create User
      const user = manager.create(User, {
        email: normalizedEmail,
        username: teacherId,
        fullName: dto.fullName.trim(),
        passwordHash,
        role: UserRole.TEACHER,
        isActive: true,
        mustChangePassword: true,
      });
      const savedUser = await manager.save(user);

      // 2. Create TeacherProfile
      const teacherProfile = manager.create(TeacherProfile, {
        teacherId,
        userId: savedUser.id,
        department: dto.department?.trim() || 'General',
        designation: dto.designation?.trim() || 'Instructor',
        specialization: dto.specialization?.trim() || null,
        phone: dto.phone.trim(),
        officeLocation: dto.officeLocation?.trim() || null,
        bio: dto.bio?.trim() || null,
        hireDate: dto.hireDate || new Date().toISOString().split('T')[0],
        status: TeacherStatus.ACTIVE,
      });
      const savedTeacher = await manager.save(teacherProfile);

      return {
        ...savedTeacher,
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
    return this.teacherRepo.find({
      relations: { user: true, offerings: { course: true } },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const teacher = await this.teacherRepo.findOne({
      where: { id },
      relations: {
        user: true,
        offerings: {
          course: true,
          term: true,
          schedules: true,
        },
      },
    });
    if (!teacher) {
      throw new NotFoundException(`Teacher profile not found.`);
    }
    return teacher;
  }

  async findByUserId(userId: string) {
    const teacher = await this.teacherRepo.findOne({
      where: { userId },
      relations: {
        user: true,
        offerings: {
          course: true,
          term: true,
          schedules: true,
        },
      },
    });
    if (!teacher) {
      throw new NotFoundException(`Teacher profile not found for user.`);
    }
    return teacher;
  }

  async update(id: string, dto: UpdateTeacherDto) {
    const teacher = await this.findOne(id);

    if (dto.fullName && teacher.user) {
      teacher.user.fullName = dto.fullName.trim();
      await this.userRepo.save(teacher.user);
    }

    if (dto.phone !== undefined) teacher.phone = dto.phone.trim();
    if (dto.department !== undefined) teacher.department = dto.department.trim();
    if (dto.designation !== undefined) teacher.designation = dto.designation.trim();
    if (dto.specialization !== undefined) teacher.specialization = dto.specialization;
    if (dto.officeLocation !== undefined) teacher.officeLocation = dto.officeLocation;
    if (dto.bio !== undefined) teacher.bio = dto.bio;
    if (dto.status !== undefined) teacher.status = dto.status;

    return this.teacherRepo.save(teacher);
  }

  async resetPassword(id: string) {
    const teacher = await this.findOne(id);
    const tempPassword = generateTemporaryPassword(10);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    teacher.user.passwordHash = passwordHash;
    teacher.user.mustChangePassword = true;
    await this.userRepo.save(teacher.user);

    return {
      message: 'Temporary password reset successfully',
      teacherId: teacher.teacherId,
      username: teacher.user.username,
      email: teacher.user.email,
      temporaryPassword: tempPassword,
    };
  }
}
