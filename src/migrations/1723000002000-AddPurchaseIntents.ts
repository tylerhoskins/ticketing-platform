import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPurchaseIntents1723000002000 implements MigrationInterface {
  name = 'AddPurchaseIntents1723000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create purchase_intents table for fair queue-based ticket purchasing
    await queryRunner.query(`
      CREATE TABLE "purchase_intents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "event_id" uuid NOT NULL,
        "user_session_id" character varying(255) NOT NULL,
        "requested_quantity" integer NOT NULL,
        "request_timestamp" bigint NOT NULL,
        "status" character varying NOT NULL DEFAULT 'waiting',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_purchase_intents" PRIMARY KEY ("id"),
        CONSTRAINT "FK_purchase_intents_event" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_requested_quantity_positive" CHECK ("requested_quantity" > 0),
        CONSTRAINT "CHK_requested_quantity_reasonable" CHECK ("requested_quantity" <= 100),
        CONSTRAINT "CHK_status_valid" CHECK ("status" IN ('waiting', 'processing', 'completed', 'failed', 'expired'))
      )
    `);

    // Create indexes for efficient queue processing and lookups
    // Primary composite index for queue processing - order by event and timestamp
    await queryRunner.query(`
      CREATE INDEX "IDX_purchase_intents_queue_processing" 
      ON "purchase_intents" ("event_id", "request_timestamp")
    `);

    // Index for filtering by status (active vs completed intents)
    await queryRunner.query(`
      CREATE INDEX "IDX_purchase_intents_status" 
      ON "purchase_intents" ("status")
    `);

    // Index for user session lookups
    await queryRunner.query(`
      CREATE INDEX "IDX_purchase_intents_user_session" 
      ON "purchase_intents" ("user_session_id")
    `);

    // Index for timestamp-based ordering (for overall queue management)
    await queryRunner.query(`
      CREATE INDEX "IDX_purchase_intents_timestamp" 
      ON "purchase_intents" ("request_timestamp")
    `);

    // Index for event foreign key (performance optimization)
    await queryRunner.query(`
      CREATE INDEX "IDX_purchase_intents_event_id" 
      ON "purchase_intents" ("event_id")
    `);

    // Composite index for finding user's existing intent for an event
    await queryRunner.query(`
      CREATE INDEX "IDX_purchase_intents_user_event" 
      ON "purchase_intents" ("user_session_id", "event_id")
    `);

    // Composite index for efficient cleanup of expired intents
    await queryRunner.query(`
      CREATE INDEX "IDX_purchase_intents_cleanup" 
      ON "purchase_intents" ("status", "request_timestamp")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`DROP INDEX "IDX_purchase_intents_cleanup"`);
    await queryRunner.query(`DROP INDEX "IDX_purchase_intents_user_event"`);
    await queryRunner.query(`DROP INDEX "IDX_purchase_intents_event_id"`);
    await queryRunner.query(`DROP INDEX "IDX_purchase_intents_timestamp"`);
    await queryRunner.query(`DROP INDEX "IDX_purchase_intents_user_session"`);
    await queryRunner.query(`DROP INDEX "IDX_purchase_intents_status"`);
    await queryRunner.query(`DROP INDEX "IDX_purchase_intents_queue_processing"`);

    // Drop the table
    await queryRunner.query(`DROP TABLE "purchase_intents"`);
  }
}