import { Table, Model, Column, DataType, BelongsTo, HasMany, ForeignKey } from "sequelize-typescript";
import { Client } from "../../client/entities/client.entity";
import { Employee } from "../../employee/entities/employee.entity";
import { VisaPayment } from "../../visa_payment/entities/visa_payment.entity";

@Table({
  tableName: 'tbl_visa',
  timestamps: true
})

export class Visa extends Model<Visa> {
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
    unique: true
  })
  declare index_number: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    defaultValue: DataType.NOW
  })
  declare datetime: Date;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    defaultValue: 1
  })
  declare passport_count: number;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: { phone: null, name: null }
  })
  declare agent: {
    name: string,
    phone_number: string
  };

  @ForeignKey(() => Client)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  declare client_guid: string;

  @ForeignKey(() => Employee)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  declare receiver_opr_guid: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 1
  })
  declare status: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    defaultValue: 0
  })
  declare price_tmt: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    defaultValue: 0
  })
  declare price_usd: number;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  })
  declare is_paid: boolean;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  declare note?: string;

  @BelongsTo(() => Client, {
    targetKey: 'guid',
    foreignKey: 'client_guid',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL'
  })
  declare client: Client;

  @BelongsTo(() => Employee, {
    targetKey: 'guid',
    foreignKey: 'receiver_opr_guid',
    as: 'receiveroperator',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL'
  })
  declare receiver_operator: Employee;

  @HasMany(() => VisaPayment, {
    foreignKey: 'visa_guid',
    sourceKey: 'guid'
  })
  declare visaPayments: VisaPayment[];
}
