import { BelongsTo, Column, DataType, Model, Table } from "sequelize-typescript";
import { Employee } from "../../employee/entities/employee.entity";
import { Office } from "../../office/entities/office.entity";

// Payroll period state per office. A locked (month, office) rejects every
// write to that office's tbl_salary rows for the month.
// (Replaces the earlier month-only tbl_salary_month.)
@Table({
  tableName: 'tbl_salary_period',
  timestamps: true,
  indexes: [{ unique: true, fields: ['month', 'office_guid'] }],
})
export class SalaryMonth extends Model<SalaryMonth> {
  @Column({
    primaryKey: true,
    allowNull: false,
    defaultValue: DataType.UUIDV4,
    type: DataType.UUID,
  })
  declare guid: string;

  // "YYYY-MM"
  @Column({
    type: DataType.STRING(7),
    allowNull: false,
  })
  declare month: string;

  @Column({ type: DataType.UUID, allowNull: false })
  declare office_guid: string;

  @BelongsTo(() => Office, {
    targetKey: 'guid',
    foreignKey: 'office_guid',
    as: 'office',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  declare office: Office;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  declare is_locked: boolean;

  @Column({ type: DataType.DATE, allowNull: true })
  declare locked_at?: Date | null;

  @Column({ type: DataType.UUID, allowNull: true })
  declare locked_by_guid?: string | null;

  @BelongsTo(() => Employee, {
    targetKey: 'guid',
    foreignKey: 'locked_by_guid',
    as: 'lockedBy',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL',
  })
  declare lockedBy: Employee;
}
