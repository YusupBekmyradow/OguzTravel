import { QueryInterface, DataTypes, Sequelize } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable('tbl_tour', {
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
      application_date: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      opr_guid: {
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
      prepared_opr_guid: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'tbl_employees',
          key: 'guid',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      destination_country: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      tour_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      guests_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      net_fare: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      currency: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "USD",
      },
      price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      profit: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
      },
      system: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      note: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      is_paid: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
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

    await queryInterface.addIndex('tbl_tour', ["opr_guid"]);
    await queryInterface.addIndex('tbl_tour', ["client_guid"]);
    await queryInterface.addIndex('tbl_tour', ["prepared_opr_guid"]);
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable('tbl_tour');
  },
};
