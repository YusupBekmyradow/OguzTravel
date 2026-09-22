'use strict';

/**
 * ÝH (letter stock) serial numbers become strings.
 *
 * The serials start with zeros ("0000001") and their width varies (up to 20 digits), so an
 * INTEGER column both drops the leading zeros and overflows past 10 digits. Existing values
 * keep their digits; zeros already lost cannot be restored.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE tbl_reports
        ALTER COLUMN start_yh_number TYPE VARCHAR(20) USING start_yh_number::text,
        ALTER COLUMN end_yh_number TYPE VARCHAR(20) USING end_yh_number::text;
    `);
  },

  // Fails if a value no longer fits an INTEGER (more than 10 digits).
  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE tbl_reports
        ALTER COLUMN start_yh_number TYPE INTEGER USING start_yh_number::integer,
        ALTER COLUMN end_yh_number TYPE INTEGER USING end_yh_number::integer;
    `);
  },
};
