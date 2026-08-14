import { Model, BelongsTo, Column, DataType, Table } from "sequelize-typescript";
import { Hotel } from "../../hotel/entities/hotel.entity";
import { Employee } from "../../employee/entities/employee.entity";
import { Airway } from "../../airway/entities/airway.entity";
import { Railway } from "../../railway/entities/railway.entity";

@Table({
  tableName: 'tbl_HAR_payments',
  timestamps: true
})

export class HarPayment extends Model<HarPayment> {
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
    allowNull: true
  })
  declare hotel_guid?: string;

  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  declare airway_guid?: string;

  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  declare railway_guid?: string;

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
    allowNull: true
  })
  declare opr_guid: string;

  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    allowNull: false,
    unique: true
  })
  declare index_number: number;

  @BelongsTo(() => Hotel, {
    targetKey: 'guid',
    foreignKey: 'hotel_guid',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL'
  })
  declare hotel: Hotel;

  @BelongsTo(() => Airway, {
    targetKey: 'guid',
    foreignKey: 'airway_guid',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL'
  })
  declare airway: Airway;

  @BelongsTo(() => Railway, {
    targetKey: 'guid',
    foreignKey: 'railway_guid',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL'
  })
  declare railway: Railway;

  @BelongsTo(() => Employee, {
    targetKey: 'guid',
    foreignKey: 'opr_guid',
    as: 'operator',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL'
  })
  declare operator: Employee;
}
