import { QueryInterface, DataTypes, Sequelize } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable('tbl_total_calculations', {
      guid: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      category_guid: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'tbl_categories',
          key: 'guid',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      datetime: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: {},
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
      status: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      net_price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      sale_price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        defaultValue: 0,
      },
      currency: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "TMT",
      },
      profit: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        defaultValue: 0,
      },
      credit_price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        defaultValue: 0,
      },
      sale_price_usd: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        defaultValue: 0,
      },
      net_price_usd: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        defaultValue: 0,
      },
      profit_usd: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        defaultValue: 0,
      },
      credit_usd: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        defaultValue: 0,
      },
      is_manual: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      index_number: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        unique: true,
      },
      type: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      source: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: "PROJECT",
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      giver: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      receiver: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      company: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      import_key: {
        type: DataTypes.STRING(64),
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

    await queryInterface.addIndex('tbl_total_calculations', ["category_guid"]);
    await queryInterface.addIndex('tbl_total_calculations', ["receiver_opr_guid"]);
    await queryInterface.addIndex('tbl_total_calculations', ["office_guid"]);
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable('tbl_total_calculations');
  },
};
