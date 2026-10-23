import { Table, Model, Column, DataType, HasMany } from "sequelize-typescript"
import { B2b } from "../../b2b/entities/b2b.entity";
import { TurkishAirline } from "../../turkish_airlines/entities/turkish_airline.entity";
import { Visa } from "../../visa/entities/visa.entity";
import { RefferalLetter } from "../../refferal_letter/entities/refferal_letter.entity";

import { Receiving } from "../../receiving/entities/receiving.entity";


@Table({
  tableName: 'tbl_clients',
  timestamps: true
})

export class Client extends Model<Client> {

  @Column({
    primaryKey: true,
    allowNull: false,
    defaultValue: DataType.UUIDV4,
    type: DataType.UUID
  })
  declare guid: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare fullName: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  declare phone_number?: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: true
  })
  declare dateOfBirth?: Date;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  declare passport_number?: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: true
  })
  declare passportExpiryDate?: Date;

  @Column({
    type: DataType.DATEONLY,
    allowNull: true
  })
  declare passportIssueDate?: Date;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  declare passportCountryOfIssue?: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 1,
  })
  declare passport_count: number;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  declare gender?: string;

  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    allowNull: false,
    unique: true
  })
  declare index_number: number;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: []
  })
  declare passportHistory: any[];

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false
  })
  declare vip?: boolean;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: [],
  })
  declare images: string[];

  @HasMany(() => B2b, {
    foreignKey: 'client_guid',
    sourceKey: 'guid'
  })
  declare b2b: B2b[];


  @HasMany(() => TurkishAirline, {
    foreignKey: 'client_guid',
    sourceKey: 'guid'
  })
  declare turkishAirline: TurkishAirline[];

  @HasMany(() => Visa, {
    foreignKey: 'client_guid',
    sourceKey: 'guid'
  })
  declare visa: Visa[];

  @HasMany(() => RefferalLetter, {
    foreignKey: 'client_guid',
    sourceKey: 'guid'
  })
  declare refferalLetter: RefferalLetter[];











  @HasMany(() => Receiving, {
    foreignKey: 'client_guid',
    sourceKey: 'guid'
  })
  declare receiving: Receiving[];
}
