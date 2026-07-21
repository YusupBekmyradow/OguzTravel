import { Model, BelongsTo, Column, DataType, Table } from "sequelize-typescript";
import { Tour } from "../../tour/entities/tour.entity";
import { Transfer } from "../../transfer/entities/transfer.entity";
import { Package } from "../../package/entities/package.entity";
import { Employee } from "../../employee/entities/employee.entity";

@Table({
  tableName: 'tbl_TTP_payments',
  timestamps: true
})

export class TtpPayment extends Model<TtpPayment> {
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
  declare tour_guid?: string;

  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  declare transfer_guid?: string;

  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  declare package_guid?: string;

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

  @BelongsTo(() => Tour, {
    targetKey: 'guid',
    foreignKey: 'tour_guid'
  })
  declare tour: Tour;

  @BelongsTo(() => Transfer, {
    targetKey: 'guid',
    foreignKey: 'transfer_guid'
  })
  declare transfer: Transfer;

  @BelongsTo(() => Package, {
    targetKey: 'guid',
    foreignKey: 'package_guid'
  })
  declare package: Package;

  @BelongsTo(() => Employee, {
    targetKey: 'guid',
    foreignKey: 'opr_guid',
    as: 'operator',
  })
  declare operator: Employee;

}
