import { QueryInterface, DataTypes, Sequelize } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable('tbl_inbound_arrivals', {
      guid: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      index_number: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        unique: true,
      },
      full_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      gender: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      birth_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      passport_number: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      citizenship: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      invitation_number: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      voucher_number: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      entry_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      exit_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      entry_border: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      exit_border: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      note: {
        type: DataTypes.TEXT,
        allowNull: true,
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

    await queryInterface.addIndex('tbl_inbound_arrivals', ["entry_date"], {"name":"tbl_inbound_arrivals_entry_date"});

  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable('tbl_inbound_arrivals');
  },
};
