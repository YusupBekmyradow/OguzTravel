import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { Employee } from '../../employee/entities/employee.entity';

@Table({
  tableName: 'tbl_departments',
  timestamps: true
})

export class Department extends Model<Department> {

  @Column({
    primaryKey: true,
    allowNull: false,
    defaultValue: DataType.UUIDV4,
    type: DataType.UUID
  })
  declare guid: string;


  @Column({
    type: DataType.JSONB,
    allowNull: false,
  })
  declare name: {
    tk: string;
    ru: string;
    en: string;
  };

  @HasMany(() => Employee, {
    foreignKey: 'department_guid',
    sourceKey: 'guid'
  })
  declare employees: Employee[];
}