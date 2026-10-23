import { QueryInterface } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {

    await queryInterface.sequelize.query(`
      ALTER TABLE "tbl_transfer" 
      ADD COLUMN IF NOT EXISTS "client_name" VARCHAR(255);
    `);


    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'tbl_transfer' AND column_name = 'client_guid'
        ) THEN
          UPDATE "tbl_transfer" AS tr
          SET "client_name" = c."fullName"
          FROM "tbl_clients" AS c
          WHERE tr."client_guid" = c."guid"
            AND tr."client_guid" IS NOT NULL
            AND (tr."client_name" IS NULL OR tr."client_name" = '');
        END IF;
      END $$;
    `);


    await queryInterface.sequelize.query(`
      DO $$
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN (
          SELECT constraint_name 
          FROM information_schema.table_constraints 
          WHERE table_name = 'tbl_transfer' 
            AND constraint_type = 'FOREIGN KEY'
            AND constraint_name LIKE '%client_guid%'
        ) LOOP
          EXECUTE 'ALTER TABLE "tbl_transfer" DROP CONSTRAINT IF EXISTS "' || r.constraint_name || '"';
        END LOOP;
      END $$;
    `);


    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS "tbl_transfer_client_guid";
    `);


    await queryInterface.sequelize.query(`
      ALTER TABLE "tbl_transfer" 
      DROP COLUMN IF EXISTS "client_guid";
    `);
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {

    await queryInterface.sequelize.query(`
      ALTER TABLE "tbl_transfer" 
      ADD COLUMN IF NOT EXISTS "client_guid" UUID;
    `);


    await queryInterface.sequelize.query(`
      UPDATE "tbl_transfer" AS tr
      SET "client_guid" = c."guid"
      FROM "tbl_clients" AS c
      WHERE tr."client_name" = c."fullName"
        AND tr."client_guid" IS NULL;
    `);


    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE table_name = 'tbl_transfer' 
            AND constraint_name = 'tbl_transfer_client_guid_fkey'
        ) THEN
          ALTER TABLE "tbl_transfer" 
          ADD CONSTRAINT "tbl_transfer_client_guid_fkey" 
          FOREIGN KEY ("client_guid") REFERENCES "tbl_clients"("guid") 
          ON UPDATE CASCADE ON DELETE SET NULL;
        END IF;
      END $$;
    `);


    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "tbl_transfer_client_guid" 
      ON "tbl_transfer" ("client_guid");
    `);
  }
};
