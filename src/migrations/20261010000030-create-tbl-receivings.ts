import { QueryInterface, DataTypes, Sequelize } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable('tbl_receivings', {
      guid: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      application_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      office_guid: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'tbl_offices',
          key: 'guid',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      operator_guid: {
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
      status: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      index_number: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        unique: true,
      },
      country_guid: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'tbl_country',
          key: 'guid',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      custom_field_values: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      note: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      passport_count: {
        type: DataTypes.INTEGER,
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

    await queryInterface.addIndex('tbl_receivings', ["office_guid"]);
    await queryInterface.addIndex('tbl_receivings', ["operator_guid"]);
    await queryInterface.addIndex('tbl_receivings', ["client_guid"]);
    await queryInterface.addIndex('tbl_receivings', ["country_guid"]);
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable('tbl_receivings');
  },
};
