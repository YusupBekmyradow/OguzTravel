import { QueryInterface, DataTypes, Sequelize } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable('tbl_b2b', {
      guid: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      datetime: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      assignment_opr_guid: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'tbl_employees',
          key: 'guid',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      receiver_opr_guid: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'tbl_employees',
          key: 'guid',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      agent: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
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
      passport_count: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 1,
      },
      status_guid: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'tbl_Tstatuses',
          key: 'guid',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      airline: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      pnr: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      route: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      class: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      travel_type: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      flight_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      net_price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      sale_price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      currency: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "USD",
      },
      profit: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      card: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      note: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      index_number: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        unique: true,
      },
      is_paid: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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

    await queryInterface.addIndex('tbl_b2b', ["assignment_opr_guid"]);
    await queryInterface.addIndex('tbl_b2b', ["receiver_opr_guid"]);
    await queryInterface.addIndex('tbl_b2b', ["client_guid"]);
    await queryInterface.addIndex('tbl_b2b', ["status_guid"]);
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable('tbl_b2b');
  },
};
