import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student, StudentStatus } from './entities/student.entity.js';
import { CreateStudentDto, UpdateStudentDto, QueryStudentDto } from './dto/create-student.dto.js';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
  ) {}

  /**
   * Generates a unique sequential registration number: FIT-YYYYMM-XXXX
   */
  async generateRegistrationNumber(): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `FIT-${yearMonth}-`;

    const lastStudent = await this.studentRepository
      .createQueryBuilder('student')
      .where('student.registrationNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('student.registrationNumber', 'DESC')
      .getOne();

    let nextNumber = 1;
    if (lastStudent) {
      const parts = lastStudent.registrationNumber.split('-');
      const lastSeq = parseInt(parts[2], 10);
      if (!isNaN(lastSeq)) {
        nextNumber = lastSeq + 1;
      }
    }

    return `${prefix}${String(nextNumber).padStart(4, '0')}`;
  }

  async create(createStudentDto: CreateStudentDto, createdBy?: string) {
    const mobile = createStudentDto.mobileNumber.trim();
    const nid = createStudentDto.nidOrBirthCertificateNumber.trim();

    // Check duplicate
    const existing = await this.studentRepository.findOne({
      where: [
        { mobileNumber: mobile, isArchived: false },
        { nidOrBirthCertificateNumber: nid, isArchived: false },
      ],
    });

    if (existing) {
      throw new ConflictException(
        `A student with this Mobile Number (${mobile}) or NID/Birth Certificate (${nid}) already exists. Registration Number: ${existing.registrationNumber}`
      );
    }

    const registrationNumber = await this.generateRegistrationNumber();

    const student = this.studentRepository.create({
      ...createStudentDto,
      registrationNumber,
      fullName: createStudentDto.fullName.trim(),
      mobileNumber: mobile,
      nidOrBirthCertificateNumber: nid,
      presentAddress: createStudentDto.presentAddress.trim(),
      parentName: createStudentDto.parentName.trim(),
      parentMobileNumber: createStudentDto.parentMobileNumber.trim(),
      status: createStudentDto.status || StudentStatus.ACTIVE,
      createdBy,
    });

    return this.studentRepository.save(student);
  }

  async findAll(queryDto: QueryStudentDto) {
    const page = Math.max(1, Number(queryDto.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(queryDto.limit) || 10));
    const skip = (page - 1) * limit;

    const qb = this.studentRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.enrollments', 'enrollment')
      .leftJoinAndSelect('enrollment.course', 'course')
      .leftJoinAndSelect('student.payments', 'payment')
      .where('student.isArchived = :isArchived', { isArchived: false });

    if (queryDto.status) {
      qb.andWhere('student.status = :status', { status: queryDto.status });
    }

    if (queryDto.search) {
      const search = `%${queryDto.search.trim()}%`;
      qb.andWhere(
        '(student.fullName ILIKE :search OR student.registrationNumber ILIKE :search OR student.mobileNumber ILIKE :search OR student.nidOrBirthCertificateNumber ILIKE :search)',
        { search }
      );
    }

    qb.orderBy('student.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    // Map summary financials for each student
    const data = items.map((student) => {
      const totalPayable = (student.enrollments || []).reduce(
        (sum, e) => sum + (e.status !== 'CANCELLED' ? Number(e.finalFee) : 0),
        0
      );
      const totalPaid = (student.payments || []).reduce(
        (sum, p) => sum + (p.status === 'COMPLETED' ? Number(p.amount) : 0),
        0
      );
      const outstandingDue = Math.max(0, totalPayable - totalPaid);

      return {
        ...student,
        financials: {
          totalPayable,
          totalPaid,
          outstandingDue,
        },
      };
    });

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
    const student = await this.studentRepository.findOne({
      where: { id },
      relations: { enrollments: { course: true }, payments: true },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${id} not found.`);
    }

    const totalPayable = (student.enrollments || []).reduce(
      (sum, e) => sum + (e.status !== 'CANCELLED' ? Number(e.finalFee) : 0),
      0
    );
    const totalPaid = (student.payments || []).reduce(
      (sum, p) => sum + (p.status === 'COMPLETED' ? Number(p.amount) : 0),
      0
    );
    const outstandingDue = Math.max(0, totalPayable - totalPaid);

    return {
      ...student,
      financials: {
        totalPayable,
        totalPaid,
        outstandingDue,
      },
    };
  }

  async update(id: string, updateStudentDto: UpdateStudentDto, updatedBy?: string) {
    const student = await this.studentRepository.findOne({ where: { id } });
    if (!student) {
      throw new NotFoundException(`Student with ID ${id} not found.`);
    }

    if (updateStudentDto.fullName !== undefined) {
      student.fullName = updateStudentDto.fullName.trim();
    }
    if (updateStudentDto.presentAddress !== undefined) {
      student.presentAddress = updateStudentDto.presentAddress.trim();
    }
    if (updateStudentDto.mobileNumber !== undefined) {
      student.mobileNumber = updateStudentDto.mobileNumber.trim();
    }
    if (updateStudentDto.parentName !== undefined) {
      student.parentName = updateStudentDto.parentName.trim();
    }
    if (updateStudentDto.parentMobileNumber !== undefined) {
      student.parentMobileNumber = updateStudentDto.parentMobileNumber.trim();
    }
    if (updateStudentDto.nidOrBirthCertificateNumber !== undefined) {
      student.nidOrBirthCertificateNumber = updateStudentDto.nidOrBirthCertificateNumber.trim();
    }
    if (updateStudentDto.status !== undefined) {
      student.status = updateStudentDto.status;
    }
    if (updateStudentDto.isArchived !== undefined) {
      student.isArchived = updateStudentDto.isArchived;
    }
    if (updatedBy) {
      student.updatedBy = updatedBy;
    }

    return this.studentRepository.save(student);
  }

  async archive(id: string, updatedBy?: string) {
    const student = await this.studentRepository.findOne({ where: { id } });
    if (!student) {
      throw new NotFoundException(`Student with ID ${id} not found.`);
    }
    student.isArchived = true;
    student.status = StudentStatus.INACTIVE;
    if (updatedBy) {
      student.updatedBy = updatedBy;
    }
    return this.studentRepository.save(student);
  }
}
