'use strict';

/**
 * Tasks get an explicit time window: `start_date` → `end_date` (timestamps with time of day).
 *
 * - `end_date` is backfilled from the legacy `due_date`, so existing deadlines carry over.
 * - `due_date` stays and is kept equal to `end_date` by `MessagesService`, so clients that
 *   still read or send `due_date` (e.g. notifications) keep working.
 * - The indexes serve the board/list date-range filter, which matches tasks whose window
 *   overlaps the requested range, and sorting by either column.
 */
const INDEXES = [
  {
    name: 'idx_tbl_messages_tasks_start_date',
    sql: 'ON tbl_messages (start_date) WHERE "isMessage" = false',
  },
  {
    name: 'idx_tbl_messages_tasks_end_date',
    sql: 'ON tbl_messages (end_date) WHERE "isMessage" = false',
  },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE tbl_messages
        ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE;
    `);
    await queryInterface.sequelize.query(`
      UPDATE tbl_messages
      SET end_date = due_date
      WHERE "isMessage" = false AND end_date IS NULL AND due_date IS NOT NULL;
    `);
    for (const { name, sql } of INDEXES) {
      await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "${name}" ${sql};`);
    }
  },

  async down(queryInterface) {
    for (const { name } of [...INDEXES].reverse()) {
      await queryInterface.sequelize.query(`DROP INDEX IF EXISTS "${name}";`);
    }
    await queryInterface.sequelize.query(`
      ALTER TABLE tbl_messages
        DROP COLUMN IF EXISTS end_date,
        DROP COLUMN IF EXISTS start_date;
    `);
  },
};
