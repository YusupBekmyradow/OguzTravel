require('dotenv').config();

const isDev = process.env.NODE_ENV === 'development';

module.exports = {
  development: {
    dialect: process.env.LOCAL_DB_DIALECT,
    host: process.env.LOCAL_DB_HOST,
    port: process.env.LOCAL_DB_PORT,
    username: process.env.LOCAL_DB_USERNAME,
    password: process.env.LOCAL_DB_PASSWORD,
    database: process.env.LOCAL_DB_NAME,
  },
  production: {
    dialect: process.env.REMOTE_DB_DIALECT,
    host: process.env.REMOTE_DB_HOST,
    port: process.env.REMOTE_DB_PORT,
    username: process.env.REMOTE_DB_USERNAME,
    password: process.env.REMOTE_DB_PASSWORD,
    database: process.env.REMOTE_DB_NAME,
  }
};

/// migration etmek
///            pnpm db:migrate
///            pnpm exec sequelize-cli db:migrate --to 20261010000001-create-tbl-offices.ts
/// yza almak
///            pnpm db:migrate:undo:all            hemmesi
///            pnpm exec sequelize-cli db:migrate:undo --to 20261010000016-create-tbl-employees.ts