import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment, EnrollmentStatus } from './entities/enrollment.entity.js';
import { Student } from '../students/entities/student.entity.js';
import { Course } from '../courses/entities/course.entity.js';
import { CreateEnrollmentDto, UpdateEnrollmentDto } from './dto/create-enrollment.dto.js';

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  async create(createEnrollmentDto: CreateEnrollmentDto) {
    const student = await this.studentRepository.findOne({
      where: { id: createEnrollmentDto.studentId, isArchived: false },
    });
    if (!student) {
      throw new NotFoundException(`Student with ID ${createEnrollmentDto.studentId} not found.`);
    }

    const course = await this.courseRepository.findOne({
      where: { id: createEnrollmentDto.courseId },
    });
    if (!course) {
      throw new NotFoundException(`Course with ID ${createEnrollmentDto.courseId} not found.`);
    }

    // Check duplicate active enrollment
    const existing = await this.enrollmentRepository.findOne({
      where: {
        studentId: student.id,
        courseId: course.id,
        status: EnrollmentStatus.ACTIVE,
      },
    });

    if (existing) {
      throw new ConflictException(`Student is already actively enrolled in course: ${course.name}`);
    }

    const agreedFee = createEnrollmentDto.agreedFee !== undefined
      ? Number(createEnrollmentDto.agreedFee)
      : Number(course.totalFee);

    const discount = Number(createEnrollmentDto.discount || 0);
    if (discount > agreedFee) {
      throw new BadRequestException('Discount cannot exceed the agreed course fee.');
    }

    const finalFee = agreedFee - discount;

    const enrollment = this.enrollmentRepository.create({
      studentId: student.id,
      courseId: course.id,
      enrollmentDate: createEnrollmentDto.enrollmentDate || new Date().toISOString().split('T')[0],
      agreedFee,
      discount,
      finalFee,
      status: createEnrollmentDto.status || EnrollmentStatus.ACTIVE,
      notes: createEnrollmentDto.notes || null,
    });

    return this.enrollmentRepository.save(enrollment);
  }

  async findAll(studentId?: string, courseId?: string, status?: EnrollmentStatus) {
    const qb = this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.student', 'student')
      .leftJoinAndSelect('enrollment.course', 'course')
      .leftJoinAndSelect('enrollment.payments', 'payment');

    if (studentId) {
      qb.andWhere('enrollment.studentId = :studentId', { studentId });
    }
    if (courseId) {
      qb.andWhere('enrollment.courseId = :courseId', { courseId });
    }
    if (status) {
      qb.andWhere('enrollment.status = :status', { status });
    }

    qb.orderBy('enrollment.createdAt', 'DESC');
    return qb.getMany();
  }

  async findOne(id: string) {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id },
      relations: { student: true, course: true, payments: true },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${id} not found.`);
    }

    return enrollment;
  }

  async update(id: string, updateEnrollmentDto: UpdateEnrollmentDto) {
    const enrollment = await this.enrollmentRepository.findOne({ where: { id } });
    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${id} not found.`);
    }

    if (updateEnrollmentDto.status !== undefined) {
      enrollment.status = updateEnrollmentDto.status;
    }
    if (updateEnrollmentDto.discount !== undefined) {
      const discount = Number(updateEnrollmentDto.discount);
      if (discount > Number(enrollment.agreedFee)) {
        throw new BadRequestException('Discount cannot exceed the agreed course fee.');
      }
      enrollment.discount = discount;
      enrollment.finalFee = Number(enrollment.agreedFee) - discount;
    }
    if (updateEnrollmentDto.notes !== undefined) {
      enrollment.notes = updateEnrollmentDto.notes;
    }

    return this.enrollmentRepository.save(enrollment);
  }
}
