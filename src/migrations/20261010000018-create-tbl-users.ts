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
      
"*"
,"/"
, 
"/:create"
,"/:update"
,"/:delete"
,"/finance/cash-flow"
,
"/finance/cash-flow:create"
,
"/finance/cash-flow:update"
,
"/finance/cash-flow:delete"
,
"/finance/offices"
,
"/finance/offices:create"
,
"/finance/offices:update"
,
"/finance/offices:delete"
,
"/finance/office-cash"
,
"/finance/office-cash:create"
,
"/finance/office-cash:update"
,
"/finance/office-cash:delete"
,
"/finance/salary"
,
"/finance/salary:create"
,
"/finance/salary:update"
,
"/finance/salary:delete"
,
"/reports/turkish-airlines"
,
"/reports/turkish-airlines:create"
,
"/reports/turkish-airlines:update"
,
"/reports/turkish-airlines:delete"
,
"/clients"
,
"/clients:create"
,
"/clients:update"
,
"/clients:delete"
,
"/visa/applications"
,
"/visa/applications:create"
,
"/visa/applications:update"
,
"/visa/applications:delete"
,
"/visa/package"
,
"/visa/package:create"
,
"/visa/package:update"
,
"/visa/package:delete"
,
"/intake"
,
"/intake:create"
,
"/intake:update"
,
"/intake:delete"
,
"/ticket/b2b"
,
"/ticket/b2b:create"
,
"/ticket/b2b:update"
,
"/ticket/b2b:delete"
,
"/ticket/turkish-airlines"
,
"/ticket/turkish-airlines:create"
,
"/ticket/turkish-airlines:update"
,
"/ticket/turkish-airlines:delete"
,
"/translation"
,
"/translation:create"
,
"/translation:update"
,
"/translation:delete"
,
"/professional-translation/office"
,
"/professional-translation/office:create"
,
"/professional-translation/office:update"
,
"/professional-translation/office:delete"
,
"/professional-translation/department"
,
"/professional-translation/department:create"
,
"/professional-translation/department:update"
,
"/professional-translation/department:delete"
,
"/professional-translation/position"
,
"/professional-translation/position:create"
,
"/professional-translation/position:update"
,
"/professional-translation/position:delete"
,
"/professional-translation/translator"
,
"/professional-translation/translator:create"
,
"/professional-translation/translator:update"
,
"/professional-translation/translator:delete"
,
"/professional-translation/category"
,
"/professional-translation/category:create"
,
"/professional-translation/category:update"
,
"/professional-translation/category:delete"
,
"/professional-translation/referral-country"
,
"/professional-translation/referral-country:create"
,
"/professional-translation/referral-country:update"
,
"/professional-translation/referral-country:delete"
,
"/referal-letters"
,
"/referal-letters:create"
,
"/referal-letters:update"
,
"/referal-letters:delete"
,
"/outbound"
,
"/outbound:create"
,
"/outbound:update"
,
"/outbound:delete"
,
"/inbound"
,
"/inbound:create"
,
"/inbound:update"
,
"/inbound:delete"
,
"/cafeteria"
,
"/cafeteria:create"
,
"/cafeteria:update"
,
"/cafeteria:delete"
,
"/employee"
,
"/employee:create"
,
"/employee:update"
,
"/employee:delete"
,
"/employee/users"
,
"/employee/users:create"
,
"/employee/users:update"
,
"/employee/users:delete"
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
