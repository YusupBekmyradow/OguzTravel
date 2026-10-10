import { QueryInterface, DataTypes, Sequelize } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable('tbl_salary', {
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
      month: {
        type: DataTypes.STRING(7),
        allowNull: false,
      },
      employee_guid: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'tbl_employees',
          key: 'guid',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      base_salary: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      work_days: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      worked_days: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      card_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      advance: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      cafeteria_credit: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      loan: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      sales_amount: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: true,
      },
      bonus_percent: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
      },
      bonus: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      bonus_currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: "TMT",
      },
      total_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      payable_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      paid_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      currency: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "TMT",
      },
      note: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_by_guid: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'tbl_employees',
          key: 'guid',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
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

    await queryInterface.addIndex('tbl_salary', ["employee_guid"]);
    await queryInterface.addIndex('tbl_salary', ["created_by_guid"]);
    await queryInterface.addIndex('tbl_salary', ["employee_guid","month"], {"name":"tbl_salary_employee_guid_month","unique":true});

  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable('tbl_salary');
  },
};
