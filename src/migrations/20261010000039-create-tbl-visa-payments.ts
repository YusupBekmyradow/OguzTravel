import { QueryInterface, DataTypes, Sequelize } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable('tbl_visa_payments', {
      guid: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      currency: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "TMT",
      },
      visa_guid: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'tbl_visa',
          key: 'guid',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      payment_date: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      note: {
        type: DataTypes.TEXT,
        allowNull: true,
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

    await queryInterface.addIndex('tbl_visa_payments', ["visa_guid"]);
    await queryInterface.addIndex('tbl_visa_payments', ["opr_guid"]);
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable('tbl_visa_payments');
  },
};
