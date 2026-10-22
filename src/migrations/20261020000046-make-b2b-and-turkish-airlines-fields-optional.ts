import { QueryInterface } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.sequelize.query(`
      ALTER TABLE "tbl_b2b"
      ALTER COLUMN "airline" DROP NOT NULL,
      ALTER COLUMN "route" DROP NOT NULL,
      ALTER COLUMN "class" DROP NOT NULL;
    `);


    await queryInterface.sequelize.query(`
      ALTER TABLE "tbl_turkish_airlines"
      ALTER COLUMN "pnr" DROP NOT NULL,
      ALTER COLUMN "route" DROP NOT NULL,
      ALTER COLUMN "class" DROP NOT NULL,
      ALTER COLUMN "accepted_price" DROP NOT NULL,
      ALTER COLUMN "returned_price" DROP NOT NULL;
    `);
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.sequelize.query(`
      ALTER TABLE "tbl_b2b"
      ALTER COLUMN "airline" SET NOT NULL,
      ALTER COLUMN "route" SET NOT NULL,
      ALTER COLUMN "class" SET NOT NULL;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "tbl_turkish_airlines"
      ALTER COLUMN "pnr" SET NOT NULL,
      ALTER COLUMN "route" SET NOT NULL,
      ALTER COLUMN "class" SET NOT NULL;
    `);
  }
};
