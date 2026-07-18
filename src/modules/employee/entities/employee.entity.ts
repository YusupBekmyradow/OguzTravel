import { Model, BelongsTo, Column, DataType, Table, HasMany } from "sequelize-typescript";
import { Office } from "../../office/entities/office.entity";
import { Position } from "../../position/entities/position.entity";
import { Department } from "../../department/entities/department.entity";
import { User } from "../../user/entities/user.entity";
import { B2b } from "../../b2b/entities/b2b.entity";
import { TurkishAirline } from "../../turkish_airlines/entities/turkish_airline.entity";
import { TicketPayment } from "../../ticket_payment/entities/ticket_payment.entity";
import { TurkishPayment } from "../../turkish_payment/entities/turkish_payment.entity";
import { VisaPayment } from "../../visa_payment/entities/visa_payment.entity";
import { RefferalLetter } from "../../refferal_letter/entities/refferal_letter.entity";
import { GeneralTranslation } from "../../general_translation/entities/general_translation.entity";
import { TransPayment } from "../../trans_payment/entities/trans_payment.entity";

@Table({
  tableName: 'tbl_employees',
  timestamps: true
})

export class Employee extends Model<Employee> {

  @Column({
    primaryKey: true,
    allowNull: false,
    defaultValue: DataType.UUIDV4,
    type: DataType.UUID
  })
  declare guid: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare fullName: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare phone_number: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    unique: true
  })
  declare gmail?: string;

  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    allowNull: false,
    unique: true
  })
  declare index_number: number;

  @Column({
    type: DataType.JSONB,
    allowNull: true
  })
  declare address: string;

  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  declare office_guid: string;

  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  declare position_guid: string;

  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  declare department_guid: string;

  @BelongsTo(() => Office, {
    targetKey: 'guid',
    foreignKey: 'office_guid'
  })
  declare office: Office;

  @BelongsTo(() => Position, {
    targetKey: 'guid',
    foreignKey: 'position_guid'
  })
  declare position: Position;

  @BelongsTo(() => Department, {
    targetKey: 'guid',
    foreignKey: 'department_guid'
  })
  declare department: Department;

  @HasMany(() => User, {
    foreignKey: 'employee_guid',
    sourceKey: 'guid',
  })
  declare user: User[];

  @HasMany(() => B2b, {
    foreignKey: 'assignment_opr_guid',
    sourceKey: 'guid',
    as: 'assignment_operator'
  })
  declare b2bOperator: B2b[];

  @HasMany(() => B2b, {
    foreignKey: 'receiver_opr_guid',
    sourceKey: 'guid',
    as: 'receiver_operator'
  })
  declare b2bRecipient: B2b[];

  @HasMany(() => TurkishAirline, {
    foreignKey: 'assignment_opr_guid',
    sourceKey: 'guid',
    as: 'ta_assignment_operator'
  })
  declare airlineOperator: TurkishAirline[];

  @HasMany(() => TurkishAirline, {
    foreignKey: 'receiver_opr_guid',
    sourceKey: 'guid',
    as: 'ta_receiver_operator'
  })
  declare airlineRecipient: TurkishAirline[];

  @HasMany(() => TicketPayment, {
    foreignKey: 'opr_guid',
    sourceKey: 'guid',
    as: 'ticketPayments'
  })
  declare paymentOpr: TicketPayment[];

  @HasMany(() => TurkishPayment, {
    foreignKey: 'opr_guid',
    sourceKey: 'guid',
    as: 'turkishPayments'
  })
  declare turkpaymentOpr: TurkishPayment[];

  @HasMany(() => RefferalLetter, {
    foreignKey: 'received_opr_guid',
    sourceKey: 'guid',
    as: 'refferaloperator'
  })
  declare refferalLetter: RefferalLetter[];

  @HasMany(() => VisaPayment, {
    foreignKey: 'opr_guid',
    sourceKey: 'guid',
    as: 'visaPayments'
  })
  declare visaPayment: VisaPayment[];

  @HasMany(() => GeneralTranslation, {
    foreignKey: 'opr_guid',
    sourceKey: 'guid',
    as: 'generalTranslation'
  })
  declare generalTranslation: GeneralTranslation[];

  @HasMany(() => TransPayment, {
    foreignKey: 'opr_guid',
    sourceKey: 'guid',
    as: 'transPayments'
  })
  declare transPaymentOpr: TransPayment[];
}
