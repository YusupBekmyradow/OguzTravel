import { BelongsTo, Column, DataType, Model, Table } from "sequelize-typescript";
import { Employee } from "../../employee/entities/employee.entity";
import { Office } from "../../office/entities/office.entity";

@Table({
  tableName: 'tbl_cafeteria',
  timestamps: true,
})
export class Cafeteria extends Model<Cafeteria> {
  @Column({
    primaryKey: true,
    allowNull: false,
    defaultValue: DataType.UUIDV4,
    type: DataType.UUID,
  })
  declare guid: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  declare type: boolean;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  })
  declare amount: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: 'TMT',
  })
  declare currency: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  declare date: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  declare description?: string;

  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    allowNull: false,
    unique: true,
  })
  declare index_number: number;

  @Column({
    type: DataType.UUID,
    allowNull: true,
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

  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  declare office_guid?: string;

  @BelongsTo(() => Office, {
    targetKey: 'guid',
    foreignKey: 'office_guid',
    as: 'office',
    constraints: false,
  })
  declare office?: Office;
}
