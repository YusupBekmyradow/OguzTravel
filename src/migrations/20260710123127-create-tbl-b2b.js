'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tbl_b2b', {
      guid: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true
      },
      datetime: {
        type: Sequelize.DATE,
        allowNull: false
      },
      assignment_opr_guid: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'tbl_employees', key: 'guid' },
        onUpdate: 'SET NULL',
        onDelete: 'SET NULL'
      },
      receiver_opr_guid: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'tbl_employees', key: 'guid' },
        onUpdate: 'SET NULL',
        onDelete: 'SET NULL'
      },
      agent: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: { phone: null, name: null }
      },
      client_guid: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'tbl_clients', key: 'guid' },
        onUpdate: 'SET NULL',
        onDelete: 'SET NULL'
      },
      status_guid: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'tbl_Tstatuses', key: 'guid' },
        onUpdate: 'SET NULL',
        onDelete: 'SET NULL'
      },
      airline: {
        type: Sequelize.STRING,
        allowNull: false
      },
      route: {
        type: Sequelize.STRING,
        allowNull: false
      },
      class: {
        type: Sequelize.STRING,
        allowNull: false
      },
      travel_type: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      flight_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      net_price: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false, defaultValue: 0
      },
      sale_price: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false, defaultValue: 0
      },
      currency: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'USD'
      },
      profit: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      card: {
        type: Sequelize.STRING,
        allowNull: true
      },
      note: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      pnr: {
        type: Sequelize.STRING,
        allowNull: false
      },
      index_number: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        unique: true
      },
      is_paid: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
    });

    await queryInterface.sequelize.query(`
  CREATE INDEX idx_tbl_b2b_index_number ON tbl_b2b (index_number);
`);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_tbl_b2b_index_number;');
    await queryInterface.dropTable('tbl_b2b');
  },
};