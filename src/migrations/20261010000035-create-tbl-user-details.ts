import { QueryInterface, DataTypes, Sequelize } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable('tbl_user_details', {
      guid: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      user_guid: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'tbl_users',
          key: 'guid',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      full_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      role: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      avatar_url: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      contact: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      skills: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      personal_summary: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      work_experience: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      education: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      certifications: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      languages: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      references: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
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

    const [adminUser]: any = await queryInterface.sequelize.query(
      `SELECT guid FROM tbl_users WHERE guid = '3758eaff-658d-497d-9738-65f6cfc3c328' LIMIT 1;`,
    );

    if (adminUser && adminUser.length > 0) {
      await queryInterface.bulkInsert('tbl_user_details', [
        {
          guid: '53a17e56-1fc9-464f-9cde-997cbcf2447a',
          user_guid: '3758eaff-658d-497d-9738-65f6cfc3c328',
          full_name: 'Administrator',
          role: 'Admin',
          status: 'Active',
          avatar_url: null,
          contact: JSON.stringify({ phone: '+99361000000' }),
          skills: JSON.stringify([]),
          personal_summary: 'System Administrator',
          work_experience: JSON.stringify([]),
          education: JSON.stringify([]),
          certifications: JSON.stringify([]),
          languages: JSON.stringify([]),
          references: JSON.stringify([]),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
    }
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable('tbl_user_details');
  },
};
