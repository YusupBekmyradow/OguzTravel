import { QueryInterface, DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.sequelize.query(`
      ALTER TABLE "tbl_general_translations"
      ALTER COLUMN "correction_status" DROP NOT NULL,
      ALTER COLUMN "completed_time" DROP NOT NULL,
      ALTER COLUMN "completed_page_count" DROP NOT NULL,
      ALTER COLUMN "completed_day" DROP NOT NULL;
    `);
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.sequelize.query(`
      ALTER TABLE "tbl_general_translations"
      ALTER COLUMN "correction_status" SET NOT NULL;
    `);
  }
};
