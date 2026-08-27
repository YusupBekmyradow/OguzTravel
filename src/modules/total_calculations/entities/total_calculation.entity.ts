import { Model, Column, DataType, Table, BelongsTo } from "sequelize-typescript";
import { Employee } from "../../employee/entities/employee.entity";
import { Office } from "../../office/entities/office.entity";

@Table({
  tableName: 'tbl_total_calculations',
  timestamps: true
})
export class TotalCalculation extends Model<TotalCalculation> {
  @Column({
    primaryKey: true,
    allowNull: false,
    defaultValue: DataType.UUIDV4,
    type: DataType.UUID
  })
  declare guid: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
  })
  declare category: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW
  })
  declare datetime: Date;

  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  declare receiver_opr_guid?: string;

  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  declare office_guid?: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  declare status?: string;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  })
  declare net_price: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: true,
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
    allowNull: true,
    defaultValue: 0
  })
  declare profit: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0
  })
  declare credit_price: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false
  })
  declare is_manual: boolean;

  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    allowNull: false,
    unique: true
  })
  declare index_number: number;

  @BelongsTo(() => Employee, {
    foreignKey: 'receiver_opr_guid',
    targetKey: 'guid',
    as: 'receiver_operator',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL'
  })
  declare receiver_operator?: Employee;

  @BelongsTo(() => Office, {
    foreignKey: 'office_guid',
    targetKey: 'guid',
    as: 'office',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL'
  })
  declare office?: Office;
}