'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tbl_employees', {
      guid: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      fullName: {
        type: Sequelize.STRING,
        allowNull: false,
        field: 'fullName'
      },
      phone_number: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      gmail: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
      },
      index_number: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        unique: true,
      },
      address: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      office_guid: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'tbl_offices', key: 'guid' },
        onUpdate: 'SET NULL',
        onDelete: 'SET NULL',
      },
      position_guid: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'tbl_positions', key: 'guid' },
        onUpdate: 'SET NULL',
        onDelete: 'SET NULL',
      },
      department_guid: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'tbl_departments', key: 'guid' },
        onUpdate: 'SET NULL',
        onDelete: 'SET NULL',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');

    await queryInterface.sequelize.query(`
  CREATE INDEX "idx_tbl_employees_fullName_trgm" ON "tbl_employees" USING gin ("fullName" gin_trgm_ops);
`);
    await queryInterface.sequelize.query(`
      CREATE INDEX idx_tbl_employees_gmail_trgm ON tbl_employees USING gin (gmail gin_trgm_ops);
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_tbl_employees_fullName_trgm;');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_tbl_employees_gmail_trgm;');
    await queryInterface.dropTable('tbl_employees');
  },
};