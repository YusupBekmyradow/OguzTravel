import { SequelizeModuleOptions } from '@nestjs/sequelize';
import { Dialect } from 'sequelize';
import { User } from '../modules/user/entities/user.entity';
import { Department } from '../modules/department/entities/department.entity';
import { Office } from '../modules/office/entities/office.entity';
import { Position } from '../modules/position/entities/position.entity';
import { Employee } from '../modules/employee/entities/employee.entity';
import { Client } from '../modules/client/entities/client.entity';

export const databaseConfig = (): SequelizeModuleOptions => {
  const isDev = process.env.NODE_ENV === 'development';

  const dialect = (isDev ? process.env.LOCAL_DB_DIALECT : process.env.REMOTE_DB_DIALECT) as Dialect;

  return {
    dialect,
    host: isDev ? process.env.LOCAL_DB_HOST : process.env.REMOTE_DB_HOST,
    port: Number(isDev ? process.env.LOCAL_DB_PORT : process.env.REMOTE_DB_PORT),
    username: isDev ? process.env.LOCAL_DB_USERNAME : process.env.REMOTE_DB_USERNAME,
    password: isDev ? process.env.LOCAL_DB_PASSWORD : process.env.REMOTE_DB_PASSWORD,
    database: isDev ? process.env.LOCAL_DB_NAME : process.env.REMOTE_DB_NAME,
    autoLoadModels: true,
    synchronize: true,
    logging: false,
    models: [ Department, Office, Position, Employee, Client, User]
  };
};
