import { QueryInterface, DataTypes, Sequelize } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable('tbl_refferal_letter', {
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
      received_opr_guid: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'tbl_employees',
          key: 'guid',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      client_guid: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'tbl_clients',
          key: 'guid',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      refferal_country_guid: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'tbl_refferal_countries',
          key: 'guid',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      passport_count: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 1,
      },
      bgn_departure: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      bgn_arrival: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      travel_document_number: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      departure_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      return_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },
      currency: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "TMT",
      },
      contract_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      note: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      isRefferal: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: true,
      },
      isOne: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: true,
      },
      travel_document_number1: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      total_letter: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      date_time: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      accepted_by: {
        type: DataTypes.STRING,
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

    await queryInterface.addIndex('tbl_refferal_letter', ["received_opr_guid"]);
    await queryInterface.addIndex('tbl_refferal_letter', ["client_guid"]);
    await queryInterface.addIndex('tbl_refferal_letter', ["refferal_country_guid"]);
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable('tbl_refferal_letter');
  },
};
