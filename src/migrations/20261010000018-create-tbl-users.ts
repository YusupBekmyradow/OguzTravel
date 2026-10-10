import { QueryInterface, DataTypes, Sequelize, Op } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable('tbl_users', {
      guid: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      employee_guid: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'tbl_employees',
          key: 'guid',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: true,
      },
      isExternalUser: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      permissions: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      phone_number: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "User",
      },
      refresh_token: {
        type: DataTypes.TEXT,
        allowNull: true,
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

    await queryInterface.addIndex('tbl_users', ["employee_guid"]);
    await queryInterface.addIndex('tbl_users', ["employee_guid"], {
      name: 'unique_employee_guid_not_null',
      unique: true,
      where: {
        employee_guid: { [Op.ne]: null },
      },
    });

    const defaultPermissions = [
      '/',
      '/tasks',
      '/finance/offices',
      '/finance/office-cash',
      '/finance/salary',
      '/reports/turkish-airlines',
      '/clients',
      '/visa/applications',
      '/visa/package',
      '/intake',
      '/ticket/b2b',
      '/ticket/turkish-airlines',
      '/translation',
      '/professional-translation/office',
      '/professional-translation/department',
      '/professional-translation/position',
      '/professional-translation/translator',
      '/professional-translation/category',
      '/professional-translation/referral-country',
      '/referal-letters',
      '/outbound',
      '/inbound',
      '/cafeteria',
      '/employee',
      '/employee/users',
      '/notifications',
      '/profile',
    ];

    await queryInterface.bulkInsert('tbl_users', [
      {
        guid: '3758eaff-658d-497d-9738-65f6cfc3c328',
        employee_guid: '1265c8cb-aea0-4463-abd3-4bd98a2f1a27',
        isActive: true,
        isExternalUser: false,
        password: '$2b$10$oEDIPR8ZeOjYcrbdlkkFkOhrXpAswH4Yg5WtLAStBYBG4G/MKCmR2', // 123456
        permissions: JSON.stringify(defaultPermissions),
        phone_number: '+99363680655',
        role: 'Admin',
        refresh_token: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable('tbl_users');
  },
};
