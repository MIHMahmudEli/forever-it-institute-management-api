import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1710000000000 implements MigrationInterface {
  name = 'InitialSchema1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Extensions
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // 2. Custom Enums
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "users_role_enum" AS ENUM ('ADMIN', 'STAFF', 'VIEWER');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "courses_status_enum" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "students_status_enum" AS ENUM ('ACTIVE', 'INACTIVE', 'COMPLETED', 'DROPPED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "enrollments_status_enum" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "payments_paymentmethod_enum" AS ENUM ('CASH', 'BKASH', 'NAGAD', 'ROCKET', 'BANK_TRANSFER', 'OTHER');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "payments_status_enum" AS ENUM ('COMPLETED', 'REVERSED', 'PENDING');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 3. Create Users Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "passwordHash" character varying NOT NULL,
        "fullName" character varying NOT NULL,
        "role" "users_role_enum" NOT NULL DEFAULT 'STAFF',
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      );
    `);

    // 4. Create Courses Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "courses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" character varying NOT NULL,
        "name" character varying NOT NULL,
        "category" character varying NOT NULL DEFAULT 'General',
        "description" text,
        "duration" character varying NOT NULL DEFAULT '3 Months',
        "totalFee" numeric(12,2) NOT NULL DEFAULT 0,
        "status" "courses_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_courses_code" UNIQUE ("code"),
        CONSTRAINT "UQ_courses_name" UNIQUE ("name"),
        CONSTRAINT "PK_courses_id" PRIMARY KEY ("id")
      );
    `);

    // 5. Create Students Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "students" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "registrationNumber" character varying NOT NULL,
        "fullName" character varying NOT NULL,
        "nidOrBirthCertificateNumber" character varying NOT NULL,
        "presentAddress" text NOT NULL,
        "mobileNumber" character varying NOT NULL,
        "parentName" character varying NOT NULL,
        "parentMobileNumber" character varying NOT NULL,
        "status" "students_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "isArchived" boolean NOT NULL DEFAULT false,
        "createdBy" character varying,
        "updatedBy" character varying,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_students_registrationNumber" UNIQUE ("registrationNumber"),
        CONSTRAINT "PK_students_id" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_students_registrationNumber" ON "students" ("registrationNumber");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_students_fullName" ON "students" ("fullName");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_students_mobileNumber" ON "students" ("mobileNumber");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_students_nidOrBirthCertificateNumber" ON "students" ("nidOrBirthCertificateNumber");`);

    // 6. Create Enrollments Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "enrollments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "studentId" uuid NOT NULL,
        "courseId" uuid NOT NULL,
        "enrollmentDate" date NOT NULL DEFAULT CURRENT_DATE,
        "agreedFee" numeric(12,2) NOT NULL,
        "discount" numeric(12,2) NOT NULL DEFAULT 0,
        "finalFee" numeric(12,2) NOT NULL,
        "status" "enrollments_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "notes" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_enrollments_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_enrollments_studentId" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_enrollments_courseId" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_enrollments_studentId" ON "enrollments" ("studentId");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_enrollments_courseId" ON "enrollments" ("courseId");`);

    // 7. Create Payments Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "receiptNumber" character varying NOT NULL,
        "studentId" uuid NOT NULL,
        "enrollmentId" uuid,
        "amount" numeric(12,2) NOT NULL,
        "paymentDate" date NOT NULL DEFAULT CURRENT_DATE,
        "paymentMethod" "payments_paymentmethod_enum" NOT NULL DEFAULT 'CASH',
        "transactionReference" character varying,
        "status" "payments_status_enum" NOT NULL DEFAULT 'COMPLETED',
        "notes" text,
        "receivedBy" character varying,
        "reversalReason" text,
        "reversedBy" character varying,
        "reversedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_payments_receiptNumber" UNIQUE ("receiptNumber"),
        CONSTRAINT "PK_payments_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_payments_studentId" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_payments_enrollmentId" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_payments_receiptNumber" ON "payments" ("receiptNumber");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_payments_studentId" ON "payments" ("studentId");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_payments_enrollmentId" ON "payments" ("enrollmentId");`);

    // 8. Create Audit Logs Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "action" character varying NOT NULL,
        "entityType" character varying NOT NULL,
        "entityId" character varying,
        "performedBy" character varying NOT NULL,
        "details" jsonb,
        "ipAddress" character varying,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs_id" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_audit_logs_action" ON "audit_logs" ("action");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_audit_logs_entityType" ON "audit_logs" ("entityType");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payments";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "enrollments";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "students";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "courses";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users";`);

    await queryRunner.query(`DROP TYPE IF EXISTS "payments_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payments_paymentmethod_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "enrollments_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "students_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "courses_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_role_enum";`);
  }
}
