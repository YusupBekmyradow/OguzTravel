import { QueryInterface } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    // 1. Add client_name column if it does not exist
    await queryInterface.sequelize.query(`
      ALTER TABLE "tbl_railway" 
      ADD COLUMN IF NOT EXISTS "client_name" VARCHAR(255);
    `);

    // 2. Copy existing client full name from tbl_clients to client_name
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'tbl_railway' AND column_name = 'client_guid'
        ) THEN
          UPDATE "tbl_railway" AS r
          SET "client_name" = c."fullName"
          FROM "tbl_clients" AS c
          WHERE r."client_guid" = c."guid"
            AND r."client_guid" IS NOT NULL
            AND (r."client_name" IS NULL OR r."client_name" = '');
        END IF;
      END $$;
    `);

    // 3. Drop Foreign Key constraint on client_guid dynamically
    await queryInterface.sequelize.query(`
      DO $$
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN (
          SELECT constraint_name 
          FROM information_schema.table_constraints 
          WHERE table_name = 'tbl_railway' 
            AND constraint_type = 'FOREIGN KEY'
            AND constraint_name LIKE '%client_guid%'
        ) LOOP
          EXECUTE 'ALTER TABLE "tbl_railway" DROP CONSTRAINT IF EXISTS "' || r.constraint_name || '"';
        END LOOP;
      END $$;
    `);

    // 4. Drop index on client_guid
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS "tbl_railway_client_guid";
    `);

    // 5. Drop client_guid column
    await queryInterface.sequelize.query(`
      ALTER TABLE "tbl_railway" 
      DROP COLUMN IF EXISTS "client_guid";
    `);
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    // 1. Recreate client_guid column
    await queryInterface.sequelize.query(`
      ALTER TABLE "tbl_railway" 
      ADD COLUMN IF NOT EXISTS "client_guid" UUID;
    `);

    // 2. Attempt to restore client_guid by matching fullName
    await queryInterface.sequelize.query(`
      UPDATE "tbl_railway" AS r
      SET "client_guid" = c."guid"
      FROM "tbl_clients" AS c
      WHERE r."client_name" = c."fullName"
        AND r."client_guid" IS NULL;
    `);

    // 3. Recreate foreign key constraint
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE table_name = 'tbl_railway' 
            AND constraint_name = 'tbl_railway_client_guid_fkey'
        ) THEN
          ALTER TABLE "tbl_railway" 
          ADD CONSTRAINT "tbl_railway_client_guid_fkey" 
          FOREIGN KEY ("client_guid") REFERENCES "tbl_clients"("guid") 
          ON UPDATE CASCADE ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // 4. Recreate index
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "tbl_railway_client_guid" 
      ON "tbl_railway" ("client_guid");
    `);
  }
};
