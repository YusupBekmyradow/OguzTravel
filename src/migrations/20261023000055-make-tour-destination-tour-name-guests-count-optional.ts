import { QueryInterface } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.sequelize.query(`
      ALTER TABLE "tbl_tour" 
      ALTER COLUMN "destination_country" DROP NOT NULL,
      ALTER COLUMN "tour_name" DROP NOT NULL,
      ALTER COLUMN "guests_count" DROP NOT NULL;
    `);
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.sequelize.query(`
      ALTER TABLE "tbl_tour" 
      ALTER COLUMN "destination_country" SET NOT NULL,
      ALTER COLUMN "tour_name" SET NOT NULL,
      ALTER COLUMN "guests_count" SET NOT NULL;
    `);
  }
};
