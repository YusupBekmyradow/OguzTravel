'use strict';

/**
 * Indexes for the TaskFlow queries (`MessagesService.getAllTasks`, notifications).
 *
 * `tbl_messages` / `tbl_task_assignees` were created without migrations, so apart from
 * primary keys they had no indexes and every task list request scanned both tables.
 *
 * - CONCURRENTLY: builds without locking writes on a live table. Postgres forbids it inside
 *   a transaction, and sequelize-cli does not wrap migrations in one.
 * - A CONCURRENTLY build that fails leaves an INVALID index behind which `IF NOT EXISTS`
 *   would then silently skip, so any invalid leftover is dropped before (re)creating.
 */
const INDEXES = [
  {
    // Correlated assignee subquery per returned task: `WHERE ta.task_guid = t.guid`.
    name: 'idx_tbl_task_assignees_task_guid',
    sql: 'ON tbl_task_assignees (task_guid)',
  },
  {
    // Assignee filter `EXISTS (... assignee_guid = ?)` and notifications `assignee_guid + isRead`.
    name: 'idx_tbl_task_assignees_assignee_guid_is_read',
    sql: 'ON tbl_task_assignees (assignee_guid, "isRead")',
  },
  {
    // Board columns (keyset): `isMessage = false AND status = ? AND index_number < :cursor
    // ORDER BY index_number DESC LIMIT ?` — each page is a seek + range read, no sort, no OFFSET.
    name: 'idx_tbl_messages_tasks_status_index_number',
    sql: 'ON tbl_messages (status, index_number DESC) WHERE "isMessage" = false',
  },
  {
    // List view without a status filter: `isMessage = false ORDER BY "createdAt" DESC, guid`.
    name: 'idx_tbl_messages_tasks_created',
    sql: 'ON tbl_messages ("createdAt" DESC, guid) WHERE "isMessage" = false',
  },
  {
    // Due-date filter `due_date >= ? AND due_date < ?` and due_date sorting.
    name: 'idx_tbl_messages_tasks_due_date',
    sql: 'ON tbl_messages (due_date) WHERE "isMessage" = false',
  },
];

const dropInvalidIndex = async (queryInterface, name) => {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT 1 FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
     WHERE c.relname = :name AND NOT i.indisvalid`,
    { replacements: { name } },
  );
  if (rows.length > 0) {
    await queryInterface.sequelize.query(`DROP INDEX CONCURRENTLY IF EXISTS "${name}";`);
  }
};

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    for (const { name, sql } of INDEXES) {
      await dropInvalidIndex(queryInterface, name);
      await queryInterface.sequelize.query(`CREATE INDEX CONCURRENTLY IF NOT EXISTS "${name}" ${sql};`);
    }
    // Fresh statistics so the planner starts using the new indexes right away.
    await queryInterface.sequelize.query('ANALYZE tbl_messages;');
    await queryInterface.sequelize.query('ANALYZE tbl_task_assignees;');
  },

  async down(queryInterface) {
    for (const { name } of [...INDEXES].reverse()) {
      await queryInterface.sequelize.query(`DROP INDEX CONCURRENTLY IF EXISTS "${name}";`);
    }
  },
};
