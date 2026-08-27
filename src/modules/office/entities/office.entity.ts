import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { Employee } from '../../employee/entities/employee.entity';
import { TurkishAirline } from '../../turkish_airlines/entities/turkish_airline.entity';
import { Receiving } from '../../receiving/entities/receiving.entity';
import { TotalCalculation } from '../../total_calculations/entities/total_calculation.entity';

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
    sourceKey: 'guid'
  })
  declare employees: Employee[];

  @HasMany(() => TurkishAirline, {
    foreignKey: 'office_guid',
    sourceKey: 'guid'
  })
  declare turkishAirline: TurkishAirline[];

  @HasMany(() => Receiving, {
    foreignKey: 'office_guid',
    sourceKey: 'guid'
  })
  declare receiving: Receiving[];

  @HasMany(() => TotalCalculation, {
    foreignKey: 'office_guid',
    sourceKey: 'guid'
  })
  declare totalCalculation: TotalCalculation[];
}


