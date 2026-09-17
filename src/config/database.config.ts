import { Cafeteria } from '../modules/cafeteria/entities/cafeteria.entity';
import { Salary } from '../modules/salary/entities/salary.entity';
import { SalaryMonth } from '../modules/salary/entities/salary-month.entity';
import { SequelizeModuleOptions } from '@nestjs/sequelize';
import { Dialect } from 'sequelize';
import { User } from '../modules/user/entities/user.entity';
import { Department } from '../modules/department/entities/department.entity';
import { Office } from '../modules/office/entities/office.entity';
import { Position } from '../modules/position/entities/position.entity';
import { Employee } from '../modules/employee/entities/employee.entity';
import { Client } from '../modules/client/entities/client.entity';
import { B2b } from '../modules/b2b/entities/b2b.entity';
import { Tstatus } from '../modules/tstatus/entities/tstatus.entity';
import { TurkishAirline } from '../modules/turkish_airlines/entities/turkish_airline.entity';
import { TicketPayment } from '../modules/ticket_payment/entities/ticket_payment.entity';
import { Visa } from '../modules/visa/entities/visa.entity';
import { TurkishPayment } from '../modules/turkish_payment/entities/turkish_payment.entity';
import { VisaPayment } from '../modules/visa_payment/entities/visa_payment.entity';
import { RefferalLetter } from '../modules/refferal_letter/entities/refferal_letter.entity';
import { GeneralTranslation } from '../modules/general_translation/entities/general_translation.entity';
import { Translator } from '../modules/translator/entities/translator.entity';
import { TransPayment } from '../modules/trans_payment/entities/trans_payment.entity';
import { Hotel } from '../modules/hotel/entities/hotel.entity';
import { Airway } from '../modules/airway/entities/airway.entity';
import { Railway } from '../modules/railway/entities/railway.entity';
import { Tour } from '../modules/tour/entities/tour.entity';
import { Transfer } from '../modules/transfer/entities/transfer.entity';
import { Package } from '../modules/package/entities/package.entity';
import { HarPayment } from '../modules/har_payment/entities/har_payment.entity';
import { TtpPayment } from '../modules/ttp_payment/entities/ttp_payment.entity';
import { Inbound } from '../modules/inbound/entities/inbound.entity';
import { Message } from '../modules/messages/entities/message.entity';
import { TaskAssignee } from '../modules/messages/entities/task_assignees.entity';
import { Report } from '../modules/report/entities/report.entity';
import { Country } from '../modules/country/entities/country.entity';
import { Receiving } from '../modules/receiving/entities/receiving.entity';
import { CustomField } from '../modules/custom_field/entities/custom_field.entity';
import { VisaDoc } from '../modules/visa_doc/entities/visa_doc.entity';
import { DocDetails } from '../modules/visa_doc/entities/doc_details.entity';
import { UserDetail } from '../modules/user_datails/entities/user_datail.entity';
import { TotalCalculation } from '../modules/total_calculations/entities/total_calculation.entity';
import { Category } from '../modules/category/entities/category.entity';

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
    models: [Department, Office, Position, Employee, Client, User, Tstatus, B2b, TurkishAirline, TicketPayment, Visa, TurkishPayment, VisaPayment, RefferalLetter, Translator, GeneralTranslation, TransPayment, Hotel, Airway, Railway, Tour, Transfer,
      Package, HarPayment, TtpPayment, Inbound, Message, TaskAssignee, Report, CustomField, Country, Receiving, VisaDoc, DocDetails, UserDetail, Cafeteria, TotalCalculation, Category, Salary, SalaryMonth]
  };
};

// npx sequelize-cli migration:generate --name dsdsds