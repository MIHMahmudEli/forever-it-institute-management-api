import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcademicTerm, AcademicTermStatus } from './entities/academic-term.entity.js';
import { CreateAcademicTermDto, UpdateAcademicTermDto } from './dto/academic-term.dto.js';

@Injectable()
export class AcademicTermsService {
  constructor(
    @InjectRepository(AcademicTerm)
    private readonly termRepo: Repository<AcademicTerm>,
  ) {}

  async create(dto: CreateAcademicTermDto): Promise<AcademicTerm> {
    const existing = await this.termRepo.findOne({ where: { code: dto.code.trim().toUpperCase() } });
    if (existing) {
      throw new BadRequestException(`Academic term with code "${dto.code}" already exists.`);
    }

    if (dto.isCurrent) {
      await this.termRepo.update({}, { isCurrent: false });
    }

    const term = this.termRepo.create({
      ...dto,
      code: dto.code.trim().toUpperCase(),
      status: dto.status || AcademicTermStatus.UPCOMING,
      isCurrent: dto.isCurrent ?? false,
    });

    return this.termRepo.save(term);
  }

  async findAll(): Promise<AcademicTerm[]> {
    return this.termRepo.find({
      order: { startDate: 'DESC' },
    });
  }

  async findCurrent(): Promise<AcademicTerm | null> {
    const current = await this.termRepo.findOne({
      where: { isCurrent: true },
    });
    if (current) return current;

    // Fallback: active term or latest
    const active = await this.termRepo.findOne({
      where: { status: AcademicTermStatus.ACTIVE },
      order: { startDate: 'DESC' },
    });
    if (active) return active;

    return this.termRepo.findOne({
      order: { startDate: 'DESC' },
    });
  }

  async findOne(id: string): Promise<AcademicTerm> {
    const term = await this.termRepo.findOne({
      where: { id },
      relations: { offerings: true },
    });
    if (!term) {
      throw new NotFoundException(`Academic term not found.`);
    }
    return term;
  }

  async update(id: string, dto: UpdateAcademicTermDto): Promise<AcademicTerm> {
    const term = await this.findOne(id);

    if (dto.isCurrent) {
      await this.termRepo.update({}, { isCurrent: false });
    }

    Object.assign(term, dto);
    return this.termRepo.save(term);
  }

  async remove(id: string): Promise<void> {
    const term = await this.findOne(id);
    if (term.offerings && term.offerings.length > 0) {
      throw new BadRequestException('Cannot delete an academic term that has course offerings.');
    }
    await this.termRepo.remove(term);
  }
}
