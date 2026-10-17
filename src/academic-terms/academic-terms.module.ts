import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicTerm } from './entities/academic-term.entity.js';
import { AcademicTermsService } from './academic-terms.service.js';
import { AcademicTermsController } from './academic-terms.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([AcademicTerm])],
  controllers: [AcademicTermsController],
  providers: [AcademicTermsService],
  exports: [AcademicTermsService],
})
export class AcademicTermsModule {}
