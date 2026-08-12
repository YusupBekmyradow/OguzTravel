import {
  Table,
  Column,
  Model,
  DataType,
  HasMany,
} from "sequelize-typescript";
import { Receiving } from "../../receiving/entities/receiving.entity";
import { CustomField } from "../../custom_field/entities/custom_field.entity";

@Table({
  tableName: "tbl_country",
  timestamps: true
})

export class Country extends Model<Country> {
  @Column({
    primaryKey: true,
    allowNull: false,
    defaultValue: DataType.UUIDV4,
    type: DataType.UUID,
  })
  declare guid: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  declare code: string;

  @Column({
    type: DataType.JSONB,
    allowNull: false,
    defaultValue: {},
  })
  declare name: {
    tk: string;
    ru: string;
    en: string
  };

  @HasMany(() => Receiving, {
    foreignKey: "country_guid",
    sourceKey: "guid"
  })
  declare receiving: Receiving[];

  @HasMany(() => CustomField, {
    foreignKey: "country_guid",
    sourceKey: "guid"
  })
  declare custom_fields: CustomField[];
}