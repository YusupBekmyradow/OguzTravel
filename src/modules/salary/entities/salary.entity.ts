import { BelongsTo, Column, DataType, Model, Table } from "sequelize-typescript";
import { Employee } from "../../employee/entities/employee.entity";

// One row per employee per month (the "Aýlyk" Excel sheet). total_amount and
// payable_amount are derived in SalaryService — never trust them from clients.
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

  // "YYYY-MM"
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

  // OKLAD
  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false, defaultValue: 0 })
  declare base_salary: number;

  // IŞ GÜN
  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare work_days: number;

  // IŞLÄN
  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare worked_days: number;

  // KART'a geçýäni
  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false, defaultValue: 0 })
  declare card_amount: number;

  // AWANS
  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false, defaultValue: 0 })
  declare advance: number;

  // Kofe KREDIT
  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false, defaultValue: 0 })
  declare cafeteria_credit: number;

  // KARZ
  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false, defaultValue: 0 })
  declare loan: number;

  // Sales the bonus is a share of (percent bonus only)
  @Column({ type: DataType.DECIMAL(14, 2), allowNull: true })
  declare sales_amount?: number | null;

  // Percent of sales_amount; null means BONUS is a fixed amount
  @Column({ type: DataType.DECIMAL(5, 2), allowNull: true })
  declare bonus_percent?: number | null;

  // BONUS = sales_amount * bonus_percent / 100 when bonus_percent is set
  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false, defaultValue: 0 })
  declare bonus: number;

  // JEMI = base_salary * worked_days / work_days + bonus
  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false, defaultValue: 0 })
  declare total_amount: number;

  // BERMELI = total_amount - card_amount - advance - cafeteria_credit - loan
  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false, defaultValue: 0 })
  declare payable_amount: number;

  // BERLEN
  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false, defaultValue: 0 })
  declare paid_amount: number;

  // SENESI
  @Column({ type: DataType.DATEONLY, allowNull: true })
  declare paid_date?: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: 'TMT',
  })
  declare currency: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare note?: string;

  @Column({ type: DataType.UUID, allowNull: true })
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
