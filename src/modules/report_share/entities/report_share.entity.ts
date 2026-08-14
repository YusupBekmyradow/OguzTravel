import { Model, Column, Table, DataType, BelongsTo } from "sequelize-typescript";
import { Employee } from "../../employee/entities/employee.entity";
import { Report } from "../../report/entities/report.entity";

@Table({
  tableName: 'tbl_report_share',
  timestamps: true,
})
export class ReportShare extends Model<ReportShare> {
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
    type: DataType.DATE,
    allowNull: false
  })
  declare datetime: Date;

  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  declare total_count: number;

  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  declare assignment_opr_guid: string;

  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  declare receiver_opr_guid: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare start_yh_number: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare end_yh_number: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare status: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  declare note?: string;

  @BelongsTo(() => Employee, {
    targetKey: 'guid',
    foreignKey: 'assignment_opr_guid',
    as: 'reportAS_operator',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL'
  })
  declare assignment_operator: Employee;

  @BelongsTo(() => Employee, {
    targetKey: 'guid',
    foreignKey: 'receiver_opr_guid',
    as: 'reportRE_operator',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL'
  })
  declare receiver_operator: Employee;

}
