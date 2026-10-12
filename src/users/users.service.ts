import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In } from 'typeorm';
import bcrypt from 'bcrypt';
import { User, UserRole } from './entities/user.entity.js';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto.js';
import { CreateStaffDto, UpdateStaffDto } from './dto/create-staff.dto.js';
import { ChangePasswordDto, UpdateAccountDto } from './dto/change-password.dto.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // 1. Generic User Operations
  async create(createUserDto: CreateUserDto) {
    const email = createUserDto.email.trim().toLowerCase();
    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException(`User with email "${email}" already exists.`);
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 10);
    const user = this.userRepository.create({
      email,
      passwordHash,
      fullName: createUserDto.fullName.trim(),
      role: createUserDto.role || UserRole.STAFF,
      isActive: true,
    });

    const saved = await this.userRepository.save(user);
    const { passwordHash: _, ...result } = saved;
    return result;
  }

  async findAll() {
    return this.userRepository.find({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    if (updateUserDto.fullName !== undefined) {
      user.fullName = updateUserDto.fullName.trim();
    }
    if (updateUserDto.role !== undefined) {
      user.role = updateUserDto.role;
    }
    if (updateUserDto.isActive !== undefined) {
      user.isActive = updateUserDto.isActive;
    }
    if (updateUserDto.password) {
      user.passwordHash = await bcrypt.hash(updateUserDto.password, 10);
    }

    const saved = await this.userRepository.save(user);
    const { passwordHash: _, ...result } = saved;
    return result;
  }

  // 2. Staff Management Operations (Admin Only)
  async createStaff(dto: CreateStaffDto, adminId: string, ipAddress?: string) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException(`An account with email "${email}" already exists.`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const staffUser = this.userRepository.create({
      email,
      passwordHash,
      fullName: dto.fullName.trim(),
      role: UserRole.STAFF, // Strictly enforced STAFF role
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });

    const saved = await this.userRepository.save(staffUser);

    await this.auditLogsService.log({
      action: 'STAFF_CREATED',
      entityType: 'User',
      entityId: saved.id,
      performedBy: adminId,
      details: { email: saved.email, fullName: saved.fullName, role: saved.role },
      ipAddress,
    });

    const { passwordHash: _, ...result } = saved;
    return result;
  }

  async findAllStaff(params?: { search?: string; status?: string; page?: number; limit?: number }) {
    const page = Math.max(1, params?.page || 1);
    const limit = Math.min(100, Math.max(1, params?.limit || 10));
    const skip = (page - 1) * limit;

    const where: any = {
      role: In([UserRole.STAFF, UserRole.ADMIN]),
    };

    if (params?.status === 'ACTIVE') {
      where.isActive = true;
    } else if (params?.status === 'INACTIVE') {
      where.isActive = false;
    }

    let whereConditions: any[] = [];
    if (params?.search && params.search.trim()) {
      const term = `%${params.search.trim()}%`;
      whereConditions = [
        { ...where, fullName: ILike(term) },
        { ...where, email: ILike(term) },
      ];
    } else {
      whereConditions = [where];
    }

    const [data, total] = await this.userRepository.findAndCount({
      where: whereConditions,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findStaffById(id: string) {
    const user = await this.findOne(id);
    if (user.role === UserRole.STUDENT) {
      throw new NotFoundException(`Staff user with ID ${id} not found.`);
    }
    return user;
  }

  async updateStaff(id: string, dto: UpdateStaffDto, adminId: string, ipAddress?: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user || user.role === UserRole.STUDENT) {
      throw new NotFoundException(`Staff user with ID ${id} not found.`);
    }

    if (dto.fullName) {
      user.fullName = dto.fullName.trim();
    }
    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    const saved = await this.userRepository.save(user);

    await this.auditLogsService.log({
      action: 'STAFF_UPDATED',
      entityType: 'User',
      entityId: saved.id,
      performedBy: adminId,
      details: { email: saved.email, fullName: saved.fullName },
      ipAddress,
    });

    const { passwordHash: _, ...result } = saved;
    return result;
  }

  async updateStaffStatus(id: string, isActive: boolean, adminId: string, ipAddress?: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user || user.role === UserRole.STUDENT) {
      throw new NotFoundException(`Staff user with ID ${id} not found.`);
    }

    // Protection rule 1: Do not deactivate yourself
    if (user.id === adminId && !isActive) {
      throw new BadRequestException('Administrators cannot deactivate their own account.');
    }

    // Protection rule 2: Do not deactivate the last active administrator
    if (user.role === UserRole.ADMIN && !isActive) {
      const activeAdmins = await this.userRepository.count({
        where: { role: UserRole.ADMIN, isActive: true },
      });
      if (activeAdmins <= 1) {
        throw new BadRequestException('Cannot deactivate the last active administrator.');
      }
    }

    user.isActive = isActive;
    const saved = await this.userRepository.save(user);

    await this.auditLogsService.log({
      action: isActive ? 'STAFF_ACTIVATED' : 'STAFF_DEACTIVATED',
      entityType: 'User',
      entityId: saved.id,
      performedBy: adminId,
      details: { email: saved.email, role: saved.role, isActive: saved.isActive },
      ipAddress,
    });

    const { passwordHash: _, ...result } = saved;
    return result;
  }

  // 3. Self-Service Account & Credential Management
  async getAccountProfile(userId: string) {
    return this.findOne(userId);
  }

  async updateAccountProfile(userId: string, dto: UpdateAccountDto) {
    const user = await this.userRepository.findOne({ where: { id: userId, isActive: true } });
    if (!user) {
      throw new NotFoundException('User profile not found.');
    }

    user.fullName = dto.fullName.trim();
    const saved = await this.userRepository.save(user);

    const { passwordHash: _, ...result } = saved;
    return result;
  }

  async changePassword(userId: string, dto: ChangePasswordDto, ipAddress?: string) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('New password and confirmation password do not match.');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
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

    await this.auditLogsService.log({
      action: 'PASSWORD_CHANGED',
      entityType: 'User',
      entityId: user.id,
      performedBy: user.id,
      details: { email: user.email },
      ipAddress,
    });

    return {
      success: true,
      message: 'Password changed successfully. Please keep your credentials secure.',
    };
  }
}
