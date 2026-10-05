// Inserts 10 demo rows into each Inbound report table.
// Demo rows have guids starting with "de30000", so they can be removed with:
//   node scripts/seed-inbound-demo.cjs --remove
const path = require("path");
const backend = path.join(__dirname, "..");
const req = (m) => require(require.resolve(m, { paths: [backend] }));
req("dotenv").config({ path: path.join(backend, ".env") });
const { Sequelize, QueryTypes } = req("sequelize");

const sequelize = new Sequelize(process.env.LOCAL_DB_NAME, process.env.LOCAL_DB_USERNAME, process.env.LOCAL_DB_PASSWORD, {
  host: process.env.LOCAL_DB_HOST,
  port: Number(process.env.LOCAL_DB_PORT),
  dialect: process.env.LOCAL_DB_DIALECT,
  logging: false,
});

const guid = (table, n) => `de30000${table}-0000-4000-8000-${String(n).padStart(12, "0")}`;

// Tourists expected in November 2026 (the report filed at the end of October).
const expected = [
  ["Italiýa", 3, "2026-11-02", "2026-11-06", "Aşgabat – Daşoguz – Köneürgenç – Aşgabat – Mary – Sarahs", "Uçar, ulag"],
  ["ABŞ", 8, "2026-11-04", "2026-11-10", "Daşoguz – Aşgabat", "Hususy motor"],
  ["ABŞ", 16, "2026-11-28", "2026-12-03", "Köneürgenç – Daşoguz – Aşgabat", "Welosiped, pyýada"],
  ["Germaniýa", 12, "2026-11-05", "2026-11-12", "Aşgabat – Derweze – Daşoguz – Köneürgenç", "Ulag"],
  ["Fransiýa", 6, "2026-11-08", "2026-11-14", "Aşgabat – Mary – Merw – Türkmenabat – Farap", "Uçar, ulag"],
  ["Ýaponiýa", 10, "2026-11-10", "2026-11-17", "Aşgabat – Nusaý – Derweze – Aşgabat – Mary – Merw", "Uçar, ulag"],
  ["Beýik Britaniýa", 4, "2026-11-13", "2026-11-18", "Türkmenbaşy – Awaza – Balkanabat – Aşgabat", "Otly, ulag"],
  ["Russiýa", 20, "2026-11-15", "2026-11-21", "Aşgabat – Awaza – Aşgabat", "Uçar"],
  ["Hytaý", 14, "2026-11-18", "2026-11-25", "Farap – Türkmenabat – Mary – Aşgabat – Derweze", "Ulag"],
  ["Türkiýe", 5, "2026-11-22", "2026-11-27", "Aşgabat – Gökdepe – Bäherden – Nohur – Aşgabat", "Ulag"],
];

// Tourists received in October 2026.
const arrivals = [
  ["SARA JOHNSON", "FEMALE", "1980-03-12", "AA1235252", "USA", "C-104512", "SÝ-000481", "2026-10-10", "2026-10-15", "AHHM", "FARAP"],
  ["MICHAEL TURNER", "MALE", "1986-10-16", "SS1236540", "GBR", "C-104513", "SÝ-000482", "2026-10-03", "2026-10-09", "SHABAT", "GARABOGAZ"],
  ["MARCO ROSSI", "MALE", "1975-06-21", "YA4581236", "ITA", "C-104520", "SÝ-000483", "2026-10-04", "2026-10-08", "AHHM", "AHHM"],
  ["GIULIA BIANCHI", "FEMALE", "1978-11-02", "YA4581237", "ITA", "C-104521", "SÝ-000483", "2026-10-04", "2026-10-08", "AHHM", "AHHM"],
  ["HANS MULLER", "MALE", "1969-01-30", "C4FT82K19", "DEU", "C-104533", "SÝ-000486", "2026-10-07", "2026-10-14", "AHHM", "DASHOGUZ"],
  ["CLAIRE DUBOIS", "FEMALE", "1991-08-17", "18FV45210", "FRA", "C-104540", "SÝ-000488", "2026-10-12", "2026-10-18", "AHHM", "FARAP"],
  ["KENJI TANAKA", "MALE", "1964-04-09", "TR7254810", "JPN", "C-104547", "SÝ-000490", "2026-10-14", "2026-10-21", "AHHM", "AHHM"],
  ["IVAN PETROV", "MALE", "1983-12-25", "753214896", "RUS", "C-104552", "SÝ-000493", "2026-10-17", "2026-10-23", "TURKMENBASHY", "AHHM"],
  ["LI WEI", "MALE", "1990-02-14", "EJ5821047", "CHN", "C-104558", "SÝ-000495", "2026-10-20", "2026-10-27", "FARAP", "AHHM"],
  ["EMILY CARTER", "FEMALE", "1994-07-05", "AB7741209", "USA", "C-104561", "SÝ-000497", "2026-10-24", "2026-10-30", "AHHM", "SARAHS"],
];

// Invitation application results for October 2026: granted, refused, pending.
const invitations = [
  ["RUSSIYA", 18, 2, 0],
  ["FRANSIYA", 6, 0, 0],
  ["GERMANIYA", 12, 1, 3],
  ["ITALIYA", 8, 0, 2],
  ["ABŞ", 15, 3, 6],
  ["BEÝIK BRITANIYA", 5, 1, 0],
  ["ÝAPONIYA", 10, 0, 4],
  ["HYTAÝ", 14, 2, 8],
  ["TÜRKIÝE", 7, 0, 1],
  ["ISPANIYA", 4, 1, 2],
];

const TABLES = ["tbl_inbound_expected", "tbl_inbound_arrivals", "tbl_inbound_invitations"];

const insert = (table, columns, rows, tableNo) =>
  Promise.all(
    rows.map((values, i) => {
      const cols = ["guid", ...columns, "createdAt", "updatedAt"];
      const sql = `INSERT INTO ${table} (${cols.map((c) => `"${c}"`).join(", ")})
                   VALUES (${cols.map(() => "?").join(", ")})`;
      const now = new Date();
      return sequelize.query(sql, { replacements: [guid(tableNo, i + 1), ...values, now, now], type: QueryTypes.INSERT });
    }),
  );

(async () => {
  const counts = async () => {
    for (const table of TABLES) {
      const [row] = await sequelize.query(
        `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE guid::text LIKE 'de30000%')::int AS demo FROM ${table}`,
        { type: QueryTypes.SELECT },
      );
      console.log(table, row);
    }
  };

  if (process.argv.includes("--remove")) {
    for (const table of TABLES) {
      await sequelize.query(`DELETE FROM ${table} WHERE guid::text LIKE 'de30000%'`);
    }
    console.log("demo rows removed");
    await counts();
    return;
  }

  if (process.argv.includes("--count")) return counts();

  console.log("before:");
  await counts();

  const transaction = await sequelize.transaction();
  try {
    sequelize.query = ((orig) => (sql, opts = {}) => orig(sql, { transaction, ...opts }))(sequelize.query.bind(sequelize));
    await insert(TABLES[0], ["country", "tourists_count", "start_date", "end_date", "route", "transport"], expected, 1);
    await insert(
      TABLES[1],
      ["full_name", "gender", "birth_date", "passport_number", "citizenship", "invitation_number", "voucher_number", "entry_date", "exit_date", "entry_border", "exit_border"],
      arrivals,
      2,
    );
    await insert(
      TABLES[2],
      ["report_month", "country", "granted_count", "refused_count", "pending_count"],
      invitations.map((row) => ["2026-10-01", ...row]),
      3,
    );
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  console.log("after:");
  await counts();
})()
  .catch((error) => {
    console.error("FAILED:", error.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
