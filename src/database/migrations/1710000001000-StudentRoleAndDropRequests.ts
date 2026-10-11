import { MigrationInterface, QueryRunner } from 'typeorm';

export class StudentRoleAndDropRequests1710000001000 implements MigrationInterface {
  name = 'StudentRoleAndDropRequests1710000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Extend enums
    await queryRunner.query(`
      ALTER TYPE "users_role_enum" ADD VALUE IF NOT EXISTS 'STUDENT';
    `);

    await queryRunner.query(`
      ALTER TYPE "enrollments_status_enum" ADD VALUE IF NOT EXISTS 'DROP_REQUESTED';
    `);

    await queryRunner.query(`
      ALTER TYPE "enrollments_status_enum" ADD VALUE IF NOT EXISTS 'DROPPED';
    `);

    // 2. Create drop_requests_status_enum
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "drop_requests_status_enum" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 3. Alter users table
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" varchar;
    `);
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mustChangePassword" boolean NOT NULL DEFAULT false;
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_username" ON "users" ("username") WHERE "username" IS NOT NULL;
    `);

    // 4. Alter students table
    await queryRunner.query(`
      ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "userId" uuid;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "students" ADD CONSTRAINT "FK_students_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_students_userId" ON "students" ("userId") WHERE "userId" IS NOT NULL;
    `);

    // 5. Create drop_requests table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "drop_requests" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "enrollmentId" uuid NOT NULL,
        "studentId" uuid NOT NULL,
        "reason" text,
        "status" "drop_requests_status_enum" NOT NULL DEFAULT 'PENDING',
        "requestDate" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "adminNotes" text,
        "reviewedBy" uuid,
        "reviewerName" varchar,
        "reviewedAt" timestamp with time zone,
        "createdAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FK_drop_requests_enrollmentId" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_drop_requests_studentId" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_drop_requests_enrollmentId" ON "drop_requests" ("enrollmentId");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_drop_requests_studentId" ON "drop_requests" ("studentId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "drop_requests";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "drop_requests_status_enum";`);
    await queryRunner.query(`ALTER TABLE "students" DROP CONSTRAINT IF EXISTS "FK_students_userId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_students_userId";`);
    await queryRunner.query(`ALTER TABLE "students" DROP COLUMN IF EXISTS "userId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_username";`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "mustChangePassword";`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "username";`);
  }
}
