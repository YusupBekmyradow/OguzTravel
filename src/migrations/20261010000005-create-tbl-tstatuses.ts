import { QueryInterface, DataTypes, Sequelize } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable('tbl_Tstatuses', {
      guid: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      name: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      index_number: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        unique: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.bulkInsert('tbl_Tstatuses', [
      {
        guid: '70680c18-670e-4b22-a325-4a72fc1f69e6',
        name: JSON.stringify({ tk: 'SALE', ru: 'SALE', en: 'SALE' }),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        guid: '23f7253b-42b4-4abe-97a6-54cc80d28fc8',
        name: JSON.stringify({ tk: 'REISSUE', ru: 'REISSUE', en: 'REISSUE' }),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        guid: '22f0d634-5798-4e5b-9d2b-34b94ec36fbf',
        name: JSON.stringify({ tk: 'REFUND', ru: 'REFUND', en: 'REFUND' }),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable('tbl_Tstatuses');
  },
};
