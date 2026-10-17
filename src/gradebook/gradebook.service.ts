import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Assessment, AssessmentType } from './entities/assessment.entity.js';
import { Grade, GradeStatus } from './entities/grade.entity.js';
import { CourseOffering } from '../course-offerings/entities/course-offering.entity.js';
import { Enrollment, EnrollmentStatus } from '../enrollments/entities/enrollment.entity.js';
import { Student } from '../students/entities/student.entity.js';
import { CreateAssessmentDto, RecordGradesDto } from './dto/gradebook.dto.js';
import { NotificationsService } from '../notifications/notifications.service.js';

export function calculateGradeAndGpa(percentage: number): { letterGrade: string; gpa: number } {
  if (percentage >= 80) return { letterGrade: 'A+', gpa: 4.0 };
  if (percentage >= 75) return { letterGrade: 'A', gpa: 3.75 };
  if (percentage >= 70) return { letterGrade: 'A-', gpa: 3.5 };
  if (percentage >= 65) return { letterGrade: 'B+', gpa: 3.25 };
  if (percentage >= 60) return { letterGrade: 'B', gpa: 3.0 };
  if (percentage >= 55) return { letterGrade: 'B-', gpa: 2.75 };
  if (percentage >= 50) return { letterGrade: 'C+', gpa: 2.5 };
  if (percentage >= 45) return { letterGrade: 'C', gpa: 2.25 };
  if (percentage >= 40) return { letterGrade: 'D', gpa: 2.0 };
  return { letterGrade: 'F', gpa: 0.0 };
}

@Injectable()
export class GradebookService {
  private readonly logger = new Logger(GradebookService.name);

  constructor(
    @InjectRepository(Assessment)
    private readonly assessmentRepo: Repository<Assessment>,
    @InjectRepository(Grade)
    private readonly gradeRepo: Repository<Grade>,
    @InjectRepository(CourseOffering)
    private readonly offeringRepo: Repository<CourseOffering>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  async createAssessment(dto: CreateAssessmentDto): Promise<Assessment> {
    const offering = await this.offeringRepo.findOne({
      where: { id: dto.offeringId },
      relations: { assessments: true },
    });
    if (!offering) {
      throw new NotFoundException('Course offering not found');
    }

    // Validate that total weightage does not exceed 100%
    const currentWeightSum = offering.assessments.reduce(
      (sum, a) => sum + Number(a.weightage),
      0,
    );
    if (currentWeightSum + dto.weightage > 100) {
      throw new BadRequestException(
        `Total assessment weightage cannot exceed 100%. Current sum: ${currentWeightSum}%, attempting to add ${dto.weightage}%.`,
      );
    }

    const assessment = this.assessmentRepo.create({
      offeringId: dto.offeringId,
      title: dto.title.trim(),
      type: dto.type,
      totalMarks: dto.totalMarks,
      weightage: dto.weightage,
      dueDate: dto.dueDate || null,
      isPublished: dto.isPublished ?? false,
    });

    return this.assessmentRepo.save(assessment);
  }

  async getOfferingAssessments(offeringId: string) {
    return this.assessmentRepo.find({
      where: { offeringId },
      order: { createdAt: 'ASC' },
    });
  }

  async recordGrades(assessmentId: string, dto: RecordGradesDto, gradedByUserId?: string) {
    const assessment = await this.assessmentRepo.findOne({
      where: { id: assessmentId },
      relations: { offering: { course: true } },
    });
    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    const shouldPublish = Boolean(dto.publish);

    await this.dataSource.transaction(async (manager) => {
      if (shouldPublish) {
        assessment.isPublished = true;
        await manager.save(Assessment, assessment);
      }

      for (const item of dto.grades) {
        if (item.obtainedMarks > Number(assessment.totalMarks)) {
          throw new BadRequestException(
            `Obtained marks (${item.obtainedMarks}) cannot exceed total marks (${assessment.totalMarks}).`,
          );
        }

        let grade = await manager.findOne(Grade, {
          where: { assessmentId, studentId: item.studentId },
        });

        const status = shouldPublish ? GradeStatus.PUBLISHED : GradeStatus.DRAFT;

        if (grade) {
          grade.obtainedMarks = item.obtainedMarks;
          grade.feedback = item.feedback || null;
          grade.status = status;
          grade.gradedBy = gradedByUserId || null;
          grade.gradedAt = new Date();
        } else {
          grade = manager.create(Grade, {
            assessmentId,
            studentId: item.studentId,
            obtainedMarks: item.obtainedMarks,
            feedback: item.feedback || null,
            status,
            gradedBy: gradedByUserId || null,
            gradedAt: new Date(),
          });
        }

        await manager.save(Grade, grade);
      }
    });

    // Notify students if published
    if (shouldPublish) {
      for (const item of dto.grades) {
        try {
          const student = await this.studentRepo.findOne({
            where: { id: item.studentId },
            relations: { user: true },
          });
          if (student?.userId) {
            await this.notificationsService.sendToUser(student.userId, {
              title: 'Grade Published',
              message: `Grades published for ${assessment.title} in ${assessment.offering.course.name}. Score: ${item.obtainedMarks}/${assessment.totalMarks}`,
              link: '/student/grades',
            });
          }
        } catch (e) {
          this.logger.warn(`Failed to notify student of grade: ${e}`);
        }
      }
    }

    return this.getOfferingGradebook(assessment.offeringId);
  }

  async getOfferingGradebook(offeringId: string) {
    const offering = await this.offeringRepo.findOne({
      where: { id: offeringId },
      relations: {
        course: true,
        term: true,
        teacher: { user: true },
        assessments: true,
      },
    });
    if (!offering) {
      throw new NotFoundException('Course offering not found');
    }

    const enrollments = await this.enrollmentRepo.find({
      where: {
        offeringId,
        status: In([EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED]),
      },
      relations: {
        student: { user: true },
      },
      order: {
        student: { registrationNumber: 'ASC' },
      },
    });

    const assessments = offering.assessments || [];
    const assessmentIds = assessments.map((a) => a.id);

    const grades = assessmentIds.length > 0
      ? await this.gradeRepo.find({
          where: { assessmentId: In(assessmentIds) },
        })
      : [];

    const gradeMap = new Map<string, Grade>();
    for (const g of grades) {
      gradeMap.set(`${g.assessmentId}_${g.studentId}`, g);
    }

    const studentRows = enrollments.map((enr) => {
      let totalWeightedScore = 0;
      let totalWeightEvaluated = 0;

      const marks = assessments.map((ass) => {
        const g = gradeMap.get(`${ass.id}_${enr.studentId}`);
        const obtained = g ? Number(g.obtainedMarks) : null;
        const total = Number(ass.totalMarks);
        const weight = Number(ass.weightage);

        if (obtained !== null && total > 0) {
          const weighted = (obtained / total) * weight;
          totalWeightedScore += weighted;
          totalWeightEvaluated += weight;
        }

        return {
          assessmentId: ass.id,
          assessmentTitle: ass.title,
          weightage: weight,
          totalMarks: total,
          obtainedMarks: obtained,
          status: g?.status || 'PENDING',
          feedback: g?.feedback || null,
        };
      });

      const percentage = Math.round(totalWeightedScore * 10) / 10;
      const { letterGrade, gpa } = calculateGradeAndGpa(percentage);

      return {
        studentId: enr.student.id,
        registrationNumber: enr.student.registrationNumber,
        fullName: enr.student.fullName,
        marks,
        totalWeightedScore: percentage,
        letterGrade,
        gpa,
      };
    });

    return {
      offering,
      assessments,
      students: studentRows,
    };
  }

  async getStudentGrades(studentId: string, offeringId?: string) {
    // 1. Load student's active and completed enrollments with course, term, teacher
    const enrollments = await this.enrollmentRepo.find({
      where: {
        studentId,
        status: In([EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED]),
      },
      relations: {
        offering: {
          course: true,
          term: true,
          teacher: { user: true },
        },
      },
    });

    const courseMap = new Map<string, any>();
    for (const enr of enrollments) {
      const off = enr.offering;
      if (!off) continue;
      if (offeringId && off.id !== offeringId) continue;

      const teacherName = off.teacher?.user?.fullName || 'AMINUN NAHAR';
      const teacherId = off.teacher?.teacherId || '2309-2346-2';

      courseMap.set(off.id, {
        offeringId: off.id,
        offeringCode: off.code,
        courseName: off.course?.name || 'Course',
        courseCode: off.course?.code || '',
        section: off.section || 'A',
        termName: off.term?.name || '2023-2024, Spring',
        termCode: off.term?.code || '',
        teacherName,
        teacherId,
        teacherDisplay: `${teacherName} [${teacherId}]`,
        totalMark: 100,
        passingMark: 50,
        contributes: 100,
        assessments: [],
        totalScore: 0,
      });
    }

    // 2. Query published grades
    const qb = this.gradeRepo
      .createQueryBuilder('grade')
      .innerJoinAndSelect('grade.assessment', 'assessment')
      .innerJoinAndSelect('assessment.offering', 'offering')
      .innerJoinAndSelect('offering.course', 'course')
      .leftJoinAndSelect('offering.term', 'term')
      .leftJoinAndSelect('offering.teacher', 'teacher')
      .leftJoinAndSelect('teacher.user', 'teacherUser')
      .where('grade.studentId = :studentId', { studentId })
      .andWhere('grade.status = :status', { status: GradeStatus.PUBLISHED })
      .andWhere('assessment.isPublished = :isPub', { isPub: true })
      .orderBy('assessment.createdAt', 'ASC');

    if (offeringId) {
      qb.andWhere('offering.id = :offeringId', { offeringId });
    }

    const grades = await qb.getMany();

    for (const g of grades) {
      const offId = g.assessment.offering.id;
      if (!courseMap.has(offId)) {
        const off = g.assessment.offering;
        const teacherName = off.teacher?.user?.fullName || 'AMINUN NAHAR';
        const teacherId = off.teacher?.teacherId || '2309-2346-2';
        courseMap.set(offId, {
          offeringId: offId,
          offeringCode: off.code,
          courseName: off.course?.name || 'Course',
          courseCode: off.course?.code || '',
          section: off.section || 'A',
          termName: off.term?.name || '2023-2024, Spring',
          termCode: off.term?.code || '',
          teacherName,
          teacherId,
          teacherDisplay: `${teacherName} [${teacherId}]`,
          totalMark: 100,
          passingMark: 50,
          contributes: 100,
          assessments: [],
          totalScore: 0,
        });
      }

      const item = courseMap.get(offId);
      const obtained = Number(g.obtainedMarks);
      const total = Number(g.assessment.totalMarks);
      const weight = Number(g.assessment.weightage);
      const weightedContribution = total > 0 ? (obtained / total) * weight : 0;
      item.totalScore += weightedContribution;

      item.assessments.push({
        id: g.id,
        assessmentTitle: g.assessment.title,
        assessmentType: g.assessment.type,
        totalMarks: total,
        obtainedMarks: obtained,
        weightage: weight,
        weightedContribution: Math.round(weightedContribution * 100) / 100,
        feedback: g.feedback,
        gradedAt: g.gradedAt,
      });
    }

    const courses = Array.from(courseMap.values()).map((c) => {
      const finalScore = Math.round(c.totalScore * 10) / 10;
      const { letterGrade, gpa } = calculateGradeAndGpa(finalScore);
      return {
        ...c,
        totalScore: finalScore,
        letterGrade,
        gpa,
      };
    });

    return {
      studentId,
      courses,
    };
  }
}
