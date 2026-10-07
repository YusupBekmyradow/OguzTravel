// 20 demo office-cash transactions (manual cash-flow rows that belong to an office), in mixed
// currencies. Demo rows have guids starting with "de330000".
//   node scripts/seed-office-cash-demo.cjs            insert
//   node scripts/seed-office-cash-demo.cjs --remove   delete them again
const path = require("path");
const backend = path.join(__dirname, "..");
const req = (m) => require(require.resolve(m, { paths: [backend] }));
req("dotenv").config({ path: path.join(backend, ".env"), quiet: true });
const { Sequelize, QueryTypes } = req("sequelize");
const db = new Sequelize(process.env.LOCAL_DB_NAME, process.env.LOCAL_DB_USERNAME, process.env.LOCAL_DB_PASSWORD, {
  host: process.env.LOCAL_DB_HOST, port: Number(process.env.LOCAL_DB_PORT), dialect: process.env.LOCAL_DB_DIALECT, logging: false,
});

const FIRST = "de330000-0000-4000-8000-000000000000";
const LAST = "de330000-0000-4000-8000-999999999999";

// type, currency, amount, cost (income only: what it cost, the rest is profit), days ago, time,
// description, giver, receiver, company, category
const ROWS = [
  ["INCOME", "TMT", 3500, 2800, 0, "09:40", "Awiabilet üçin töleg", "Meretgylyjow Hezret", "Kassa", "", "B2B"],
  ["EXPENSE", "TMT", 450, 0, 0, "11:15", "Ofis üçin kanselýariýa harytlary", "Kassa", "Kitap dükany", "Bereket HK", "Beyleki"],
  ["INCOME", "USD", 620, 540, 0, "14:05", "Türk howa ýollary bileti", "Annaýew Döwran", "Kassa", "", "B2B"],
  ["EXPENSE", "USD", 85, 0, 1, "10:30", "Internet we aragatnaşyk tölegi", "Kassa", "Türkmentelekom", "Türkmentelekom", "Beyleki"],
  ["INCOME", "TMT", 1200, 0, 1, "12:20", "Wiza hyzmaty üçin öňünden töleg", "Rejepowa Aýsoltan", "Kassa", "", "Visa"],
  ["EXPENSE", "TMT", 2600, 0, 1, "16:45", "Ofis kärendesi", "Kassa", "Kärendeçi", "Altyn Asyr HJ", "Beyleki"],
  ["INCOME", "USD", 150, 110, 2, "09:10", "Myhmanhana brony", "Ataýewa Aýsoltan", "Kassa", "", "Hotel"],
  ["INCOME", "TMT", 800, 500, 2, "13:35", "Resminama terjimesi", "Kakalyýewa Dünýä", "Kassa", "", "Translation"],
  ["EXPENSE", "TMT", 320, 0, 3, "08:50", "Ýangyç", "Kassa", "Sürüji", "", "Beyleki"],
  ["EXPENSE", "USD", 240, 0, 3, "15:25", "Wiza merkezine töleg", "Kassa", "VFS Global", "VFS Global", "Visa"],
  ["INCOME", "TMT", 5400, 4700, 4, "10:05", "Syýahat bukjasy üçin töleg", "Myradowa Läle", "Kassa", "", "Package"],
  ["INCOME", "USD", 1100, 980, 5, "11:50", "Awiabilet, Aşgabat – Stambul", "Annaýew Eziz", "Kassa", "", "Airways"],
  ["EXPENSE", "TMT", 180, 0, 5, "17:10", "Suw we çaý", "Kassa", "Dükan", "", "Cafeteria"],
  ["INCOME", "TMT", 950, 0, 6, "09:30", "Ýollanma haty üçin töleg", "Annaýewa Aýgül", "Kassa", "", "Referral Letter"],
  ["EXPENSE", "USD", 60, 0, 7, "12:40", "Bank geçirim tölegi", "Kassa", "Bank", "Senagat banky", "Beyleki"],
  ["INCOME", "USD", 300, 250, 8, "14:15", "Transfer hyzmaty", "Komekow Durdymyrat", "Kassa", "", "Transfer"],
  ["EXPENSE", "TMT", 1500, 0, 9, "10:00", "Işgäre awans", "Kassa", "Işgär", "", "Employees"],
  ["INCOME", "TMT", 2200, 1900, 10, "15:50", "Demir ýol bileti", "Hojaýew Kerim", "Kassa", "", "Railway"],
  ["EXPENSE", "TMT", 700, 0, 12, "09:20", "Printer kartrijleri", "Kassa", "Tehnika dükany", "Ak Ýol HK", "Beyleki"],
  ["INCOME", "USD", 480, 400, 14, "13:00", "Tur hyzmaty", "Nurmuhammedow Serdar", "Kassa", "", "Tour"],
];

(async () => {
  if (process.argv.includes("--remove")) {
    const [, meta] = await db.query(`DELETE FROM tbl_total_calculations WHERE guid BETWEEN :first AND :last`, { replacements: { first: FIRST, last: LAST } });
    console.log("removed", meta.rowCount);
    return;
  }

  const employees = await db.query(`SELECT guid, office_guid FROM tbl_employees WHERE is_active IS TRUE AND office_guid IS NOT NULL ORDER BY index_number`, { type: QueryTypes.SELECT });
  const categories = await db.query(`SELECT guid, name->>'en' AS name FROM tbl_categories`, { type: QueryTypes.SELECT });
  const categoryGuid = new Map(categories.map((c) => [c.name, c.guid]));
  // One operator per office, so the rows spread over the offices.
  const byOffice = [...new Map(employees.map((e) => [e.office_guid, e])).values()];

  await db.transaction(async (transaction) => {
    for (const [i, [type, currency, amount, cost, daysAgo, time, description, giver, receiver, company, category]] of ROWS.entries()) {
      const operator = byOffice[i % byOffice.length];
      // Local (Ashgabat, UTC+5) date and time, stored as the matching instant.
      const [h, m] = time.split(":").map(Number);
      const local = new Date(Date.now() + 5 * 3600 * 1000);
      const when = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - daysAgo, h - 5, m));
      const income = type === "INCOME";
      await db.query(
        `INSERT INTO tbl_total_calculations
           (guid, category_guid, datetime, receiver_opr_guid, office_guid, status, net_price, sale_price, currency, profit,
            credit_price, is_manual, type, source, description, giver, receiver, company,
            sale_price_usd, credit_usd, net_price_usd, profit_usd, "createdAt", "updatedAt")
         VALUES (:guid, :category, :when, :operator, :office, NULL, :net, :sale, :currency, :profit,
            0, TRUE, :type, 'MANUAL', :description, :giver, :receiver, :company, 0, 0, 0, 0, :when, :when)`,
        {
          transaction,
          replacements: {
            guid: `de330000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
            category: categoryGuid.get(category) || null,
            when,
            operator: operator.guid,
            office: operator.office_guid,
            // As the page saves them: an expense is its cost; an income is the sale amount,
            // with the cost and the profit only when a cost was entered.
            net: income ? cost : amount,
            sale: income ? amount : 0,
            profit: income && cost > 0 ? amount - cost : 0,
            currency,
            type,
            description,
            giver,
            receiver,
            company: company || null,
          },
        },
      );
    }
  });
  const [row] = await db.query(`SELECT COUNT(*)::int n, COUNT(DISTINCT office_guid)::int offices, COUNT(*) FILTER (WHERE currency='USD')::int usd, COUNT(*) FILTER (WHERE type='INCOME')::int income FROM tbl_total_calculations WHERE guid BETWEEN :first AND :last`, { type: QueryTypes.SELECT, replacements: { first: FIRST, last: LAST } });
  console.log("demo office-cash rows:", JSON.stringify(row));
})().catch((e) => { console.error("FAILED:", e.message); process.exitCode = 1; }).finally(() => db.close());
