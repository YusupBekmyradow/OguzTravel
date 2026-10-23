import { QueryInterface } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.sequelize.query(`
      ALTER TABLE "tbl_hotel" 
      ADD COLUMN IF NOT EXISTS "client_name" VARCHAR(255);
    `);

    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'tbl_hotel' AND column_name = 'client_guid'
        ) THEN
          UPDATE "tbl_hotel" AS h
          SET "client_name" = c."fullName"
          FROM "tbl_clients" AS c
          WHERE h."client_guid" = c."guid"
            AND h."client_guid" IS NOT NULL
            AND (h."client_name" IS NULL OR h."client_name" = '');
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
          WHERE table_name = 'tbl_hotel' 
            AND constraint_type = 'FOREIGN KEY'
            AND constraint_name LIKE '%client_guid%'
        ) LOOP
          EXECUTE 'ALTER TABLE "tbl_hotel" DROP CONSTRAINT IF EXISTS "' || r.constraint_name || '"';
        END LOOP;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS "tbl_hotel_client_guid";
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "tbl_hotel" 
      DROP COLUMN IF EXISTS "client_guid";
    `);
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.sequelize.query(`
      ALTER TABLE "tbl_hotel" 
      ADD COLUMN IF NOT EXISTS "client_guid" UUID;
    `);

    await queryInterface.sequelize.query(`
      UPDATE "tbl_hotel" AS h
      SET "client_guid" = c."guid"
      FROM "tbl_clients" AS c
      WHERE h."client_name" = c."fullName"
        AND h."client_guid" IS NULL;
    `);

    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE table_name = 'tbl_hotel' 
            AND constraint_name = 'tbl_hotel_client_guid_fkey'
        ) THEN
          ALTER TABLE "tbl_hotel" 
          ADD CONSTRAINT "tbl_hotel_client_guid_fkey" 
          FOREIGN KEY ("client_guid") REFERENCES "tbl_clients"("guid") 
          ON UPDATE CASCADE ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "tbl_hotel_client_guid" 
      ON "tbl_hotel" ("client_guid");
    `);
  }
};
