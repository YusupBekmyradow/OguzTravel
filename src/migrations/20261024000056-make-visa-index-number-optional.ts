import { QueryInterface } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.sequelize.query(`
      ALTER TABLE "tbl_visa" 
      ALTER COLUMN "index_number" DROP NOT NULL;
    `);
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.sequelize.query(`
      ALTER TABLE "tbl_visa" 
      ALTER COLUMN "index_number" SET NOT NULL;
    `);
  }
};
