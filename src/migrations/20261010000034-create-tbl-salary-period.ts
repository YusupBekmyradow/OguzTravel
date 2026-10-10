import { QueryInterface, DataTypes, Sequelize } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable('tbl_salary_period', {
      guid: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      month: {
        type: DataTypes.STRING(7),
        allowNull: false,
      },
      office_guid: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'tbl_offices',
          key: 'guid',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      is_locked: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      locked_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      locked_by_guid: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'tbl_employees',
          key: 'guid',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      salary_calc_guid: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      salary_usd_calc_guid: {
        type: DataTypes.UUID,
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

    await queryInterface.addIndex('tbl_salary_period', ["office_guid"]);
    await queryInterface.addIndex('tbl_salary_period', ["locked_by_guid"]);
    await queryInterface.addIndex('tbl_salary_period', ["month","office_guid"], {"name":"tbl_salary_period_month_office_guid","unique":true});

  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable('tbl_salary_period');
  },
};
