'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tbl_users', {
      guid: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      employee_guid: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'tbl_employees', key: 'guid' },
        onDelete: 'SET NULL',
        onUpdate: 'SET NULL'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      isExternalUser: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false
      },
      permissions: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: []
      },
      phone_number: {
        type: Sequelize.STRING,
        allowNull: true
      },
      role: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'User'
      },
      refresh_token: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      index_number: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        unique: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex('tbl_users', ['employee_guid'], {
      name: 'idx_tbl_users_employee_guid'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('tbl_users');
  }
};