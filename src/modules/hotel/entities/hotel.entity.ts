import { Table, Model, DataType, Column, BeforeSave, BeforeUpdate, BelongsTo, HasMany } from "sequelize-typescript";
import { Employee } from "../../employee/entities/employee.entity";
import { Client } from "../../client/entities/client.entity";
import { HarPayment } from "../../har_payment/entities/har_payment.entity";

@Table({
  tableName: 'tbl_hotel',
  timestamps: true
})

export class Hotel extends Model<Hotel> {
  @Column({
    primaryKey: true,
    allowNull: false,
    defaultValue: DataType.UUIDV4,
    type: DataType.UUID
  })
  declare guid: string;

  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    allowNull: false,
    unique: true
  })
  declare index_number: number;

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  declare application_date: Date;

  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  declare opr_guid: string;

  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  declare client_guid: string;

  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  declare prepared_opr_guid: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare destination_country: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare hotel_name: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare room_type: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare meal_plan: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  declare guests_count: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  })
  declare cost: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  })
  declare price: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  })
  declare profit: number;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare system: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  declare note?: string;

  @BelongsTo(() => Employee, {
    foreignKey: 'opr_guid',
    targetKey: 'guid'
  })
  declare operator: Employee;

  @BelongsTo(() => Client, {
    foreignKey: 'client_guid',
    targetKey: 'guid'
  })
  declare client: Client;

  @BelongsTo(() => Employee, {
    foreignKey: 'prepared_opr_guid',
    targetKey: 'guid'
  })
  declare preparedOpr: Employee;

  @HasMany(() => HarPayment, {
    sourceKey: 'guid',
    foreignKey: 'hotel_guid',
  })
  declare harPaymentOpr: HarPayment[];

  @BeforeSave
  @BeforeUpdate
  static calculateProfit(instance: Hotel) {
    const cost = Number(instance.cost) || 0;
    const price = Number(instance.price) || 0;
    instance.profit = price - cost;
  }
}
