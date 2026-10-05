/*
 * Realistic demo data for the Turkish Airlines, B2B, Visa and Translation
 * modules, with their payments, plus monthly salary rows for the cash flow.
 *
 * Module rows go into their own tables, so the existing DB triggers build the
 * cash flow (tbl_total_calculations) exactly as the app does. Turkish
 * Airlines has no such trigger, so its sales stay out of the cash flow and
 * the dashboards, like real THY sales today.
 *
 * Everything is tagged so it can be removed in one go:
 *   module and payment rows   note starts with "[DEMO]"
 *   clients                   passport_number starts with "DM"
 *   salary cash-flow rows     import_key starts with "DEMO-"
 *
 *   node scripts/seed-demo-data.js            dry run: reads the DB, prints the plan, writes nothing
 *   node scripts/seed-demo-data.js --apply    inserts everything (one transaction)
 *   node scripts/seed-demo-data.js --cleanup  deletes every tagged row (one transaction)
 *
 * Uses the app's DB settings from .env (LOCAL_* when NODE_ENV=development).
 */
require('dotenv').config({ quiet: true });
const crypto = require('crypto');
const { Client } = require('pg');

const DEMO_NOTE = '[DEMO]';
const DEMO_PASSPORT = 'DM';
const DEMO_KEY = 'DEMO-';
const MONTHS_BACK = 12; // plus the current month
const CLIENT_COUNT = 160;
const BATCH_SIZE = 300;

const TSTATUS = {
  SALE: '70680c18-670e-4b22-a325-4a72fc1f69e6',
  REISSUE: '23f7253b-42b4-4abe-97a6-54cc80d28fc8',
  REFUND: '22f0d634-5798-4e5b-9d2b-34b94ec36fbf',
};
const SALARY_CATEGORY = 'e1000000-0000-0000-0000-000000000012';
const VISA_STATUS = { PROCESS: 1, DONE: 2, FAIL: 3 };

// Busier in summer and before New Year, quiet in January.
const SEASON = [0.7, 0.8, 0.95, 1.0, 1.1, 1.3, 1.45, 1.4, 1.1, 1.0, 0.95, 1.15];

const MALE = ['Merdan', 'Döwlet', 'Serdar', 'Batyr', 'Rahman', 'Aman', 'Begenç', 'Kerim', 'Nury', 'Myrat',
  'Azat', 'Maksat', 'Döwran', 'Baýram', 'Arslan', 'Ýusup', 'Gurban', 'Perhat', 'Eziz', 'Şatlyk'];
const FEMALE = ['Aýna', 'Bahar', 'Gülälek', 'Jemal', 'Maýsa', 'Ogulgerek', 'Selbi', 'Sona', 'Ýazgül', 'Mähri',
  'Aýgül', 'Enejan', 'Leýli', 'Nurjahan', 'Dünýä', 'Läle', 'Gülşat', 'Aýsoltan'];
const SURNAMES = ['Annaýew', 'Berdiýew', 'Hojaýew', 'Orazow', 'Gurbanow', 'Myradow', 'Saparow', 'Allaberdiýew',
  'Ataýew', 'Çaryýew', 'Nurmuhammedow', 'Durdyýew', 'Rejepow', 'Ylýasow', 'Amanow', 'Kakalyýew', 'Öwezow'];

// Ashgabat (ASB) is the origin of every ticket.
const B2B_INTL = [
  { airline: 'Turkmenistan Airlines', to: ['IST', 'DXB', 'MOW', 'KZN', 'BKK', 'DEL', 'PEK', 'MIN', 'FRA', 'LHR'] },
  { airline: 'Pegasus', to: ['SAW'] },
  { airline: 'flydubai', to: ['DXB'] },
  { airline: 'S7 Airlines', to: ['OVB', 'DME'] },
  { airline: 'Uzbekistan Airways', to: ['TAS'] },
  { airline: 'China Southern', to: ['URC', 'CAN'] },
];
const B2B_DOMESTIC = ['MYP', 'TAZ', 'KRW', 'CRZ', 'BKN']; // Mary, Daşoguz, Türkmenbaşy, Türkmenabat, Balkanabat
const THY_TO = ['IST', 'IST-FRA', 'IST-LHR', 'IST-CDG', 'IST-AMS', 'IST-JFK', 'IST-MUC', 'IST-BCN', 'IST-DXB', 'IST-CAI'];
const LANG_PAIRS = ['RU-TKM', 'TKM-RU', 'EN-TKM', 'TKM-EN', 'TR-TKM', 'TKM-TR', 'DE-TKM', 'TKM-ZH'];

// Deterministic PRNG: a re-run after --cleanup gives the same figures.
let seed = 20261001;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const between = (min, max) => min + (max - min) * rand();
const int = (min, max) => Math.floor(between(min, max + 1));
const pick = (list) => list[Math.floor(rand() * list.length)];
const money = (v) => Math.round(v * 100) / 100;
const roundTo = (v, step) => Math.max(step, Math.round(v / step) * step);
const countAround = (mean) => {
  let n = Math.floor(mean);
  if (rand() < mean - n) n += 1;
  if (n > 0 && rand() < 0.25) n += rand() < 0.5 ? -1 : 1;
  return Math.max(0, n);
};
const pnr = () => Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPRSTUVWXYZ23456789'[int(0, 29)]).join('');
const digits = (n) => Array.from({ length: n }, () => int(0, 9)).join('');
const dateOnly = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const timeOf = (d) => d.toTimeString().slice(0, 8);
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
const uuid = () => crypto.randomUUID();
const note = (text) => (text ? `${DEMO_NOTE} ${text}` : DEMO_NOTE);

// Paid in full / part paid / not paid yet; recent sales are paid less often.
const paymentPlan = (ageDays) => {
  const r = rand();
  const fullShare = ageDays < 7 ? 0.45 : ageDays < 30 ? 0.7 : 0.86;
  if (r < fullShare) return 'full';
  if (r < fullShare + (1 - fullShare) * 0.55) return 'part';
  return 'none';
};

const dbConfig = () => {
  const dev = process.env.NODE_ENV === 'development';
  const env = (name) => process.env[`${dev ? 'LOCAL' : 'REMOTE'}_DB_${name}`];
  return { host: env('HOST'), port: Number(env('PORT')), user: env('USERNAME'), password: env('PASSWORD'), database: env('NAME') };
};

function buildData({ offices, employeesByOffice, translators, visaIndexStart }) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - MONTHS_BACK, 1);
  const data = {
    tbl_clients: [], tbl_b2b: [], tbl_ticket_payments: [], tbl_turkish_airlines: [], tbl_turkish_payments: [],
    tbl_visa: [], tbl_visa_payments: [], tbl_general_translations: [], tbl_trans_payments: [], tbl_total_calculations: [],
  };

  const stamp = (d) => ({ createdAt: d, updatedAt: d });

  for (let i = 0; i < CLIENT_COUNT; i++) {
    const female = rand() < 0.42;
    const surname = pick(SURNAMES);
    const born = new Date(int(1958, 2006), int(0, 11), int(1, 28));
    data.tbl_clients.push({
      guid: uuid(),
      fullName: `${surname}${female ? 'a' : ''} ${pick(female ? FEMALE : MALE)}`,
      passport_number: `${DEMO_PASSPORT}${digits(7)}`,
      dateOfBirth: dateOnly(born),
      gender: female ? 'Female' : 'Male',
      passport_count: 1,
      vip: rand() < 0.05,
      ...stamp(start),
    });
  }

  const officeWeights = offices.map((_, i) => 1 / (i + 1)); // the first office is the busiest
  const weightSum = officeWeights.reduce((a, b) => a + b, 0);
  const pickOffice = () => {
    let r = rand() * weightSum;
    for (let i = 0; i < offices.length; i++) {
      r -= officeWeights[i];
      if (r <= 0) return offices[i];
    }
    return offices[offices.length - 1];
  };
  const sale = (day) => {
    const office = pickOffice();
    const at = new Date(day);
    at.setHours(int(9, 18), int(0, 59), int(0, 59), 0);
    return { office, opr: pick(employeesByOffice.get(office.guid)), client: pick(data.tbl_clients), at };
  };
  // Payments for `total`; one or two instalments after the sale date.
  const payments = (plan, total, at, opr, make) => {
    if (plan === 'none' || total <= 0) return;
    const paid = plan === 'full' ? total : money(total * between(0.3, 0.8));
    const parts = plan === 'full' && rand() < 0.25 ? [money(paid * 0.5), money(paid - money(paid * 0.5))] : [paid];
    parts.forEach((amount, i) => {
      const date = addDays(at, i === 0 ? int(0, 1) : int(5, 20));
      make({ guid: uuid(), amount, payment_date: date > new Date() ? at : date, opr_guid: opr, note: note(), ...stamp(date > new Date() ? at : date) });
    });
  };

  let visaIndex = visaIndexStart;
  for (let day = new Date(start); day <= now; day = addDays(day, 1)) {
    if (day.getDay() === 0) continue; // closed on Sunday
    const monthsAgo = (now.getFullYear() - day.getFullYear()) * 12 + now.getMonth() - day.getMonth();
    const factor = SEASON[day.getMonth()] * (1 - monthsAgo * 0.012) * (day.getDay() === 6 ? 0.6 : 1);
    const ageDays = Math.floor((now - day) / 86400000);

    // B2B: international in USD, domestic Turkmenistan Airlines in TMT.
    for (let i = countAround(2.6 * factor); i > 0; i--) {
      const s = sale(day);
      if (s.at > now) continue;
      const domestic = rand() < 0.18;
      const carrier = domestic ? { airline: 'Turkmenistan Airlines', to: B2B_DOMESTIC } : pick(B2B_INTL);
      const roundTrip = rand() < 0.55;
      const route = `ASB-${pick(carrier.to)}${roundTrip ? '-ASB' : ''}`;
      const business = !domestic && rand() < 0.08;
      const pax = rand() < 0.75 ? 1 : int(2, 4);
      const each = domestic ? roundTo(between(110, 260), 5) : roundTo(between(220, 820) * (roundTrip ? 1.7 : 1) * (business ? 2.6 : 1), 5);
      const salePrice = each * pax;
      const markup = domestic ? roundTo(between(10, 30), 5) * pax : roundTo(between(18, 65), 1) * pax;
      const status = rand() < 0.04 ? 'REFUND' : rand() < 0.09 ? 'REISSUE' : 'SALE';
      const plan = status === 'REFUND' ? 'full' : paymentPlan(ageDays);
      const guid = uuid();
      data.tbl_b2b.push({
        guid, datetime: s.at, assignment_opr_guid: s.opr, receiver_opr_guid: s.opr, client_guid: s.client.guid,
        passport_count: pax, status_guid: TSTATUS[status], airline: carrier.airline, pnr: pnr(), route,
        class: business ? 'BUSINESS' : 'ECO', travel_type: roundTrip ? 1 : 0,
        flight_date: dateOnly(addDays(s.at, int(3, 60))), net_price: salePrice - markup, sale_price: salePrice,
        currency: domestic ? 'TMT' : 'USD', profit: markup, card: `**${digits(4)}`, note: note(),
        is_paid: plan === 'full', ...stamp(s.at),
      });
      payments(plan, salePrice, s.at, s.opr, (p) => data.tbl_ticket_payments.push({ ...p, b2b_guid: guid }));
    }

    // Turkish Airlines: USD, cash accepted and change given on the spot.
    for (let i = countAround(4.2 * factor); i > 0; i--) {
      const s = sale(day);
      if (s.at > now) continue;
      const roundTrip = rand() < 0.6;
      const business = rand() < 0.07;
      const total = roundTo(between(320, 980) * (roundTrip ? 1.65 : 1) * (business ? 2.8 : 1), 1);
      const status = rand() < 0.04 ? 'REFUND' : rand() < 0.08 ? 'REISSUE' : 'SALE';
      const plan = status === 'REFUND' ? 'full' : paymentPlan(ageDays);
      const paid = plan === 'full';
      const accepted = paid ? (rand() < 0.5 ? Math.ceil(total / 50) * 50 : total) : 0;
      const guid = uuid();
      data.tbl_turkish_airlines.push({
        guid, datetime: s.at, assignment_opr_guid: s.opr, receiver_opr_guid: s.opr, client_guid: s.client.guid,
        milesSmiles: rand() < 0.35 ? `TK${digits(9)}` : '', status_guid: TSTATUS[status], pnr: pnr(),
        ticket_number: `235${digits(10)}`, passport_count: 1, route: `ASB-${pick(THY_TO)}${roundTrip ? '-ASB' : ''}`,
        class: business ? 'Business' : 'Economy', flight_date: dateOnly(addDays(s.at, int(3, 75))),
        total_price: total, base_fare: roundTo(total * between(0.45, 0.62), 1), quoted_price: total,
        accepted_price: accepted, returned_price: paid ? total - accepted : 0, currency: 'USD',
        office_guid: s.office.guid, note: note(), is_paid: paid, ...stamp(s.at),
      });
      payments(plan, total, s.at, s.opr, (p) => data.tbl_turkish_payments.push({ ...p, turkish_airline_guid: guid }));
    }

    // Visa: TMT consular part, USD service fee, or both; no cost side.
    for (let i = countAround(2.4 * factor); i > 0; i--) {
      const s = sale(day);
      if (s.at > now) continue;
      const kind = rand();
      const pax = rand() < 0.7 ? 1 : int(2, 4);
      const tmt = kind < 0.75 ? roundTo(between(180, 650), 10) * pax : 0;
      const usd = kind > 0.45 ? roundTo(between(50, 260), 5) * pax : 0;
      const status = ageDays < 20 && rand() < 0.7 ? VISA_STATUS.PROCESS : rand() < 0.05 ? VISA_STATUS.FAIL : VISA_STATUS.DONE;
      const plan = paymentPlan(ageDays);
      const guid = uuid();
      visaIndex += 1;
      data.tbl_visa.push({
        guid, index_number: String(visaIndex), datetime: s.at, passport_count: pax, client_guid: s.client.guid,
        receiver_opr_guid: s.opr, status, price_tmt: tmt, price_usd: usd, is_paid: plan === 'full', note: note(), ...stamp(s.at),
      });
      payments(plan, tmt, s.at, s.opr, (p) => data.tbl_visa_payments.push({ ...p, visa_guid: guid, currency: 'TMT' }));
      payments(plan, usd, s.at, s.opr, (p) => data.tbl_visa_payments.push({ ...p, visa_guid: guid, currency: 'USD' }));
    }

    // Translation: priced per page in TMT; the translator gets ~45%.
    for (let i = countAround(4 * factor); i > 0; i--) {
      const s = sale(day);
      if (s.at > now) continue;
      const pages = rand() < 0.6 ? int(1, 5) : int(6, 24);
      const urgent = rand() < 0.22;
      const refunded = rand() < 0.03;
      const price = roundTo(pages * between(30, 55) * (urgent ? 1.5 : 1), 5);
      const expense = refunded ? 0 : roundTo(price * between(0.4, 0.5), 5);
      const done = ageDays >= (urgent ? 0 : 2) && !refunded;
      const doneAt = addDays(s.at, urgent ? 0 : int(1, 4));
      const plan = refunded ? 'none' : paymentPlan(ageDays);
      const guid = uuid();
      data.tbl_general_translations.push({
        guid, received_day: dateOnly(s.at), received_time: timeOf(s.at), opr_guid: s.opr, page_count: pages,
        client_guid: s.client.guid, source_to_target: pick(LANG_PAIRS), status: refunded ? '0' : urgent ? 'true' : 'false',
        completed_page_count: done ? pages : null, completed_day: done ? dateOnly(doneAt) : null,
        completed_time: done ? `${String(int(10, 18)).padStart(2, '0')}:${String(int(0, 59)).padStart(2, '0')}:00` : null,
        translator_guid: translators.length ? pick(translators) : null, correction_status: 'Dogry',
        price, expense_price: expense, profit: price - expense, is_paid: plan === 'full', note: note(), ...stamp(s.at),
      });
      payments(plan, price, s.at, s.opr, (p) => data.tbl_trans_payments.push({ ...p, translation_guid: guid }));
    }
  }

  // Month-end salary rows per office (TMT) and a USD bonus in some months,
  // the same rows the salary month lock writes. This month is not locked yet.
  for (let m = MONTHS_BACK; m >= 1; m--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const lockDay = new Date(now.getFullYear(), now.getMonth() - m + 1, 1, 10, 0, 0);
    if (lockDay > now) continue;
    const monthKey = dateOnly(monthStart).slice(0, 7);
    for (const office of offices) {
      const staff = employeesByOffice.get(office.guid);
      const row = (currency, amount, description) => ({
        guid: uuid(), category_guid: SALARY_CATEGORY, datetime: lockDay, receiver_opr_guid: staff[0],
        office_guid: office.guid, status: null, net_price: amount, sale_price: 0, currency, profit: 0,
        credit_price: 0, sale_price_usd: 0, credit_usd: 0, is_manual: false, source: 'PROJECT',
        description: `${DEMO_NOTE} ${description}`, import_key: `${DEMO_KEY}${uuid()}`, ...stamp(lockDay),
      });
      data.tbl_total_calculations.push(row('TMT', roundTo(staff.length * between(3600, 5400), 10), `${monthKey} aýlygy`));
      if (rand() < 0.4) data.tbl_total_calculations.push(row('USD', roundTo(between(150, 900), 50), `${monthKey} bonus (USD)`));
    }
  }

  return data;
}

// Insert order: parents before the payments that point at them.
const INSERT_ORDER = [
  'tbl_clients', 'tbl_b2b', 'tbl_ticket_payments', 'tbl_turkish_airlines', 'tbl_turkish_payments',
  'tbl_visa', 'tbl_visa_payments', 'tbl_general_translations', 'tbl_trans_payments', 'tbl_total_calculations',
];

async function insertAll(client, data) {
  for (const table of INSERT_ORDER) {
    const rows = data[table];
    if (!rows.length) continue;
    const columns = Object.keys(rows[0]);
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const values = [];
      const tuples = batch.map((row, r) =>
        `(${columns.map((col, k) => { values.push(row[col]); return `$${r * columns.length + k + 1}`; }).join(', ')})`);
      await client.query(
        `INSERT INTO "${table}" (${columns.map((c) => `"${c}"`).join(', ')}) VALUES ${tuples.join(', ')}`,
        values,
      );
    }
    console.log(`  ${table.padEnd(26)} ${rows.length}`);
  }
}

async function cleanup(client) {
  const steps = [
    ['tbl_ticket_payments', `note LIKE $1`, `${DEMO_NOTE}%`],
    ['tbl_turkish_payments', `note LIKE $1`, `${DEMO_NOTE}%`],
    ['tbl_visa_payments', `note LIKE $1`, `${DEMO_NOTE}%`],
    ['tbl_trans_payments', `note LIKE $1`, `${DEMO_NOTE}%`],
    ['tbl_b2b', `note LIKE $1`, `${DEMO_NOTE}%`],
    ['tbl_turkish_airlines', `note LIKE $1`, `${DEMO_NOTE}%`],
    ['tbl_visa', `note LIKE $1`, `${DEMO_NOTE}%`],
    ['tbl_general_translations', `note LIKE $1`, `${DEMO_NOTE}%`],
    ['tbl_total_calculations', `import_key LIKE $1`, `${DEMO_KEY}%`],
  ];
  for (const [table, where, value] of steps) {
    const res = await client.query(`DELETE FROM "${table}" WHERE ${where}`, [value]);
    console.log(`  ${table.padEnd(26)} -${res.rowCount}`);
  }
  // A demo client someone has since attached a real record to is kept.
  await client.query('SAVEPOINT clients');
  try {
    const res = await client.query(`DELETE FROM tbl_clients WHERE passport_number LIKE $1`, [`${DEMO_PASSPORT}%`]);
    console.log(`  ${'tbl_clients'.padEnd(26)} -${res.rowCount}`);
  } catch (err) {
    await client.query('ROLLBACK TO SAVEPOINT clients');
    console.log(`  tbl_clients kept: still referenced (${err.message})`);
  }
}

function summarize(data) {
  const sum = (rows, f) => Math.round(rows.reduce((a, r) => a + Number(f(r) || 0), 0)).toLocaleString('en-US');
  const n = (t) => String(data[t].length).padStart(6);
  console.log('\n                            rows   sales');
  console.log(`  clients                 ${n('tbl_clients')}`);
  console.log(`  B2B                     ${n('tbl_b2b')}   USD ${sum(data.tbl_b2b.filter((r) => r.currency === 'USD'), (r) => r.sale_price)} · TMT ${sum(data.tbl_b2b.filter((r) => r.currency === 'TMT'), (r) => r.sale_price)}`);
  console.log(`    payments              ${n('tbl_ticket_payments')}`);
  console.log(`  Turkish Airlines        ${n('tbl_turkish_airlines')}   USD ${sum(data.tbl_turkish_airlines, (r) => r.total_price)}`);
  console.log(`    payments              ${n('tbl_turkish_payments')}`);
  console.log(`  Visa                    ${n('tbl_visa')}   TMT ${sum(data.tbl_visa, (r) => r.price_tmt)} · USD ${sum(data.tbl_visa, (r) => r.price_usd)}`);
  console.log(`    payments              ${n('tbl_visa_payments')}`);
  console.log(`  Translation             ${n('tbl_general_translations')}   TMT ${sum(data.tbl_general_translations, (r) => r.price)}`);
  console.log(`    payments              ${n('tbl_trans_payments')}`);
  const salary = data.tbl_total_calculations;
  console.log(`  Salary (cash flow)      ${n('tbl_total_calculations')}   TMT ${sum(salary.filter((r) => r.currency === 'TMT'), (r) => r.net_price)} · USD ${sum(salary.filter((r) => r.currency === 'USD'), (r) => r.net_price)}\n`);
}

async function main() {
  const mode = process.argv.includes('--apply') ? 'apply' : process.argv.includes('--cleanup') ? 'cleanup' : 'dry-run';
  const config = dbConfig();
  console.log(`Mode: ${mode}  ·  DB: ${config.database} @ ${config.host}`);

  const client = new Client(config);
  await client.connect();
  try {
    const tagged = (
      await client.query(
        `SELECT (SELECT count(*) FROM tbl_b2b WHERE note LIKE $1)
              + (SELECT count(*) FROM tbl_visa WHERE note LIKE $1)
              + (SELECT count(*) FROM tbl_general_translations WHERE note LIKE $1)
              + (SELECT count(*) FROM tbl_turkish_airlines WHERE note LIKE $1)
              + (SELECT count(*) FROM tbl_total_calculations WHERE import_key LIKE $2) AS n`,
        [`${DEMO_NOTE}%`, `${DEMO_KEY}%`],
      )
    ).rows[0].n;
    console.log(`Tagged demo rows already present: ${tagged}`);

    if (mode === 'cleanup') {
      await client.query('BEGIN');
      try {
        await cleanup(client);
        await client.query('COMMIT');
        console.log('Demo data removed.');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
      return;
    }
    if (mode === 'apply' && Number(tagged) > 0) {
      console.log('Demo data is already there — run --cleanup first so nothing is doubled.');
      process.exitCode = 1;
      return;
    }

    const offices = (await client.query(`SELECT guid FROM tbl_offices ORDER BY "createdAt"`)).rows;
    const employees = (
      await client.query(`SELECT guid, office_guid FROM tbl_employees WHERE is_active = TRUE AND office_guid IS NOT NULL`)
    ).rows;
    const employeesByOffice = new Map();
    employees.forEach((e) => {
      if (!employeesByOffice.has(e.office_guid)) employeesByOffice.set(e.office_guid, []);
      employeesByOffice.get(e.office_guid).push(e.guid);
    });
    const staffed = offices.filter((o) => employeesByOffice.has(o.guid));
    const translators = (await client.query(`SELECT guid FROM tbl_translator`)).rows.map((r) => r.guid);
    const visaIndexStart = Number(
      (await client.query(`SELECT COALESCE(max(NULLIF(regexp_replace(index_number, '\\D', '', 'g'), '')::bigint), 0) AS mx FROM tbl_visa`)).rows[0].mx,
    );
    console.log(`Offices with active employees: ${staffed.length} / ${offices.length} · employees: ${employees.length} · translators: ${translators.length}`);
    if (!staffed.length) throw new Error('No office has an active employee to book the demo sales to.');

    const data = buildData({ offices: staffed, employeesByOffice, translators, visaIndexStart });
    summarize(data);

    if (mode === 'dry-run') {
      console.log('Dry run — nothing written. Re-run with --apply to insert.');
      return;
    }

    await client.query('BEGIN');
    try {
      await insertAll(client, data);
      await client.query('COMMIT');
      console.log('Demo data inserted. Remove it with --cleanup.');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
