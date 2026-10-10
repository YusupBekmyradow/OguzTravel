import { QueryInterface, DataTypes, Sequelize } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable('tbl_turkish_airlines', {
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
      milesSmiles: {
        type: DataTypes.STRING,
        allowNull: true,
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
      pnr: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      ticket_number: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      passport_count: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 1,
      },
      route: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      class: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      flight_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      total_price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      base_fare: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      quoted_price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      accepted_price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      returned_price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      currency: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "USD",
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

    await queryInterface.addIndex('tbl_turkish_airlines', ["assignment_opr_guid"]);
    await queryInterface.addIndex('tbl_turkish_airlines', ["receiver_opr_guid"]);
    await queryInterface.addIndex('tbl_turkish_airlines', ["client_guid"]);
    await queryInterface.addIndex('tbl_turkish_airlines', ["status_guid"]);
    await queryInterface.addIndex('tbl_turkish_airlines', ["office_guid"]);
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable('tbl_turkish_airlines');
  },
};
