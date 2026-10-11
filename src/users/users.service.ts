import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import bcrypt from 'bcrypt';
import { User, UserRole } from './entities/user.entity.js';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

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
}
