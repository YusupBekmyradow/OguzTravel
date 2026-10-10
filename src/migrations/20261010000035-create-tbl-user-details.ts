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
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable('tbl_user_details');
  },
};
