import { Table, Model, Column, DataType, BelongsTo, ForeignKey } from "sequelize-typescript";
import { Visa } from "../../visa/entities/visa.entity";
import { Employee } from "../../employee/entities/employee.entity";

@Table({
  tableName: 'tbl_visa_payments',
  timestamps: true
})

export class VisaPayment extends Model<VisaPayment> {
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
    type: DataType.STRING,
    allowNull: false,
    defaultValue: 'TMT'
  })
  declare currency: string;

  @ForeignKey(() => Visa)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  declare visa_guid: string;

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

  @ForeignKey(() => Employee)
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

  @BelongsTo(() => Visa, {
    targetKey: 'guid',
    foreignKey: 'visa_guid',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL'
  })
  declare visa: Visa;

  @BelongsTo(() => Employee, {
    targetKey: 'guid',
    foreignKey: 'opr_guid',
    as: 'visaoperator',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL'
  })
  declare operator: Employee;
}
