import { QueryInterface, DataTypes, Sequelize } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable('tbl_employees', {
      guid: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      fullName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      phone_number: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      gmail: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
      index_number: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        unique: true,
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
      position_guids: {
        type: DataTypes.ARRAY(DataTypes.UUID),
        allowNull: true,
        defaultValue: [],
      },
      department_guid: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'tbl_departments',
          key: 'guid',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      empl_loan: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        defaultValue: 0,
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

    await queryInterface.addIndex('tbl_employees', ["office_guid"]);
    await queryInterface.addIndex('tbl_employees', ["department_guid"]);

    await queryInterface.bulkInsert('tbl_employees', [
      {
        guid: '1265c8cb-aea0-4463-abd3-4bd98a2f1a27',
        fullName: 'Yusup Bekmyradow',
        phone_number: '+99363680655',
        gmail: 'yusupbekmyradov07@gmail.com',
        office_guid: 'e963e319-b5e7-484c-bb70-a70c40316b3d',
        position_guids: Sequelize.literal("ARRAY['52d40817-cfe7-4abb-a748-11eb4f21a501']::uuid[]"),
        department_guid: 'aef628b0-b989-4a0c-84e2-6e7c39cc7ebd',
        is_active: true,
        empl_loan: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable('tbl_employees');
  },
};
