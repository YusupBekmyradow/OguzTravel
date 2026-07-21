import { Model, Column, DataType, Table, HasMany, BelongsTo } from "sequelize-typescript";
import { TurkishAirline } from "../../turkish_airlines/entities/turkish_airline.entity";
import { B2b } from "../../b2b/entities/b2b.entity";
import { Employee } from "../../employee/entities/employee.entity";

@Table({
  tableName: 'tbl_ticket_payments',
  timestamps: true
})

export class TicketPayment extends Model<TicketPayment> {
  @Column({
    primaryKey: true,
    allowNull: false,
    defaultValue: DataType.UUIDV4,
    type: DataType.UUID
  })
  declare guid: string;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  })
  declare amount: number;

  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  declare b2b_guid: string;

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  declare payment_date: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  declare note?: string;

  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  declare opr_guid: string;

  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    allowNull: false,
    unique: true
  })
  declare index_number: number;

  @BelongsTo(() => B2b, {
    targetKey: 'guid',
    foreignKey: 'b2b_guid',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL'
  })
  declare b2b: B2b;

  @BelongsTo(() => Employee, {
    targetKey: 'guid',
    foreignKey: 'opr_guid',
    as: 'operator',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL'
  })
  declare operator: Employee;
}
