import { BelongsTo, Column, DataType, Model, Table } from "sequelize-typescript";
import { Employee } from "../../employee/entities/employee.entity";

@Table({
  tableName: 'tbl_salary',
  timestamps: true,
  indexes: [{ unique: true, fields: ['employee_guid', 'month'] }],
})
export class Salary extends Model<Salary> {
  @Column({
    primaryKey: true,
    allowNull: false,
    defaultValue: DataType.UUIDV4,
    type: DataType.UUID,
  })
  declare guid: string;

  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    allowNull: false,
    unique: true,
  })
  declare index_number: number;


  @Column({
    type: DataType.STRING(7),
    allowNull: false,
  })
  declare month: string;

  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare employee_guid: string;


  @BelongsTo(() => Employee, {
    targetKey: 'guid',
    foreignKey: 'employee_guid',
    as: 'employee',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  declare employee: Employee;


  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  })
  declare base_salary: number;


  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0
  })
  declare work_days: number;


  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0
  })
  declare worked_days: number;


  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  })
  declare card_amount: number;


  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  })
  declare advance: number;


  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  })
  declare cafeteria_credit: number;


  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  })
  declare loan: number;


  @Column({
    type: DataType.DECIMAL(14, 2),
    allowNull: true
  })
  declare sales_amount?: number | null;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: true
  })
  declare bonus_percent?: number | null;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  })
  declare bonus: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  })
  declare total_amount: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  })
  declare payable_amount: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  })
  declare paid_amount: number;

  @Column({
    type: DataType.DATEONLY,
    allowNull: true
  })
  declare paid_date?: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: 'TMT',
  })
  declare currency: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  declare note?: string;

  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  declare created_by_guid?: string;

  @BelongsTo(() => Employee, {
    targetKey: 'guid',
    foreignKey: 'created_by_guid',
    as: 'createdBy',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL',
  })
  declare createdBy: Employee;
}
