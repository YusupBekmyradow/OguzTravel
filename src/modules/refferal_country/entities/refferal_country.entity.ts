import { Column, DataType, HasMany, Model, Table } from "sequelize-typescript";
import { RefferalLetter } from "../../refferal_letter/entities/refferal_letter.entity";

@Table({
  tableName: 'tbl_refferal_countries',
  timestamps: true,
})
export class RefferalCountry extends Model<RefferalCountry> {
  @Column({
    primaryKey: true,
    allowNull: false,
    defaultValue: DataType.UUIDV4,
    type: DataType.UUID,
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
    unique: true,
  })
  declare index_number: number;

  @HasMany(() => RefferalLetter, {
    foreignKey: 'refferal_country_guid',
    sourceKey: 'guid',
    as: 'refferalLetters',
  })
  declare refferalLetters: RefferalLetter[];
}
