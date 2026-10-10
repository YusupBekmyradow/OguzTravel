import { QueryInterface, DataTypes, Sequelize } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable('tbl_task_assignees', {
      guid: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      task_guid: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'tbl_messages',
          key: 'guid',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      assignee_guid: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'tbl_users',
          key: 'guid',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      isRead: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
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

    await queryInterface.addIndex('tbl_task_assignees', ["task_guid"]);
    await queryInterface.addIndex('tbl_task_assignees', ["assignee_guid"]);
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable('tbl_task_assignees');
  },
};
