import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { Employee } from '../../employee/entities/employee.entity';

@Table({
  tableName: 'tbl_positions',
  timestamps: true
})

export class Position extends Model<Position> {

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
    foreignKey: 'position_guid',
    sourceKey: 'guid',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL'
  })
  declare employees: Employee[];
}

