import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { Employee } from '../../employee/entities/employee.entity';
import { TurkishAirline } from '../../turkish_airlines/entities/turkish_airline.entity';

@Table({
  tableName: 'tbl_offices',
  timestamps: true
})

export class Office extends Model<Office> {

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
  declare fullName: {
    tk: string;
    ru: string;
    en: string;
  };


  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  declare shortName?: {
    tk: string;
    ru: string;
    en: string;
  }

  @HasMany(() => Employee, {
    foreignKey: 'office_guid',
    sourceKey: 'guid',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL'
  })
  declare employees: Employee[];

  @HasMany(() => TurkishAirline, {
    foreignKey: 'office_guid',
    sourceKey: 'guid',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL'
  })
  declare turkishAirline: TurkishAirline[];
}


