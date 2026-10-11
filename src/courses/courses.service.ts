import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course, CourseStatus } from './entities/course.entity.js';
import { CreateCourseDto, UpdateCourseDto } from './dto/create-course.dto.js';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  async create(createCourseDto: CreateCourseDto) {
    const code = createCourseDto.code.trim().toUpperCase();
    const name = createCourseDto.name.trim();

    const existingCode = await this.courseRepository.findOne({ where: { code } });
    if (existingCode) {
      throw new ConflictException(`Course with code "${code}" already exists.`);
    }

    const existingName = await this.courseRepository.findOne({ where: { name } });
    if (existingName) {
      throw new ConflictException(`Course with name "${name}" already exists.`);
    }

    const course = this.courseRepository.create({
      ...createCourseDto,
      code,
      name,
      totalFee: Number(createCourseDto.totalFee),
      status: createCourseDto.status || CourseStatus.ACTIVE,
    });

    return this.courseRepository.save(course);
  }

  async findAll(status?: CourseStatus) {
    const query = this.courseRepository.createQueryBuilder('course');
    if (status) {
      query.where('course.status = :status', { status });
    }
    query.orderBy('course.createdAt', 'ASC');
    return query.getMany();
  }

  async findOne(id: string) {
    const course = await this.courseRepository.findOne({
      where: { id },
      relations: { enrollments: true },
    });
    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found.`);
    }
    return course;
  }

  async update(id: string, updateCourseDto: UpdateCourseDto) {
    const course = await this.courseRepository.findOne({ where: { id } });
    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found.`);
    }

    if (updateCourseDto.code) {
      const code = updateCourseDto.code.trim().toUpperCase();
      const existing = await this.courseRepository.findOne({ where: { code } });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Course with code "${code}" already exists.`);
      }
      course.code = code;
    }

    if (updateCourseDto.name) {
      const name = updateCourseDto.name.trim();
      const existing = await this.courseRepository.findOne({ where: { name } });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Course with name "${name}" already exists.`);
      }
      course.name = name;
    }

    if (updateCourseDto.category !== undefined) {
      course.category = updateCourseDto.category.trim();
    }
    if (updateCourseDto.description !== undefined) {
      course.description = updateCourseDto.description;
    }
    if (updateCourseDto.duration !== undefined) {
      course.duration = updateCourseDto.duration.trim();
    }
    if (updateCourseDto.totalFee !== undefined) {
      course.totalFee = Number(updateCourseDto.totalFee);
    }
    if (updateCourseDto.status !== undefined) {
      course.status = updateCourseDto.status;
    }

    return this.courseRepository.save(course);
  }

  async remove(id: string) {
    const course = await this.courseRepository.findOne({ where: { id } });
    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found.`);
    }
    // Safe archive
    course.status = CourseStatus.ARCHIVED;
    return this.courseRepository.save(course);
  }
}
