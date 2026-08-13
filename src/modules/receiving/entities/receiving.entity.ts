import { BelongsTo, Column, DataType, ForeignKey, HasMany, Model, Table } from "sequelize-typescript";
import { Office } from "../../office/entities/office.entity";
import { Employee } from "../../employee/entities/employee.entity";
import { Client } from "../../client/entities/client.entity";
import { Country } from "../../country/entities/country.entity";

@Table({
  tableName: 'tbl_receivings',
  timestamps: true,
})

export class Receiving extends Model<Receiving> {
  @Column({
    primaryKey: true,
    allowNull: false,
    defaultValue: DataType.UUIDV4,
    type: DataType.UUID
  })
  declare guid: string;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  declare application_date?: Date;

  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  declare office_guid?: string;

  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  declare operator_guid?: string;

  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  declare client_guid?: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  declare visa_type?: string;

  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    allowNull: false,
    unique: true
  })
  declare index_number: number;

  @ForeignKey(() => Country)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare country_guid: string;

  @Column({
    type: DataType.JSONB,
    allowNull: false,
    defaultValue: {},
  })
  declare custom_field_values: Record<string, any>;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  declare note?: string;

  @BelongsTo(() => Country, {
    targetKey: 'guid',
    foreignKey: 'country_guid',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL',
  })
  declare country: Country;

  @BelongsTo(() => Office, {
    targetKey: 'guid',
    foreignKey: 'office_guid',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL'
  })
  declare office: Office;

  @BelongsTo(() => Employee, {
    targetKey: 'guid',
    foreignKey: 'operator_guid',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL'
  })
  declare operator_rec: Employee;

  @BelongsTo(() => Client, {
    targetKey: 'guid',
    foreignKey: 'client_guid',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL'
  })
  declare client: Client;
}
