import { QueryInterface, DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable('tbl_audit_logs', {
      guid: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      user_guid: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'tbl_users',
          key: 'guid',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      action: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      endpoint: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      module: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      request_body: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      status_code: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      is_success: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      ip_address: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    await queryInterface.addIndex('tbl_audit_logs', ['user_guid']);
    await queryInterface.addIndex('tbl_audit_logs', ['action']);
    await queryInterface.addIndex('tbl_audit_logs', ['module']);
    await queryInterface.addIndex('tbl_audit_logs', ['created_at']);
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable('tbl_audit_logs');
  },
};
