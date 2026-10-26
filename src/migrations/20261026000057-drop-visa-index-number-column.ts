import { QueryInterface, DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.sequelize.query(`
      ALTER TABLE "tbl_visa"
      DROP COLUMN IF EXISTS "index_number";
    `);
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.addColumn('tbl_visa', 'index_number', {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    });
  }
};
