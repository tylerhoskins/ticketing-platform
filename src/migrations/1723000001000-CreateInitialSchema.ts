import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInitialSchema1723000001000 implements MigrationInterface {
  name = 'CreateInitialSchema1723000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create events table with optimistic locking and constraints
    await queryRunner.query(`
      CREATE TABLE "events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "date" TIMESTAMP WITH TIME ZONE NOT NULL,
        "total_tickets" integer NOT NULL,
        "available_tickets" integer NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_events" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_available_tickets_non_negative" CHECK ("available_tickets" >= 0),
        CONSTRAINT "CHK_total_tickets_non_negative" CHECK ("total_tickets" >= 0),
        CONSTRAINT "CHK_available_tickets_within_total" CHECK ("available_tickets" <= "total_tickets")
      )
    `);

    // Create tickets table with foreign key relationship
    await queryRunner.query(`
      CREATE TABLE "tickets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "event_id" uuid NOT NULL,
        "purchase_id" uuid NOT NULL,
        "purchased_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tickets" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tickets_event" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes for performance optimization
    await queryRunner.query(`CREATE INDEX "IDX_events_date" ON "events" ("date")`);
    await queryRunner.query(`CREATE INDEX "IDX_tickets_event_id" ON "tickets" ("event_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_tickets_purchase_id" ON "tickets" ("purchase_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_tickets_purchased_at" ON "tickets" ("purchased_at")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`DROP INDEX "IDX_tickets_purchased_at"`);
    await queryRunner.query(`DROP INDEX "IDX_tickets_purchase_id"`);
    await queryRunner.query(`DROP INDEX "IDX_tickets_event_id"`);
    await queryRunner.query(`DROP INDEX "IDX_events_date"`);

    // Drop tables in reverse order to handle foreign key constraints
    await queryRunner.query(`DROP TABLE "tickets"`);
    await queryRunner.query(`DROP TABLE "events"`);
  }
}