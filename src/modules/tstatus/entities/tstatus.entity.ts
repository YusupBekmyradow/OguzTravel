import { Column, DataType, HasMany, Model, Table } from "sequelize-typescript";
import { B2b } from "../../b2b/entities/b2b.entity";
import { TurkishAirline } from "../../turkish_airlines/entities/turkish_airline.entity";

@Table({
  tableName: 'tbl_Tstatuses',
  timestamps: true
})
export class Tstatus extends Model<Tstatus> {

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

  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    allowNull: false,
    unique: true
  })
  declare index_number: number;

  @HasMany(() => B2b, {
    foreignKey: 'status_guid',
    sourceKey: 'guid',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL'
  })
  declare b2b: B2b[];

  @HasMany(() => TurkishAirline, {
    foreignKey: 'status_guid',
    sourceKey: 'guid',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL'
  })
  declare turkishAirline: TurkishAirline[];
}
