import { BeforeSave, BeforeUpdate, BelongsTo, Column, DataType, HasMany, Model, Table } from "sequelize-typescript";
import { Employee } from "../../employee/entities/employee.entity";
import { Client } from "../../client/entities/client.entity";
import { Tstatus } from "../../tstatus/entities/tstatus.entity";
import { TicketPayment } from "../../ticket_payment/entities/ticket_payment.entity";

@Table({
  tableName: 'tbl_b2b',
  timestamps: true
})

export class B2b extends Model<B2b> {

  @Column({
    primaryKey: true,
    allowNull: false,
    defaultValue: DataType.UUIDV4,
    type: DataType.UUID
  })
  declare guid: string;

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  declare datetime: Date;

  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  declare assignment_opr_guid: string;

  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  declare receiver_opr_guid: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: { phone: null, name: null }
  })
  declare agent: {
    name: string,
    phone_number: string
  };

  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  declare client_guid: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    defaultValue: 1
  })
  declare passport_count: number;

  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  declare status_guid: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare airline: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare pnr: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare route: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare class: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  declare travel_type: number;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false
  })
  declare flight_date: Date;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  })
  declare net_price: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  })
  declare sale_price: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: 'USD'
  })
  declare currency: string;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false
  })
  declare profit: number;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  declare card: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  declare note?: string;

  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    allowNull: false,
    unique: true
  })
  declare index_number: number;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  })
  declare is_paid: boolean;

  @BelongsTo(() => Employee, {
    targetKey: 'guid',
    foreignKey: 'assignment_opr_guid',
    as: 'assignment_operator',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL'
  })
  declare assignment_operator: Employee;

  @BelongsTo(() => Employee, {
    targetKey: 'guid',
    foreignKey: 'receiver_opr_guid',
    as: 'receiver_operator',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL'
  })
  declare receiver_operator: Employee;

  @BelongsTo(() => Client, {
    targetKey: 'guid',
    foreignKey: 'client_guid',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL'
  })
  declare client: Client;

  @BelongsTo(() => Tstatus, {
    targetKey: 'guid',
    foreignKey: 'status_guid',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL'
  })
  declare tstatus: Tstatus;

  @HasMany(() => TicketPayment, {
    foreignKey: 'b2b_guid',
    sourceKey: 'guid'
  })
  declare ticketPayment: TicketPayment[];
  @BeforeSave
  @BeforeUpdate
  static calculateProfit(instance: B2b) {
    const net = Number(instance.net_price) || 0;
    const sale = Number(instance.sale_price) || 0;
    instance.profit = sale - net;
  }
}