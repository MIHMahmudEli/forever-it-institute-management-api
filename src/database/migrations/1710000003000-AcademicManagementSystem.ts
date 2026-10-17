import { MigrationInterface, QueryRunner } from 'typeorm';

export class AcademicManagementSystem1710000003000 implements MigrationInterface {
  name = 'AcademicManagementSystem1710000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Extend users_role_enum
    await queryRunner.query(`
      ALTER TYPE "users_role_enum" ADD VALUE IF NOT EXISTS 'TEACHER';
    `);
    await queryRunner.query(`
      ALTER TYPE "users_role_enum" ADD VALUE IF NOT EXISTS 'PARENT';
    `);

    // 2. Create academic enums
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "academic_terms_status_enum" AS ENUM ('UPCOMING', 'ACTIVE', 'COMPLETED', 'ARCHIVED');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "teacher_profiles_status_enum" AS ENUM ('ACTIVE', 'ON_LEAVE', 'INACTIVE');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "course_offerings_status_enum" AS ENUM ('DRAFT', 'PUBLISHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "class_sessions_status_enum" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "attendance_records_status_enum" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "assessments_type_enum" AS ENUM ('QUIZ', 'ASSIGNMENT', 'MIDTERM', 'FINAL', 'PROJECT', 'PARTICIPATION', 'OTHER');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "grades_status_enum" AS ENUM ('DRAFT', 'SUBMITTED', 'PUBLISHED');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // 3. Create academic_terms table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "academic_terms" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "code" varchar NOT NULL UNIQUE,
        "name" varchar NOT NULL,
        "startDate" date NOT NULL,
        "endDate" date NOT NULL,
        "registrationStartDate" date NOT NULL,
        "registrationEndDate" date NOT NULL,
        "status" "academic_terms_status_enum" NOT NULL DEFAULT 'UPCOMING',
        "isCurrent" boolean NOT NULL DEFAULT false,
        "createdAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_academic_terms_code" ON "academic_terms" ("code");
    `);

    // 4. Create teacher_profiles table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "teacher_profiles" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "teacherId" varchar NOT NULL UNIQUE,
        "userId" uuid NOT NULL UNIQUE,
        "department" varchar NOT NULL DEFAULT 'General',
        "designation" varchar NOT NULL DEFAULT 'Instructor',
        "specialization" varchar,
        "phone" varchar NOT NULL,
        "officeLocation" varchar,
        "bio" text,
        "hireDate" date NOT NULL DEFAULT CURRENT_DATE,
        "status" "teacher_profiles_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "createdAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FK_teacher_profiles_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_teacher_profiles_teacherId" ON "teacher_profiles" ("teacherId");
    `);

    // 5. Create parent_profiles table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "parent_profiles" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL UNIQUE,
        "phone" varchar NOT NULL,
        "relationship" varchar NOT NULL DEFAULT 'Guardian',
        "occupation" varchar,
        "emergencyContact" varchar,
        "createdAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FK_parent_profiles_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    // 6. Create parent_student_relationships table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "parent_student_relationships" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "parentId" uuid NOT NULL,
        "studentId" uuid NOT NULL,
        "isPrimaryGuardian" boolean NOT NULL DEFAULT true,
        "isVerified" boolean NOT NULL DEFAULT true,
        "verifiedAt" timestamp with time zone,
        "createdAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UQ_parent_student_relationship" UNIQUE ("parentId", "studentId"),
        CONSTRAINT "FK_parent_student_relationships_parentId" FOREIGN KEY ("parentId") REFERENCES "parent_profiles"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_parent_student_relationships_studentId" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_parent_student_parentId" ON "parent_student_relationships" ("parentId");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_parent_student_studentId" ON "parent_student_relationships" ("studentId");
    `);

    // 7. Create course_offerings table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "course_offerings" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "courseId" uuid NOT NULL,
        "termId" uuid NOT NULL,
        "teacherId" uuid,
        "section" varchar NOT NULL,
        "code" varchar NOT NULL UNIQUE,
        "classroom" varchar NOT NULL DEFAULT 'Lab 1',
        "capacity" integer NOT NULL DEFAULT 30,
        "enrolledCount" integer NOT NULL DEFAULT 0,
        "status" "course_offerings_status_enum" NOT NULL DEFAULT 'DRAFT',
        "startDate" date NOT NULL,
        "endDate" date NOT NULL,
        "feeOverride" numeric(12, 2),
        "createdAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FK_course_offerings_courseId" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_course_offerings_termId" FOREIGN KEY ("termId") REFERENCES "academic_terms"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_course_offerings_teacherId" FOREIGN KEY ("teacherId") REFERENCES "teacher_profiles"("id") ON DELETE SET NULL
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_course_offerings_courseId" ON "course_offerings" ("courseId");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_course_offerings_termId" ON "course_offerings" ("termId");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_course_offerings_teacherId" ON "course_offerings" ("teacherId");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_course_offerings_code" ON "course_offerings" ("code");
    `);

    // 8. Create offering_schedules table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "offering_schedules" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "offeringId" uuid NOT NULL,
        "dayOfWeek" smallint NOT NULL,
        "dayName" varchar NOT NULL DEFAULT 'SUNDAY',
        "startTime" time NOT NULL,
        "endTime" time NOT NULL,
        "classroom" varchar,
        "createdAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FK_offering_schedules_offeringId" FOREIGN KEY ("offeringId") REFERENCES "course_offerings"("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_offering_schedules_offeringId" ON "offering_schedules" ("offeringId");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_offering_schedules_dayOfWeek" ON "offering_schedules" ("dayOfWeek");
    `);

    // 9. Update enrollments table with offeringId
    await queryRunner.query(`
      ALTER TABLE "enrollments" ADD COLUMN IF NOT EXISTS "offeringId" uuid;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "enrollments" ADD CONSTRAINT "FK_enrollments_offeringId" FOREIGN KEY ("offeringId") REFERENCES "course_offerings"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_enrollments_offeringId" ON "enrollments" ("offeringId");
    `);

    // 10. Create class_sessions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "class_sessions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "offeringId" uuid NOT NULL,
        "sessionNumber" integer NOT NULL,
        "title" varchar NOT NULL DEFAULT 'Lecture Session',
        "sessionDate" date NOT NULL,
        "startTime" time NOT NULL,
        "endTime" time NOT NULL,
        "classroom" varchar,
        "status" "class_sessions_status_enum" NOT NULL DEFAULT 'SCHEDULED',
        "topic" text,
        "createdAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FK_class_sessions_offeringId" FOREIGN KEY ("offeringId") REFERENCES "course_offerings"("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_class_sessions_offeringId" ON "class_sessions" ("offeringId");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_class_sessions_sessionDate" ON "class_sessions" ("sessionDate");
    `);

    // 11. Create attendance_records table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "attendance_records" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "sessionId" uuid NOT NULL,
        "studentId" uuid NOT NULL,
        "status" "attendance_records_status_enum" NOT NULL DEFAULT 'PRESENT',
        "remarks" text,
        "markedBy" uuid,
        "markedAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UQ_attendance_session_student" UNIQUE ("sessionId", "studentId"),
        CONSTRAINT "FK_attendance_records_sessionId" FOREIGN KEY ("sessionId") REFERENCES "class_sessions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_attendance_records_studentId" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_attendance_records_sessionId" ON "attendance_records" ("sessionId");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_attendance_records_studentId" ON "attendance_records" ("studentId");
    `);

    // 12. Create assessments table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "assessments" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "offeringId" uuid NOT NULL,
        "title" varchar NOT NULL,
        "type" "assessments_type_enum" NOT NULL DEFAULT 'ASSIGNMENT',
        "totalMarks" numeric(5, 2) NOT NULL DEFAULT 100,
        "weightage" numeric(5, 2) NOT NULL DEFAULT 10,
        "dueDate" date,
        "isPublished" boolean NOT NULL DEFAULT false,
        "createdAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FK_assessments_offeringId" FOREIGN KEY ("offeringId") REFERENCES "course_offerings"("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_assessments_offeringId" ON "assessments" ("offeringId");
    `);

    // 13. Create grades table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "grades" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "assessmentId" uuid NOT NULL,
        "studentId" uuid NOT NULL,
        "obtainedMarks" numeric(5, 2) NOT NULL DEFAULT 0,
        "feedback" text,
        "status" "grades_status_enum" NOT NULL DEFAULT 'DRAFT',
        "gradedBy" uuid,
        "gradedAt" timestamp with time zone,
        "createdAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UQ_grades_assessment_student" UNIQUE ("assessmentId", "studentId"),
        CONSTRAINT "FK_grades_assessmentId" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_grades_studentId" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_grades_assessmentId" ON "grades" ("assessmentId");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_grades_studentId" ON "grades" ("studentId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "grades";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "assessments";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "attendance_records";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "class_sessions";`);
    await queryRunner.query(`ALTER TABLE "enrollments" DROP CONSTRAINT IF EXISTS "FK_enrollments_offeringId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_enrollments_offeringId";`);
    await queryRunner.query(`ALTER TABLE "enrollments" DROP COLUMN IF EXISTS "offeringId";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "offering_schedules";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "course_offerings";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "parent_student_relationships";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "parent_profiles";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "teacher_profiles";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "academic_terms";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "grades_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "assessments_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "attendance_records_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "class_sessions_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "course_offerings_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "teacher_profiles_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "academic_terms_status_enum";`);
  }
}
