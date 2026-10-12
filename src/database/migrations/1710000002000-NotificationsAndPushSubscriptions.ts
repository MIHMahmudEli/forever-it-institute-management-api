import { MigrationInterface, QueryRunner } from 'typeorm';

export class NotificationsAndPushSubscriptions1710000002000 implements MigrationInterface {
  name = 'NotificationsAndPushSubscriptions1710000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create notifications_type_enum
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "notifications_type_enum" AS ENUM (
          'COURSE_REQUEST',
          'DROP_REQUEST',
          'PAYMENT_RECEIVED',
          'PAYMENT_REVERSED',
          'ENROLLMENT_APPROVED',
          'ENROLLMENT_REJECTED',
          'DROP_REQUEST_REVIEWED',
          'STUDENT_REGISTERED',
          'CREDENTIALS_RESET',
          'SYSTEM'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Create notifications table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid,
        "targetRole" "users_role_enum",
        "title" varchar NOT NULL,
        "message" text NOT NULL,
        "type" "notifications_type_enum" NOT NULL DEFAULT 'SYSTEM',
        "link" varchar,
        "isRead" boolean NOT NULL DEFAULT false,
        "readAt" timestamp with time zone,
        "metadata" jsonb,
        "createdAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FK_notifications_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notifications_userId" ON "notifications" ("userId");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notifications_targetRole" ON "notifications" ("targetRole");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notifications_isRead" ON "notifications" ("isRead");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notifications_createdAt" ON "notifications" ("createdAt");
    `);

    // 3. Create push_subscriptions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "push_subscriptions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "endpoint" text NOT NULL,
        "p256dh" text NOT NULL,
        "auth" text NOT NULL,
        "userAgent" text,
        "createdAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UQ_push_subscriptions_endpoint" UNIQUE ("endpoint"),
        CONSTRAINT "FK_push_subscriptions_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_push_subscriptions_userId" ON "push_subscriptions" ("userId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "push_subscriptions";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notifications_type_enum";`);
  }
}
