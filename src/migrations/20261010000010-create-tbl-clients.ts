import { QueryInterface, DataTypes, Sequelize } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable('tbl_clients', {
      guid: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      fullName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      phone_number: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      dateOfBirth: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      passport_number: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      passportExpiryDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      passportIssueDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      passportCountryOfIssue: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      passport_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      gender: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      index_number: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        unique: true,
      },
      passportHistory: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      vip: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      images: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
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
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable('tbl_clients');
  },
};
